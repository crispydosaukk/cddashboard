import admin from "firebase-admin";

admin.initializeApp({
  projectId: "crispydosa-app" // using default credentials
});

async function syncPasswords() {
  const db = admin.firestore();
  try {
    const snapshot = await db.collection("users").get();
    let updatedCount = 0;
    
    for (const doc of snapshot.docs) {
      const userData = doc.data();
      const plainPassword = userData.password;
      
      // If the password exists and is NOT a bcrypt hash (doesn't start with $2b$)
      if (plainPassword && !plainPassword.startsWith("$2b$")) {
        try {
          // Attempt to update the user in Firebase Auth using the Firestore document ID (which should be the Auth UID)
          // Alternatively, we look them up by email to be safe.
          const userRecord = await admin.auth().getUserByEmail(userData.email);
          await admin.auth().updateUser(userRecord.uid, {
            password: plainPassword
          });
          console.log(`✅ Successfully updated Firebase Auth password for: ${userData.email}`);
          updatedCount++;
        } catch (authErr) {
          console.error(`❌ Failed to update Auth for ${userData.email}:`, authErr.message);
        }
      }
    }
    
    console.log(`\n🎉 Finished! Synced ${updatedCount} passwords from Firestore to Firebase Auth.`);
    process.exit(0);
  } catch (error) {
    console.error("Error fetching users from Firestore:", error);
    process.exit(1);
  }
}

syncPasswords();
