import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

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
const auth = getAuth(app);

const email = "watfordfoodculture@gmail.com";
const password = "CD@Watford";

async function forceCreateUser() {
  try {
    console.log(`Attempting to create Firebase Auth user for ${email}...`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("✅ Success! User was created in Firebase Auth:", userCredential.user.uid);
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.error(`❌ Error: User ${email} already exists in Firebase Auth!`);
      console.log(`\nSince they already exist, you MUST reset their password either by:\n1. Going to the Firebase Console website (console.firebase.google.com)\n2. Deleting them from the 'Authentication' tab, and then re-creating them in your dashboard.`);
    } else {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

forceCreateUser();
