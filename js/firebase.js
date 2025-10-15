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
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// ----------------------------
// 2. Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyA3ChaO6pXKubN4WeVffJK5q0tPmpT1XEc",
    authDomain: "partybooking-ecdf1.firebaseapp.com",
    databaseURL: "https://partybooking-ecdf1-default-rtdb.firebaseio.com",
    projectId: "partybooking-ecdf1",
    storageBucket: "partybooking-ecdf1.appspot.com",
    messagingSenderId: "119112973933",
    appId: "1:119112973933:web:87037ff1b10958bb118964"
};

// ----------------------------
// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// ----------------------------
// 4. Signup
function signup(fullName, email, password) {
    return createUserWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
            const user = userCredential.user;
            return updateProfile(user, { displayName: fullName })
                .then(() => {
                    set(ref(database, 'users/' + user.uid), {
                        fullName: fullName,
                        email: email,
                        createdAt: new Date().toISOString()
                    });
                    return user;
                });
        });
}

// ----------------------------
// 5. Signin
function signin(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

// ----------------------------
// 6. Signout
function signout() {
    return signOut(auth);
}

// ----------------------------
// 7. Reset password
function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
}

// ----------------------------
// 8. Auth state observer & dynamic dropdown
onAuthStateChanged(auth, user => {
    const mobileContainer = document.getElementById('user-mobile');
    const desktopContainer = document.getElementById('user-desktop');

    // Function: show login buttons
    const showLoginButtons = () => {
        if (mobileContainer) {
            mobileContainer.innerHTML = `<a href="login.html" class="btn custom-btn">Login</a>`;
            mobileContainer.style.display = 'block';
        }
        if (desktopContainer) {
            desktopContainer.innerHTML = `<a href="login.html" class="btn custom-btn">Login</a>`;
            desktopContainer.style.display = 'block';
        }
    };

    // Function: show user dropdown
    const showUserDropdown = (name) => {
        const dropdownHTML = `
            <div class="dropdown">
                <button class="btn custom-btn dropdown-toggle" type="button" id="userDropdown"
                    data-bs-toggle="dropdown" aria-expanded="false">
                    Hi, ${name}
                </button>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                    <li><a class="dropdown-item" href="Mybooking.html">My Bookings</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" id="logoutBtn">Logout</a></li>
                </ul>
            </div>
        `;

        if (mobileContainer) {
            mobileContainer.innerHTML = dropdownHTML;
            mobileContainer.style.display = 'block';
        }
        if (desktopContainer) {
            desktopContainer.innerHTML = dropdownHTML;
            desktopContainer.style.display = 'block';
        }

        // Initialize Bootstrap dropdown
        const dropdownEl = document.getElementById('userDropdown');
        if (dropdownEl) new bootstrap.Dropdown(dropdownEl);

        // Logout functionality
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', e => {
                e.preventDefault();
                signout().then(() => {
                    showLoginButtons(); // revert to login button
                }).catch(err => console.error("Logout error:", err));
            });
        }
    };

    // Check user state
    if (user) {
        const name = user.displayName || user.email.split('@')[0];
        showUserDropdown(name);
    } else {
        showLoginButtons();
    }
});


// ----------------------------
// 9. Expose functions
window.signup = signup;
window.signin = signin;
window.signout = signout;
window.resetPassword = resetPassword;
