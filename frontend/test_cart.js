import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, addDoc } from "firebase/firestore";

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

async function testCart() {
  try {
    console.log("Checking for existing cart item...");
    const cartRef = collection(db, "carts");
    const q = query(
      cartRef,
      where('customer_id', '==', 'test_user'),
      where('product_id', '==', 'test_product'),
      where('textfield', '==', '')
    );
    const snapshot = await getDocs(q);
    console.log("Empty?", snapshot.empty);
    
    console.log("Adding new cart item...");
    await addDoc(cartRef, {
      customer_id: 'test_user',
      product_id: 'test_product',
      textfield: '',
      product_quantity: 1
    });
    console.log("Success!");
  } catch (err) {
    console.error("FAILED:", err.message);
  } finally {
    process.exit(0);
  }
}
testCart();
