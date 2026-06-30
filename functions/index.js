const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();
const db = admin.firestore();

// STRIPE PAYMENT INTENT - HTTP Cloud Function
// Replaces the old /api/stripe/create-payment-intent endpoint
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  try {
    const { amount, currency = "gbp", restaurant_id } = data;

    if (!amount || amount <= 0) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid amount");
    }

    // Fetch stripe keys for the restaurant
    let secret = null;
    let publishable = null;
    
    if (restaurant_id) {
       const restDoc = await db.collection("restaurant").doc(String(restaurant_id)).get();
       if (restDoc.exists) {
          const rd = restDoc.data();
          secret = rd.stripe_secret_key;
          publishable = rd.stripe_publishable_key;
       }
    }

    if (!secret) {
       secret = functions.config().stripe?.secret;
       publishable = functions.config().stripe?.publishable;
    }

    if (!secret) {
      throw new functions.https.HttpsError("failed-precondition", "Stripe is not configured");
    }

    const stripe = new Stripe(secret, { apiVersion: "2023-10-16" });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      automatic_payment_methods: { enabled: true },
    });

    return {
      status: 1,
      clientSecret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      publishableKey: publishable
    };
  } catch (error) {
    console.error("Stripe error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// ORDER CREATED TRIGGER - Handles Wallet & Loyalty logic
exports.onOrderCreated = functions.firestore.document("orders/{orderId}").onCreate(async (snap, context) => {
  const orderData = snap.data();
  const customerId = orderData.customer_id;
  if (!customerId) return null;

  const orderTotal = Number(orderData.grand_total || 0);
  const loyaltyUsed = Number(orderData.loyalty_used || 0);
  const walletUsed = Number(orderData.wallet_used || 0);

  const customerRef = db.collection("customers").doc(String(customerId));
  const settingsRef = db.collection("settings").doc("global");

  return db.runTransaction(async (transaction) => {
    const custDoc = await transaction.get(customerRef);
    const settingsDoc = await transaction.get(settingsRef);
    
    let loyaltyEarned = 0;
    if (settingsDoc.exists) {
       const ptsPerGbp = Number(settingsDoc.data().loyalty_points_per_gbp || 1);
       loyaltyEarned = Math.floor(orderTotal * ptsPerGbp);
    }

    if (custDoc.exists) {
      const c = custDoc.data();
      const currentWallet = Number(c.wallet_balance || 0);
      const currentLoyalty = Number(c.loyalty_points || 0);
      const totalOrders = Number(c.total_orders || 0) + 1;
      const liveOrders = Number(c.live_orders || 0) + 1;

      const newWallet = currentWallet - walletUsed;
      const newLoyalty = currentLoyalty - (loyaltyUsed > 0 ? (loyaltyUsed * 10) : 0) + loyaltyEarned; // assuming 10 points = 1£

      transaction.update(customerRef, {
        wallet_balance: newWallet >= 0 ? newWallet : 0,
        loyalty_points: newLoyalty >= 0 ? newLoyalty : 0,
        total_orders: totalOrders,
        live_orders: liveOrders,
        last_seen: admin.firestore.FieldValue.serverTimestamp()
      });

      // Optionally, record wallet transaction in `wallet_transactions`
      if (walletUsed > 0) {
         const wtRef = db.collection("wallet_transactions").doc();
         transaction.set(wtRef, {
           customer_id: customerId,
           amount: walletUsed,
           type: "debit",
           description: `Paid for order #${orderData.order_number}`,
           created_at: admin.firestore.FieldValue.serverTimestamp()
         });
      }
    }
  });
});

// ORDER UPDATED TRIGGER - Handles Order status changes
exports.onOrderStatusUpdated = functions.firestore.document("orders/{orderId}").onUpdate(async (change, context) => {
  const before = change.before.data();
  const after = change.after.data();
  
  const oldStatus = Number(before.order_status);
  const newStatus = Number(after.order_status);

  if (oldStatus === newStatus) return null;

  const customerId = after.customer_id;
  if (!customerId) return null;

  const customerRef = db.collection("customers").doc(String(customerId));
  
  return db.runTransaction(async (transaction) => {
    const custDoc = await transaction.get(customerRef);
    if (!custDoc.exists) return;
    
    const c = custDoc.data();
    let liveOrders = Number(c.live_orders || 0);
    let completedOrders = Number(c.completed_orders || 0);
    let walletBalance = Number(c.wallet_balance || 0);

    // If order is completed
    if (newStatus === 4 && oldStatus !== 4) {
      liveOrders = Math.max(0, liveOrders - 1);
      completedOrders += 1;
    }

    // If order is cancelled or rejected (5 or 2)
    if ((newStatus === 5 || newStatus === 2) && (oldStatus !== 5 && oldStatus !== 2)) {
      liveOrders = Math.max(0, liveOrders - 1);
      
      // Refund wallet and loyalty if they were used
      const walletUsed = Number(after.wallet_used || 0);
      if (walletUsed > 0) {
        walletBalance += walletUsed;
        const wtRef = db.collection("wallet_transactions").doc();
        transaction.set(wtRef, {
          customer_id: customerId,
          amount: walletUsed,
          type: "credit",
          description: `Refund for cancelled order #${after.order_number}`,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    await transaction.update(customerRef, {
      live_orders: liveOrders,
      completed_orders: completedOrders,
      wallet_balance: walletBalance
    });
  });

  // --- NOTIFICATION LOGIC (After transaction completes) ---
  const statusMap = {
    1: "Pending",
    2: "Rejected",
    3: "Accepted",
    4: "Completed",
    5: "Cancelled",
    6: "Ready"
  };

  const title = `Order ${statusMap[newStatus] || "Updated"}`;
  const body = `Your order #${after.order_number} has been marked as ${statusMap[newStatus] || "updated"}.`;

  // 1. Save to Database Notifications
  await db.collection("notifications").add({
    user_id: customerId,
    title: title,
    body: body,
    order_number: after.order_number,
    is_read: 0,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  });

  // 2. Send Push Notification
  const custDoc2 = await db.collection("customers").doc(String(customerId)).get();
  if (custDoc2.exists) {
    const fcmToken = custDoc2.data().fcm_token;
    if (fcmToken) {
      const payload = {
        notification: {
          title: title,
          body: body,
          sound: "default"
        },
        data: {
          order_id: change.after.id,
          order_number: after.order_number,
          status: String(newStatus)
        }
      };
      try {
        await admin.messaging().sendToDevice(fcmToken, payload);
        console.log(`Push notification sent to ${customerId} for order #${after.order_number}`);
      } catch (err) {
        console.error("Failed to send push notification:", err);
      }
    }
  }
});

// REFERRAL CODE GENERATOR - Auth Trigger
exports.onCustomerCreated = functions.auth.user().onCreate(async (user) => {
  const referralCode = "CD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  await db.collection("customers").doc(user.uid).set({
    email: user.email,
    mobile_number: user.phoneNumber || "",
    full_name: user.displayName || "",
    referral_code: referralCode,
    wallet_balance: 0,
    loyalty_points: 0,
    total_orders: 0,
    live_orders: 0,
    completed_orders: 0,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
});
