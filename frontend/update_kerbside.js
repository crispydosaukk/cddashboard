import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
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
const auth = getAuth(app);

async function deactivateKerbside() {
  try {
    console.log("Authenticating...");
    await signInWithEmailAndPassword(auth, "watfordfoodculture@gmail.com", "CD@Watford");
    console.log("Authenticated successfully.");

    console.log("Fetching all restaurants...");
    const restRef = collection(db, "restaurant");
    const snapshot = await getDocs(restRef);

    console.log(`Found ${snapshot.size} restaurants.`);
    let updatedCount = 0;

    for (const restDoc of snapshot.docs) {
      const data = restDoc.data();
      const currentVal = data.kerbside;
      console.log(`Checking [${restDoc.id}] ${data.restaurant_name}: kerbside = ${currentVal}`);

      if (currentVal !== 0) {
        await updateDoc(doc(db, "restaurant", restDoc.id), {
          kerbside: 0
        });
        console.log(`  -> Deactivated kerbside for [${restDoc.id}] ${data.restaurant_name}`);
        updatedCount++;
      } else {
        console.log(`  -> Already deactivated (kerbside: 0)`);
      }
    }

    console.log(`\nDeactivation complete. Updated ${updatedCount} restaurants.`);

    // Verification step
    console.log("\nVerifying all restaurants...");
    const verifySnapshot = await getDocs(restRef);
    let allDeactivated = true;
    for (const d of verifySnapshot.docs) {
      const val = d.data().kerbside;
      if (val !== 0) {
        console.error(`Verification FAILED for ${d.id}: kerbside is still ${val}`);
        allDeactivated = false;
      }
    }

    if (allDeactivated) {
      console.log("SUCCESS: All 16 restaurant profiles have kerbside deactivated (kerbside: 0)!");
    }
  } catch (err) {
    console.error("Error during deactivation:", err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

deactivateKerbside();
