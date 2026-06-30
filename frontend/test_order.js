import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBMMCMYtmOrxuo58bPsy0ko5YYpjcgld2I",
  authDomain: "crispydosa-app.firebaseapp.com",
  projectId: "crispydosa-app",
  storageBucket: "crispydosa-app.firebasestorage.app",
  messagingSenderId: "860921857629",
  appId: "1:860921857629:web:ade79fc08cada31521afb4",
  measurementId: "G-B10R9R23Q0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function testOrder() {
  try {
    // 1. Log in as a customer (we will use watfordfoodculture as a test user since it has an auth record)
    await signInWithEmailAndPassword(auth, "watfordfoodculture@gmail.com", "CD@Watford");
    const uid = auth.currentUser.uid;
    console.log("Logged in with UID:", uid);

    // 2. Add to cart
    const cartRef = collection(db, "carts");
    const cartDoc = await addDoc(cartRef, {
      customer_id: uid,
      product_id: 1,
      product_name: "Test Dosa",
      product_price: 10,
      product_quantity: 1
    });
    console.log("✅ Successfully added to carts collection! Doc ID:", cartDoc.id);

    // 3. Create order
    const orderRef = collection(db, "orders");
    const orderDoc = await addDoc(orderRef, {
      customer_id: uid,
      total_amount: 10,
      status: "pending"
    });
    console.log("✅ Successfully created order! Doc ID:", orderDoc.id);

  } catch (err) {
    console.error("❌ Test failed:", err);
  } finally {
    process.exit(0);
  }
}

testOrder();
