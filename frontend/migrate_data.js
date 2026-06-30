import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, writeBatch, collection } from "firebase/firestore";
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
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch (e) {
    console.error(`Error fetching ${url}:`, e.message);
    return null;
  }
}

async function migrateData() {
  console.log("🚀 Starting Data Migration to Firebase...");

  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "watfordfoodculture@gmail.com", "CD@Watford");
  console.log("🔓 Authenticated as Admin!");

  // 1. Settings
  console.log("Fetching settings...");
  const settingsRes = await fetchJSON(`${BASE_URL}/app-settings`);
  if (settingsRes && settingsRes.status === 1) {
    await setDoc(doc(db, "settings", "global"), settingsRes.data);
    console.log("✅ Settings migrated.");
  }

  // 2. Restaurants
  console.log("Fetching restaurants...");
  const restsRes = await fetchJSON(`${BASE_URL}/restaurants`);
  if (!restsRes || restsRes.status !== 1) {
    console.error("Failed to fetch restaurants");
    process.exit(1);
  }

  const restaurants = restsRes.data;
  console.log(`Found ${restaurants.length} restaurants. Migrating...`);

  let totalCats = 0;
  let totalProds = 0;

  for (const r of restaurants) {
    const userId = String(r.userid); // The admin user ID that owns this restaurant
    
    // Save Restaurant
    await setDoc(doc(db, "restaurant", userId), {
      user_id: userId,
      restaurant_name: r.name,
      restaurant_address: r.address,
      restaurant_photo: r.photo,
      instore: r.instore ? 1 : 0,
      kerbside: r.kerbside ? 1 : 0,
      latitude: r.latitude || "",
      longitude: r.longitude || ""
    });
    console.log(`✅ Restaurant migrated: ${r.name}`);

    // Fetch Categories
    const catRes = await fetchJSON(`${BASE_URL}/categories?user_id=${userId}`);
    if (catRes && catRes.status === 1 && catRes.data.length > 0) {
      for (const cat of catRes.data) {
        const catId = String(cat.id);
        await setDoc(doc(db, "categories", catId), {
          id: catId,
          user_id: userId, // associate category with the restaurant owner
          name: cat.name,
          category_image: cat.image,
          sort_order: cat.sort_order || 0
        });
        totalCats++;

        // Fetch Products for this Category
        const prodRes = await fetchJSON(`${BASE_URL}/products?user_id=${userId}&cat_id=${catId}`);
        if (prodRes && prodRes.status === 1 && prodRes.data.length > 0) {
          const batch = writeBatch(db);
          for (const prod of prodRes.data) {
            const prodRef = doc(collection(db, "products")); // Use auto-id or string product id
            
            // Fix contains field parsing
            let containsArr = prod.contains;
            try {
              if (typeof containsArr === 'string') containsArr = JSON.parse(containsArr);
              if (typeof containsArr === 'string') containsArr = JSON.parse(containsArr);
            } catch (e) {}
            if (!Array.isArray(containsArr)) containsArr = [];

            batch.set(doc(db, "products", String(prod.id)), {
              id: String(prod.id),
              user_id: userId,
              cat_id: catId,
              product_name: prod.product_name || "Unknown Product",
              price: Number(prod.price || 0),
              description: prod.description || "",
              dietary: prod.dietary || "",
              image: prod.image || "",
              sort_order: prod.sort_order || 0,
              stock: prod.stock || 1,
              food_type: prod.food_type || 1, // 1 for Veg, 2 for Non-Veg
              spicy_level: prod.spicy_level || 1,
              contains: containsArr,
              created_at: new Date().toISOString(),
              is_active: prod.is_active !== undefined ? Number(prod.is_active) : 1
            });
            totalProds++;
          }
          await batch.commit();
        }
      }
    }
  }

  console.log(`\n🎉 Migration Complete!`);
  console.log(`✅ ${restaurants.length} Restaurants`);
  console.log(`✅ ${totalCats} Categories`);
  console.log(`✅ ${totalProds} Products`);
  process.exit(0);
}

migrateData();
