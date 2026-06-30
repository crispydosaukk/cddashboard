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
    await signInWithEmailAndPassword(auth, "watfordfoodculture@gmail.com", "CD@Watford");
    
    console.log("Checking for existing cart item with multiple where clauses...");
    const cartRef = collection(db, "carts");
    const q = query(
      cartRef,
      where('customer_id', '==', 'test_user'),
      where('product_id', '==', 'test_product'),
      where('textfield', '==', '')
    );
    const snapshot = await getDocs(q);
    console.log("Empty?", snapshot.empty);
  } catch (err) {
    console.error("FAILED:", err.message);
  } finally {
    process.exit(0);
  }
}
testCart();
