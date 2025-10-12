// ----------------------------
// 1. Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// ----------------------------
// 2. Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA3ChaO6pXKubN4WeVffJK5q0tPmpT1XEc",
  authDomain: "partybooking-ecdf1.firebaseapp.com",
  databaseURL: "https://partybooking-ecdf1-default-rtdb.firebaseio.com",
  projectId: "partybooking-ecdf1",
  storageBucket: "partybooking-ecdf1.appspot.com",
  messagingSenderId: "119112973933",
  appId: "1:119112973933:web:87037ff1b10958bb118964",
};

// ----------------------------
// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// ----------------------------
// 4. Admin Signup with default permission=false
export function adminSignup(fullName, email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      return updateProfile(user, { displayName: fullName }).then(() => {
        // Save under "admins" path with permission=false
        return set(ref(database, "admin/" + user.uid), {
          fullName,
          email,
          uid: user.uid,
          permission: false,             // default to false
          createdAt: new Date().toISOString(),
        }).then(() => {
          alert(
            "✅ Signup successful! Your admin account is pending approval. Please contact the admin for permission."
          );
          return user;
        });
      });
    });
}

// ----------------------------
// ----------------------------
// 5. Admin Signin with role & permission check
export async function adminSignin(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Check if this user exists under "admins/"
  const snapshot = await get(ref(database, "admin/" + user.uid));
  if (!snapshot.exists()) {
    await signOut(auth); // logout immediately
    throw new Error("This email is not registered as an admin.");
  }

  const adminData = snapshot.val();

  // Check if the admin has permission
  if (!adminData.permission) {
    await signOut(auth); // logout immediately
    throw new Error(
      "Your admin account is pending approval. Please contact the admin."
    );
  }

  return user; // valid admin with permission
}


// ----------------------------
// 6. Logout
export function adminSignout() {
  return signOut(auth);
}

// ----------------------------
// 7. Password Reset
export function adminResetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

// ----------------------------
// 8. Auth Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ Admin logged in:", user.displayName || user.email);
    // Optional: update dashboard greeting
    const adminNameEl = document.getElementById("currentAdminName");
    if (adminNameEl) {
      adminNameEl.textContent = `Hi, ${user.displayName || user.email.split("@")[0]}`;
    }
  } else {
    console.log("⚠️ No admin logged in.");
    const adminNameEl = document.getElementById("currentAdminName");
    if (adminNameEl) adminNameEl.textContent = "Not logged in";
  }
});

// ----------------------------
// Export auth and app for dashboard
export { app, auth };
