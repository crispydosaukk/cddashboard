import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "crisppydosaclone",
  "appId": "1:493939013573:web:71b1ff3e4f22c80b6bbdac",
  "storageBucket": "crisppydosaclone.firebasestorage.app",
  "apiKey": "AIzaSyCNq8r4yt3w9mc8sv1SG-5REVTUV5EQguw",
  "authDomain": "crisppydosaclone.firebaseapp.com",
  "messagingSenderId": "493939013573",
  "measurementId": "G-2LNYHC8CKF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCollections() {
  const colls = ["restaurant", "categories", "products", "settings", "customers"];
  for (const c of colls) {
    try {
      const res = await getDocs(collection(db, c));
      console.log(`Collection '${c}' count:`, res.docs.length);
    } catch(e) {
      console.log(`Collection '${c}' error:`, e.code);
    }
  }
}
checkCollections().then(() => process.exit(0)).catch(console.error);
