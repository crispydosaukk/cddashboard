import admin from "firebase-admin";

admin.initializeApp({
  projectId: "crispydosa-app"
});

const email = "rahulbadugu22@gmail.com";
const password = "password123";

async function createAdmin() {
  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: "Rahul (Admin)",
    });
    console.log("Successfully created new user:", userRecord.uid);
    
    // Create the Firestore document
    const db = admin.firestore();
    await db.collection("users").doc(userRecord.uid).set({
      email: email,
      name: "Rahul (Admin)",
      role_id: 1, // Super Admin
      status: 1
    });
    console.log("Created Firestore document for admin");
    process.exit(0);
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      console.log("User already exists, updating password...");
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(user.uid, { password: password });
      
      const db = admin.firestore();
      await db.collection("users").doc(user.uid).set({
        email: email,
        name: "Rahul (Admin)",
        role_id: 1, // Super Admin
        status: 1
      }, { merge: true });
      console.log("Updated existing user password and Firestore doc");
      process.exit(0);
    } else {
      console.error("Error creating new user:", error);
      process.exit(1);
    }
  }
}

createAdmin();
