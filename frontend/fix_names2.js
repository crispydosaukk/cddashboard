import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, writeBatch } from "firebase/firestore";
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
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

const BASE_URL = "https://api.crispydosa.info/mobile";

async function fetchJSON(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    return await res.json();
  } catch (e) {
    console.log(`Failed to fetch ${url}: ${e.message}`);
    return null;
  }
}

async function fixNames() {
  console.log("Fixing names...");
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "watfordfoodculture@gmail.com", "CD@Watford");
  console.log("Logged in");

  const restsRes = await fetchJSON(`${BASE_URL}/restaurants`);
  if (!restsRes) return;
  
  const restaurants = restsRes.data;
  let fixed = 0;

  for (const r of restaurants) {
    const userId = String(r.userid);
    console.log(`Processing restaurant ${userId}...`);
    
    const catRes = await fetchJSON(`${BASE_URL}/categories?user_id=${userId}`);
    if (catRes && catRes.status === 1 && catRes.data.length > 0) {
      for (const cat of catRes.data) {
        const catId = String(cat.id);
        const prodRes = await fetchJSON(`${BASE_URL}/products?user_id=${userId}&cat_id=${catId}`);
        if (prodRes && prodRes.status === 1 && prodRes.data.length > 0) {
          const batch = writeBatch(db);
          for (const prod of prodRes.data) {
            batch.update(doc(db, "products", String(prod.id)), {
              product_name: prod.name,
              name: prod.name
            });
            fixed++;
          }
          await batch.commit();
        }
      }
    }
  }
  
  console.log(`Fixed ${fixed} products!`);
  process.exit(0);
}

fixNames();
