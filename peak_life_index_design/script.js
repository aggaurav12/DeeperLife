// Import Firebase SDK
import { ENV } from "./public/config.js"; 
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: ENV.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  storageBucket: ENV.FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
const provider = new GoogleAuthProvider();

// Auto-login using Popup Authentication
signInWithPopup(auth, provider)
  .then((result) => {
    console.log("Connected to Firebase as:", result.user.email);
    loadBlogs();
    loadQueries();
    loadWorkshops();
  })
  .catch((error) => {
    console.error("Firebase Authentication Error:", error.message);
  });

document.addEventListener("DOMContentLoaded", function () {
  const adminPassword = "admin123";

  // Admin Login Functionality
  document.getElementById("admin-login-btn")?.addEventListener("click", adminLogin);

  function adminLogin() {
    const enteredPassword = document.getElementById("admin-password").value;
    if (enteredPassword === adminPassword) {
      document.getElementById("admin-login").style.display = "none";
      document.getElementById("admin-panel").style.display = "block";
      alert("Welcome, Admin!");
      loadWorkshops();
      loadQueries();
      loadBlogs();
    } else {
      alert("Incorrect password! Please try again.");
    }
  }

  // Query Management
  function loadQueries() {
    const queryList = document.getElementById("query-list");
    if (!queryList) return;
    onSnapshot(collection(db, "queries"), (querySnapshot) => {
      queryList.innerHTML = "";
      querySnapshot.forEach((docSnap) => {
        const query = docSnap.data();
        queryList.innerHTML += `<div>
          <p><strong>Name:</strong> ${query.name}</p>
          <p><strong>School:</strong> ${query.school}</p>
          <p><strong>Email:</strong> ${query.email}</p>
          <p><strong>Message:</strong> ${query.message}</p>
          <button onclick="deleteQuery('${docSnap.id}')">Delete</button>
        </div><hr>`;
      });
    });
  }

  async function addQuery(event) {
    event.preventDefault();
    const name = document.getElementById("visitor-name").value;
    const school = document.getElementById("visitor-school").value;
    const email = document.getElementById("visitor-email").value;
    const message = document.getElementById("visitor-message").value;

    await addDoc(collection(db, "queries"), { name, school, email, message });
    alert("Your query has been submitted successfully!");
    document.getElementById("home-inquiry-form")?.reset();
  }

  async function deleteQuery(id) {
    await deleteDoc(doc(db, "queries", id));
    alert("Query deleted successfully!");
  }

  // Workshop Management
  function loadWorkshops() {
    const workshopSchedule = document.getElementById("workshopSchedule");
    if (!workshopSchedule) return console.warn("Workshop container not found!");
  
    onSnapshot(collection(db, "workshops"), (querySnapshot) => {
      workshopSchedule.innerHTML = "";
      querySnapshot.forEach((docSnap) => {
        const workshop = docSnap.data();
        workshopSchedule.innerHTML += `<tr>
          <td>${workshop.date}</td>
          <td>${workshop.title}</td>
          <td>${workshop.details}</td>
        </tr>`;
      });
    });
  }
  

  async function addWorkshop() {
    const title = document.getElementById("workshop-title").value;
    const details = document.getElementById("workshop-details").value;
    const date = document.getElementById("workshop-date").value;

    await addDoc(collection(db, "workshops"), { title, details, date });
    alert("Workshop scheduled successfully!");
  }

  async function deleteWorkshop(id) {
    await deleteDoc(doc(db, "workshops", id));
    alert("Workshop deleted successfully!");
  }

  // Blog Management
  function loadBlogs() {
    const blogPostsContainer = document.getElementById("blogPosts");
    const blogListContainer = document.getElementById("blog-list");

    if (!blogPostsContainer && !blogListContainer) {
      console.warn("Blog containers not found in DOM.");
      return;
    }

    onSnapshot(collection(db, "blogs"), (querySnapshot) => {
      if (blogPostsContainer) blogPostsContainer.innerHTML = "";
      if (blogListContainer) blogListContainer.innerHTML = "";

      querySnapshot.forEach((docSnap) => {
        const blog = docSnap.data();
        const blogElement = `<div>
          <img src="${blog.image}" alt="${blog.title}">
          <h3>${blog.title}</h3>
          <p>${blog.content}</p>
        </div>`;

        if (blogPostsContainer) blogPostsContainer.innerHTML += blogElement;
        if (blogListContainer) blogListContainer.innerHTML += `<div>${blogElement}<button onclick="deleteBlog('${docSnap.id}')">Delete</button></div>`;
      });
    });
  }

  async function addBlog() {
    const title = document.getElementById("blog-title").value;
    const content = document.getElementById("blog-content").value;
    const imageInput = document.getElementById("blog-image");

    let image = "";
    if (imageInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = async function (e) {
        image = e.target.result;
        await addDoc(collection(db, "blogs"), { title, content, image, timestamp: new Date() });
        loadBlogs();
      };
      reader.readAsDataURL(imageInput.files[0]);
    } else {
      await addDoc(collection(db, "blogs"), { title, content, image, timestamp: new Date() });
      loadBlogs();
    }
  }

  async function deleteBlog(id) {
    await deleteDoc(doc(db, "blogs", id));
    alert("Blog deleted successfully!");
    loadBlogs();
  }

  // Load all sections on page load
  loadBlogs();
  loadQueries();
  loadWorkshops();

  // Expose functions globally
  window.adminLogin = adminLogin;
  window.addQuery = addQuery;
  window.deleteQuery = deleteQuery;
  window.addWorkshop = addWorkshop;
  window.deleteWorkshop = deleteWorkshop;
  window.addBlog = addBlog;
  window.deleteBlog = deleteBlog;
});
