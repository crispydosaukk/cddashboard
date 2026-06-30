import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";
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

async function cleanup() {
  console.log("Starting cleanup of categories collection...");
  try {
    await signInWithEmailAndPassword(auth, "rahulbadugu22@gmail.com", "7981255989");
    console.log("Logged in successfully. Querying categories...");
    const snap = await getDocs(collection(db, "categories"));
    let count = 0;
    
    // We can't use a single batch if there are >500 items, so we process them individually or in chunks
    for (const d of snap.docs) {
      const data = d.data();
      // If the document has a 'price', 'product_name', or 'cat_id', it's definitely a product!
      if (data.price !== undefined || data.product_name !== undefined || data.cat_id !== undefined || data.contains !== undefined) {
        console.log(`Deleting invalid category (it's a product): ID ${d.id}`);
        await deleteDoc(doc(db, "categories", d.id));
        count++;
      }
    }
    
    console.log(`Cleanup finished! Deleted ${count} products from the categories collection.`);
    process.exit(0);
  } catch (err) {
    console.error("Cleanup error:", err);
    process.exit(1);
  }
}

cleanup();
