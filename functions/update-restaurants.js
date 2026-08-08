import admin from "firebase-admin";

admin.initializeApp({
  projectId: "crispydosa-app"
});

const db = admin.firestore();

async function listRestaurants() {
  try {
    const snapshot = await db.collection("restaurant").get();
    console.log(`Found ${snapshot.size} restaurants.`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}, Name: ${data.restaurant_name}`);
    });
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

listRestaurants();
