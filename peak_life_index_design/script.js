// Import Firebase SDK 
//import ENV from "./config.js"; 
import ENV from "./firebase-config.js"; // Import secure Firebase config
//const ENV = window.ENV;  

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  getDoc, // ✅ Add getDoc to import list
  limit // ✅ Import limit to use in Firestore queries
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Export Firestore methods for use in other scripts
export { db, addDoc, collection , getDoc, doc};

// Firebase configuration
const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  projectId: ENV.FIREBASE_PROJECT_ID,
  storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.FIREBASE_APP_ID,
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
    loadMusic();
  })
  .catch((error) => {
    console.error("Firebase Authentication Error:", error.message);
  });

  // 🔒 Secure Admin Page Access with a Secret Key
document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ DOM fully loaded. Initializing Firebase...");

  // Admin Login Functionality
   document.getElementById("admin-login-btn")?.addEventListener("click", adminLogin);
   const adminPassword = "admin123";
   const urlParams = new URLSearchParams(window.location.search);

  function adminLogin() {
    const enteredPassword = document.getElementById("admin-password").value;
    if (enteredPassword === adminPassword) {
      console.log("✅ Admin Access Granted");
      sessionStorage.setItem("isAdmin", "true"); // ✅ Store admin session
    document.getElementById("admin-login").style.display = "none";
    document.getElementById("admin-panel").style.display = "block";
    alert("Welcome, Admin!");
    loadQueries();
    loadBlogs();
    loadWorkshops();
    loadMusic();
    loadWorkshopRegistrations();
    } else {
      alert("Incorrect password! Please try again.");
      window.location.href = "index.html"; // 🔄 Redirect to home
  return;
    }
  }

  // Query Management
  function loadQueries() {
    const queryList = document.getElementById("query-list");
    if (!queryList) return;
  
    console.log("✅ Loading queries...");
  
    // Fetch queries in descending order based on timestamp
    const queriesQuery = query(collection(db, "queries"), orderBy("timestamp", "desc"));
  
    onSnapshot(queriesQuery, (querySnapshot) => {
      queryList.innerHTML = ""; // Clear the existing list
      querySnapshot.forEach((docSnap) => {
        const query = docSnap.data();
        const formattedTime = query.timestamp
          ? new Date(query.timestamp.toMillis()).toLocaleString() // Convert Firestore timestamp to readable format
          : "Unknown";
  
        queryList.innerHTML += `
          <div>
            <p><strong>Name:</strong> ${query.name}</p>
            <p><strong>Contact:</strong> ${query.contact}</p>
            <p><strong>Email:</strong> ${query.email}</p>
            <p><strong>Message:</strong> ${query.message}</p>
            <p><strong>Submitted At:</strong> ${formattedTime}</p>
            <button onclick="deleteQuery('${docSnap.id}')">Delete</button>
          </div>
          <hr>`;
      });
    }, (error) => {
      console.error("❌ Error loading queries:", error);
    });
  }
  

  // async function addQuery(event) {
  //   event.preventDefault();
  //   const name = document.getElementById("visitor-name").value;
  //   const school = document.getElementById("visitor-school").value;
  //   const email = document.getElementById("visitor-email").value;
  //   const message = document.getElementById("visitor-message").value;

  //   await addDoc(collection(db, "queries"), { name, school, email, message });
  //   alert("Your query has been submitted successfully!");
  //   document.getElementById("home-inquiry-form")?.reset();
  // }

  async function addQuery(event) {
    event.preventDefault();
  
    console.log("🚀 addQuery() function triggered!");
  
    // Get form elements
    const name = document.getElementById("visitor-name").value;
    const email = document.getElementById("visitor-email").value;
    const contact = document.getElementById("visitor-contact").value;
    const message = document.getElementById("visitor-message").value;
  
    // ✅ Validate inputs
    if (!name || !email || !contact || !message) {
      alert("⚠️ Please fill all required fields!");
      return;
    }
  
    try {
      console.log("📡 Saving query to Firestore...");
      await addDoc(collection(db, "queries"), { 
        name, 
        email, 
        contact, 
        message, 
        timestamp: new Date() 
      });
  
      alert("✅ Your inquiry has been submitted successfully!");
      event.target.reset();
    } catch (error) {
      console.error("❌ Error submitting inquiry:", error);
    }
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Document Loaded - Attaching event listener...");

    const inquiryForm = document.getElementById("home-inquiry-form");
    const consultingForm = document.getElementById("consulting-form");

    if (inquiryForm) {
        console.log("✅ Found home-inquiry-form in DOM.");
        inquiryForm.addEventListener("submit", addQuery);
    } else {
        console.warn("⚠️ home-inquiry-form not found in DOM.");
    }

    if (consultingForm) {
        console.log("✅ Found consulting-form in DOM.");
        consultingForm.addEventListener("submit", addQuery);
    } else {
        console.warn("⚠️ consulting-form not found in DOM.");
    }
});

  

  async function deleteQuery(id) {
    await deleteDoc(doc(db, "queries", id));
    alert("Query deleted successfully!");
  }

  // Workshop Management
  function loadWorkshops() {
    const workshopSchedule = document.getElementById("workshopSchedule"); // For public workshop.html or index.html
    const workshopList = document.getElementById("workshop-list"); // For admin.html

    if (!workshopSchedule && !workshopList) {
        console.warn("⚠️ Neither workshopSchedule nor workshopList found in DOM.");
        return;
    }

    console.log("✅ Workshop containers found! Determining query...");

    // Detect if it's index.html
    const isIndexPage = window.location.pathname.includes("index.html");

    // Use a Firestore query with a limit for the index.html page
    const workshopQuery = isIndexPage
        ? query(collection(db, "workshops"), orderBy("date", "asc"), limit(4)) // Limit to first 4 workshops
        : query(collection(db, "workshops"), orderBy("date", "asc")); // Load all workshops for other pages

    console.log(isIndexPage ? "🔢 Limiting workshops to 4 for index.html" : "📄 Loading all workshops...");

    onSnapshot(workshopQuery, (querySnapshot) => {
        if (workshopSchedule) workshopSchedule.innerHTML = "";
        if (workshopList) workshopList.innerHTML = "";

      querySnapshot.forEach((docSnap) => {
          const workshop = docSnap.data();
          const workshopId = docSnap.id;

            // ✅ Only print the image tag if an image exists
            const imageTag = workshop.image
                ? `<div class="workshop-image-container">
                    <img src="${workshop.image}" alt="Workshop Image" class="workshop-image">
                 </div>`
              : "";

            // Public Workshop Card
            const publicWorkshopCard = `
                <div class="event-card">
                    ${imageTag} <!-- ✅ Image wrapped in div to maintain layout -->
                    <div class="event-card-content">
                        <h3>${workshop.title || "Untitled Workshop"}</h3>
                        <p>${workshop.details.substring(0, 100) || "No details available"}...</p>
                        <p><strong>Date:</strong> ${workshop.date || "N/A"}</p>
                    </div>
                    <div class="event-card-footer">
                        <a href="workshop-details.html?id=${workshopId}" target="_blank" class="btn-know-more">Know More</a>
                        <button onclick="registerForWorkshop('${workshopId}')" class="btn-register">Register</button>
                    </div>
                </div>
            `;

            // Admin Workshop Card
            const adminWorkshopCard = `
                <div class="admin-workshop-card">
                    ${imageTag}
                    <p><strong>Date:</strong> ${workshop.date || "N/A"}</p>
                    <p><strong>Title:</strong> ${workshop.title || "Untitled"}</p>
                    <p><strong>Details:</strong> ${workshop.details || "No details available"}</p>
                    <button onclick="deleteWorkshop('${workshopId}')">Delete</button>
                    <hr>
                </div>
            `;

            // Append Cards to Corresponding Sections
            if (workshopSchedule) workshopSchedule.innerHTML += publicWorkshopCard;
            if (workshopList) workshopList.innerHTML += adminWorkshopCard;
        });
    }, (error) => {
        console.error("❌ Error fetching workshops:", error);
    });
}

function loadWorkshopDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const workshopId = urlParams.get("id");

  if (workshopId) {
    const workshopContent = document.getElementById("workshop-content");

    getDoc(doc(db, "workshops", workshopId))
      .then((docSnap) => {
        if (docSnap.exists()) {
          const workshop = docSnap.data();
          workshopContent.innerHTML = `
            <img src="${workshop.image || 'images/placeholder.png'}" alt="${workshop.title}">
            <h1>${workshop.title || "Untitled Workshop"}</h1>
            <p>${workshop.details || "No details available."}</p>
            <p><strong>Date:</strong> ${workshop.date || "N/A"}</p>
            <button onclick="registerForWorkshop('${workshopId}')" class="btn-register">Register</button>
          `;
        } else {
          workshopContent.innerHTML = "<p>⚠️ Workshop not found.</p>";
        }
      })
      .catch((error) => {
        console.error("❌ Error fetching workshop details:", error);
        workshopContent.innerHTML = "<p>⚠️ Unable to load workshop details.</p>";
      });
  } else {
    document.getElementById("workshop-content").innerHTML = "<p>⚠️ Invalid workshop ID.</p>";
  }
}

// Call the function only on `workshop-details.html`
if (window.location.pathname.includes("workshop-details.html")) {
  loadWorkshopDetails();
}
window.registerForWorkshop = function(workshopId) {
  if (!workshopId) {
    alert("⚠️ Invalid workshop ID.");
    return;
  }

  // Open the registration page in a new window
  const registrationUrl = `workshop-register.html?id=${workshopId}`;
  window.open(registrationUrl, "_blank", "width=600,height=700");
};

// Load Workshop Registrations for Admin
function loadWorkshopRegistrations() {
  const registrationList = document.getElementById("registration-list");
  if (!registrationList) {
    console.warn("⚠️ Registration list container not found in DOM.");
    return;
  }

  console.log("✅ Loading workshop registrations...");

  // Fetch registrations in descending order based on timestamp
  const registrationsQuery = query(collection(db, "registrations"), orderBy("timestamp", "desc"));

  onSnapshot(registrationsQuery, (querySnapshot) => {
    registrationList.innerHTML = ""; // Clear the existing list

    querySnapshot.forEach((docSnap) => {
      const registration = docSnap.data();
      const formattedTime = registration.timestamp
        ? new Date(registration.timestamp.toMillis()).toLocaleString() // Convert Firestore timestamp to readable format
        : "Unknown";

      registrationList.innerHTML += `
        <div class="registration-card">
          <h3>${registration.workshopTitle || "Unknown Workshop"}</h3>
          <p><strong>Name:</strong> ${registration.userName}</p>
           <p><strong>City:</strong> ${registration.userCity}</p>
            <p><strong>State:</strong> ${registration.userState}</p>
             <p><strong>Country:</strong> ${registration.userCounty}</p>
          <p><strong>Email:</strong> ${registration.emailId}</p>
          <p><strong>Contact:</strong> ${registration.contactNumber}</p>
          <p><strong>Special Request:</strong> ${registration.specialRequest || "None"}</p>
          <p><strong>Submitted At:</strong> ${formattedTime}</p>
          <button onclick="deleteRegistration('${docSnap.id}')">🗑️ Delete</button>
        </div>
        <hr>`;
    });
  }, (error) => {
    console.error("❌ Error loading workshop registrations:", error);
  });
}


// Delete Registration
window.deleteRegistration = async function (registrationId) {
  if (!confirm("Are you sure you want to delete this registration?")) return;

  try {
      await deleteDoc(doc(db, "registrations", registrationId));
      alert("✅ Registration deleted successfully!");
  } catch (error) {
      console.error("❌ Error deleting registration:", error);
      alert("❌ Failed to delete registration. Please try again.");
  }
};


  
async function addWorkshop() {
  const title = document.getElementById("workshop-title").value.trim();
  const details = document.getElementById("workshop-details").value.trim();
  const date = document.getElementById("workshop-date").value.trim();
  const imageInput = document.getElementById("workshop-image");

  if (!title || !details || !date) {
    alert("⚠️ Please fill out all required fields!");
    return;
  }

  let image = "";
  if (imageInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      image = e.target.result;
      try {
        await addDoc(collection(db, "workshops"), { title, details, date, image });
        loadWorkshops();
        showNotification("✅ Workshop successfully scheduled!", "success");
      } catch (error) {
        console.error("❌ Error adding workshop:", error);
        showNotification("❌ Failed to add workshop. Try again.", "error");
      }
    };
    reader.readAsDataURL(imageInput.files[0]);
  } else {
    try {
      await addDoc(collection(db, "workshops"), { title, details, date, image });
      loadWorkshops();
      showNotification("✅ Workshop successfully scheduled!", "success");
    } catch (error) {
      console.error("❌ Error adding workshop:", error);
      showNotification("❌ Failed to add workshop. Try again.", "error");
    }
  }
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerText = message;
  
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000); // Notification disappears after 3 seconds
}

  async function deleteWorkshop(id) {
    await deleteDoc(doc(db, "workshops", id));
    alert("Workshop deleted successfully!");
    loadWorkshops();
  }

  // Blog Management
  function loadBlogs() {
    const blogSection = document.getElementById("blog-section");
    const blogList = document.getElementById("blog-list");

    if (!blogSection && !blogList) {
        console.warn("⚠️ No valid blog container found in DOM.");
        return;
    }

    console.log("✅ Loading blogs...");

    const isAdminPage = window.location.pathname.includes("admin.html"); // ✅ Detect if it's admin page
    const isIndexPage = window.location.pathname.includes("index.html"); // ✅ Detect if it's index.html
    const isAdminUser = sessionStorage.getItem("isAdmin") === "true";

    // Fetch all blogs ordered by timestamp
    const blogsQuery = query(collection(db, "blogs"), orderBy("timestamp", "desc"));

    // Fetch blogs based on the query
    onSnapshot(blogsQuery, (querySnapshot) => {
        const blogs = [];
        querySnapshot.forEach((docSnap) => {
            blogs.push({ id: docSnap.id, ...docSnap.data() });
        });

        // If on index.html, limit to the latest 5 blogs
        const blogsToDisplay = isIndexPage ? blogs.slice(0, 5) : blogs;

        // Clear the containers
        if (blogSection) blogSection.innerHTML = "";
        if (blogList) blogList.innerHTML = "";

        let totalBlogs = blogs.length; // ✅ Get total number of blogs
        blogsToDisplay.forEach((blog, index) => {
            console.log(`📝 Blog Loaded:`, blog);

            // ✅ Only show delete button if on admin page and user is admin
            const deleteButton = (isAdminPage && isAdminUser)
                ? `<button class="delete-btn" onclick="deleteBlog('${blog.id}')">🗑️ Delete</button>`
                : "";

            const blogCard = `
                <div class="blog-card">
                    <img src="${blog.image || 'images/placeholder.png'}" alt="${blog.title || 'Missing'}" class="blog-image">
                    <div class="blog-card-content">
                        <h3 class="blog-card-title">#${totalBlogs - index}: ${blog.title || 'Untitled Blog'}</h3>
                        <p class="blog-card-body">${(blog.content || '').substring(0, 150)}...</p>
                        <div class="blog-card-footer">
                            <a href="blog-details.html?id=${blog.id}" class="blog-read-more" target="_blank">Read More</a>
                            ${deleteButton} <!-- ✅ Only for admin page -->
                        </div>
                    </div>
                </div>
            `;

            // Append blog cards
            if (blogSection) blogSection.innerHTML += blogCard;
            if (blogList) blogList.innerHTML += blogCard;
        });
    }, (error) => {
        console.error("❌ Error fetching blogs:", error);
    });
}




  


async function addBlog() {
  const title = document.getElementById("blog-title").value;
  const content = document.getElementById("blog-content").value;
  const imageInput = document.getElementById("blog-image");

  if (!title || !content) {
      alert("⚠️ Please fill out all required fields!");
      return;
  }

  let image = "";
  if (imageInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = async function (e) {
          image = e.target.result;
          try {
              await addDoc(collection(db, "blogs"), { title, content, image, timestamp: new Date() });
              loadBlogs(); // Refresh blogs
              showNotification("✅ Blog added successfully!"); // ✅ Trigger pop-up notification
          } catch (error) {
              console.error("❌ Error adding blog:", error);
              alert("❌ Failed to add blog. Try again.");
          }
      };
      reader.readAsDataURL(imageInput.files[0]);
  } else {
      try {
          await addDoc(collection(db, "blogs"), { title, content, image, timestamp: new Date() });
          loadBlogs();
          showNotification("✅ Blog added successfully!"); // ✅ Trigger pop-up notification
      } catch (error) {
          console.error("❌ Error adding blog:", error);
          alert("❌ Failed to add blog. Try again.");
      }
  }
}

// ✅ Notification function (Reusable for all alerts)
function showNotification(message) {
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.innerText = message;
  document.body.appendChild(notification);

  // Auto-hide notification after 3 seconds
  setTimeout(() => {
      notification.remove();
  }, 3000);
}


window.deleteBlog = async function (id) {
  try {
      await deleteDoc(doc(db, "blogs", id));
      alert("✅ Blog deleted successfully!");
      loadBlogs(); // Reload the blogs to reflect deletion
  } catch (error) {
      console.error("❌ Error deleting blog:", error);
  }
};

  // Load Music Function
 function loadMusic() {
    const musicContainer = document.getElementById("music-section");
    if (!musicContainer) {
        console.warn("⚠️ Music section not found in DOM.");
        return;
    }

    console.log("✅ Loading music videos...");

    // ✅ Apply limit of 5 ONLY on index.html
    const isHomePage = window.location.pathname.includes("index.html");
    const musicQuery = isHomePage
        ? query(collection(db, "music"), orderBy("timestamp", "desc"), limit(5)) // ✅ Limit to 5
        : query(collection(db, "music"), orderBy("timestamp", "desc")); // No limit on other pages

    onSnapshot(musicQuery, (querySnapshot) => {
        musicContainer.innerHTML = ""; // ✅ Clear previous entries

        querySnapshot.forEach((docSnap) => {
            const music = docSnap.data();
            console.log("🎵 Music Video Loaded:", music);

            // Detect if the user is on admin.html
            const isAdminPage = window.location.pathname.includes("admin.html");
            const isAdminUser = sessionStorage.getItem("isAdmin") === "true";

            // **✅ Make the entire music card clickable**
            const musicCard = `
                <div class="music-card" onclick="playMusic('${music.videoUrl}')">
                    <img
                        src="${music.thumbnail}"
                        alt="${music.title}"
                        class="music-thumbnail"
                    >
                    <h3>${music.title}</h3>
                    ${isAdminPage && isAdminUser
                        ? `<button class="delete-btn" onclick="deleteMusic(event, '${docSnap.id}')">🗑️ Delete</button>`
                        : ""}
                </div>
            `;

            musicContainer.innerHTML += musicCard;
        });
    }, (error) => {
        console.error("❌ Error fetching music videos:", error);
    });
}


window.playMusic = function(videoUrl) {
  if (!videoUrl || videoUrl.trim() === "") {
      alert("⚠️ This video link is invalid or missing.");
      return;
  }

  // Ensure the URL has `https://` or `http://`
  if (!videoUrl.startsWith("http://") && !videoUrl.startsWith("https://")) {
      videoUrl = "https://" + videoUrl;  // Prepend `https://` if missing
  }

  console.log("🎥 Opening video:", videoUrl);
  window.open(videoUrl, "_blank");
};


function isAdmin() {
    const isAdmin = sessionStorage.getItem("isAdmin") === "true";
    console.log("Admin Status:", isAdmin);
    return isAdmin;
}

async function addMusic() {
    const title = document.getElementById("music-title").value.trim();
    const url = document.getElementById("music-url").value.trim();
    const thumbnailInput = document.getElementById("music-thumbnail");

    if (!title || !url || thumbnailInput.files.length === 0) {
        alert("⚠️ Please fill out all fields and upload a thumbnail.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        const thumbnail = e.target.result; // Convert thumbnail to Base64
        try {
            await addDoc(collection(db, "music"), {
                title,
                videoUrl: url,
                thumbnail,
                timestamp: new Date(),
            });
            alert("✅ Music video added successfully!");
            loadMusic(); // Reload the music section
        } catch (error) {
            console.error("❌ Error adding music video:", error);
            alert("❌ Error adding music video. Please try again.");
        }
    };
    reader.readAsDataURL(thumbnailInput.files[0]);
}


window.deleteMusic = function (event, id) {
  event.stopPropagation(); // ✅ Prevents the click from triggering playMusic()

  if (confirm("Are you sure you want to delete this music video?")) {
      deleteDoc(doc(db, "music", id))
          .then(() => alert("✅ Music video deleted successfully!"))
          .catch((error) => {
              console.error("❌ Error deleting music video:", error);
              alert("❌ Error deleting music video. Please try again.");
          });
  }
};


  // Load all sections on page load
  loadBlogs();
  loadQueries();
  loadWorkshops();
  loadMusic();

  // Expose functions globally
  window.adminLogin = adminLogin;
  window.addQuery = addQuery;
  window.deleteQuery = deleteQuery;
  window.addWorkshop = addWorkshop;
  window.deleteWorkshop = deleteWorkshop;
  window.loadWorkshops = loadWorkshops;
  window.loadBlogs = loadBlogs;
  window.addBlog = addBlog;
  window.deleteBlog = deleteBlog;
  window.loadMusic = loadMusic;
  window.addMusic = addMusic;
  window.deleteMusic = deleteMusic;
  // Expose Firebase Firestore methods globally
  window.addDoc = addDoc;
  window.collection = collection;
  window.loadWorkshopRegistrations = loadWorkshopRegistrations;
  window.db = db; // Expose the Firestore database instance
});
