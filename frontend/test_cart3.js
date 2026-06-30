import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, addDoc } from "firebase/firestore";
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

async function testCart() {
  try {
    const cred = await signInWithEmailAndPassword(auth, "watfordfoodculture@gmail.com", "CD@Watford");
    const uid = cred.user.uid;
    console.log("Logged in with UID:", uid);

    const cartRef = collection(db, "carts");
    
    // Simulate addToCart
    console.log("Adding item to cart...");
    const cartData = {
      customer_id: uid,
      user_id: 11, // dummy restaurant
      product_id: "test_1",
      product_name: "Test Dosa",
      product_price: 12.99,
      product_tax: 0,
      product_quantity: 1,
      textfield: "Spicy please"
    };

    // Check if exists
    const q = query(
      cartRef,
      where('customer_id', '==', cartData.customer_id),
      where('product_id', '==', cartData.product_id),
      where('textfield', '==', cartData.textfield)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("Item not in cart, adding new...");
      await addDoc(cartRef, {
        ...cartData,
        created_at: new Date()
      });
      console.log("SUCCESS!");
    } else {
      console.log("Item exists, updating quantity...");
    }

    // Simulate getCart
    console.log("Simulating getCart...");
    const q2 = query(cartRef, where('customer_id', '==', String(uid)));
    const getCartSnap = await getDocs(q2);
    console.log(`Found ${getCartSnap.size} items in cart`);

  } catch (err) {
    console.error("FAILED:", err.message);
  } finally {
    process.exit(0);
  }
}
testCart();
