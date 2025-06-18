// Import Firebase SDK 
import ENV from "./config.js"; 
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  startAfter, 
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  getDoc, // ✅ Add getDoc to import list
  updateDoc,
  setDoc,
  limit // ✅ Import limit to use in Firestore queries
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Export Firestore methods for use in other scripts
export { db, addDoc, collection , getDoc, doc};

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
document.addEventListener("DOMContentLoaded", function () {
  const loginButton = document.getElementById("login-btn"); // Ensure you have a login button in HTML

  if (loginButton) {
    loginButton.addEventListener("click", function () {
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
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadBlogs(); // Initial load for guests
  const loadMoreBtn = document.getElementById("load-more-btn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => loadBlogs(true));
  }
});


  // 🔒 Secure Admin Page Access with a Secret Key
document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ DOM fully loaded. Initializing Firebase...");

    // Function to get admin password from Firestore
async function getAdminPassword() {
  const docRef = doc(db, "settings", "admin_settings");
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data().adminPassword;
  } else {
    console.error("⚠️ Admin password not found in Firestore!");
    return null;
  }
}

// Function to update the admin password
async function updateAdminPassword() {
  const currentPassword = document.getElementById("current-admin-password").value;
  const newPassword = document.getElementById("new-admin-password").value;

  const adminPassword = await getAdminPassword();
  if (currentPassword === adminPassword) {
  
    if (!newPassword) {
    alert("⚠️ Please enter a new password!");
    return;
  }
  try {
    const docRef = doc(db, "settings", "admin_settings");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // ✅ If document exists, update the password
      await updateDoc(docRef, { adminPassword: newPassword });
    } else {
      // ✅ If document does NOT exist, create it with the new password
      await setDoc(docRef, { adminPassword: newPassword });
    }

    alert("✅ Admin password updated successfully!");
    document.getElementById("new-admin-password").value = ""; // Clear input field
  } catch (error) {
    console.error("❌ Error updating admin password:", error);
    alert("❌ Failed to update password. Please try again.");
  }
 } else {
  alert("❌ Entered Password is not matching with Current password");
 }
}

  // Admin Login Functionality
   document.getElementById("admin-login-btn")?.addEventListener("click", adminLogin);
   document.getElementById("update-password-btn")?.addEventListener("click", updateAdminPassword);
   const urlParams = new URLSearchParams(window.location.search);

  async function adminLogin() {
    const enteredPassword = document.getElementById("admin-password").value;
    // ✅ Wait for the password from Firestore
    const adminPassword = await getAdminPassword();

    if (!adminPassword) {
      alert("❌ Could not retrieve admin password. Please try again later.");
      return;
    }
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
    const workshopSchedule = document.getElementById("workshopSchedule"); // For upcoming workshops
    const conductedWorkshops = document.getElementById("conductedWorkshops"); // For past workshops
    const workshopList = document.getElementById("workshop-list"); // For admin.html

    if (!workshopSchedule && !conductedWorkshops && !workshopList) {
        console.warn("⚠️ No workshop containers found in DOM.");
        return;
    }

    console.log("✅ Workshop containers found! Determining query...");

    // Detect if it's index.html (index page should only show future workshops)
    const isIndexPage = window.location.pathname === "/" || window.location.pathname.endsWith("index.html");


    // Query workshops in **ascending order** (sooner first)
    const workshopQuery = query(collection(db, "workshops"), orderBy("date", "asc"));

    console.log("📄 Fetching workshops in ascending order...");

    onSnapshot(workshopQuery, (querySnapshot) => {
        let upcomingWorkshops = [];
        let pastWorkshops = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of the day

        querySnapshot.forEach((docSnap) => {
            let workshop = docSnap.data();
            workshop.id = docSnap.id;
            const workshopDate = new Date(workshop.date);

            if (workshop.date) {
                if (workshopDate >= today) {
                    upcomingWorkshops.push(workshop); // Future workshops
                } else {
                    pastWorkshops.push(workshop); // Past workshops
                }
            }
        });

        // ✅ If it's index.html, limit to first 4 upcoming workshops
        if (isIndexPage) {
            upcomingWorkshops = upcomingWorkshops.slice(0, 4);
        }

        // Clear existing content
        if (workshopSchedule) workshopSchedule.innerHTML = "";
        if (conductedWorkshops) conductedWorkshops.innerHTML = "";
        if (workshopList) workshopList.innerHTML = "";

        // Function to create workshop cards
        function createWorkshopCard(workshop, isPast = false) {
            const workshopId = workshop.id;
            const imageTag = workshop.image
                ? `<div class="workshop-image-container">
                    <img src="${workshop.image}" alt="Workshop Image" class="workshop-image">
                 </div>`
                : "";

            return `
                <div class="event-card ${isPast ? "past-workshop" : ""}">
                    ${imageTag}
                    <div class="event-card-content">
                        <h3>${workshop.title || "Untitled Workshop"}</h3>
                        <p>${workshop.details ? workshop.details.substring(0, 100) + "..." : "No details available"}</p>
                        <p><strong>Date:</strong> ${workshop.date || "TBA"}</p>
                    </div>
                    <div class="event-card-footer">
                        <a href="workshop-details.html?id=${workshopId}" target="_blank" class="btn-know-more">Know More</a>
                    </div>
                </div>
            `;
        }

        // Render Upcoming Workshops
        upcomingWorkshops.forEach((workshop) => {
            if (workshopSchedule) workshopSchedule.innerHTML += createWorkshopCard(workshop);
        });

        // Render Conducted (Past) Workshops
        pastWorkshops.reverse(); // Show most recent conducted workshops first
        pastWorkshops.forEach((workshop) => {
            if (conductedWorkshops) conductedWorkshops.innerHTML += createWorkshopCard(workshop, true);
        });

        // Admin Workshop Cards
        pastWorkshops.concat(upcomingWorkshops).forEach((workshop) => {
            if (workshopList) {
                workshopList.innerHTML += `
                    <div class="admin-workshop-card">
                        <p><strong>Date:</strong> ${workshop.date || "TBA"}</p>
                        <p><strong>Title:</strong> ${workshop.title || "Untitled"}</p>
                        <p><strong>Details:</strong> ${workshop.details || "No details available"}</p>
                        <button onclick="deleteWorkshop('${workshop.id}')">Delete</button>
                        <hr>
                    </div>
                `;
            }
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

  // if (!title || !details || !date) {
  if (!title || !details) {
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
  let lastVisible = null;
  let allBlogsLoaded = false;
  let blogsLoadedSoFar = 0;
  
  function loadBlogs(isLoadMore = false) {
    const blogSection = document.getElementById("blog-section");
    const blogList = document.getElementById("blog-list");
  
    if (!blogSection && !blogList) {
      console.warn("⚠️ No valid blog container found in DOM.");
      return;
    }
  
    const isAdminPage = window.location.pathname.endsWith("admin.html");
    const isIndexPage = window.location.pathname === "/" || window.location.pathname.endsWith("index.html");
    const isBlogPage = window.location.pathname.endsWith("blog.html");
    const isAdminUser = sessionStorage.getItem("isAdmin") === "true";
  
    const blogsRef = collection(db, "blogs");
    let blogsQuery;
  
    if (isIndexPage) {
      blogsQuery = query(blogsRef, orderBy("timestamp", "desc"), limit(4));
    } else if (isBlogPage) {
      if (allBlogsLoaded) return;
      blogsQuery = query(
        blogsRef,
        orderBy("timestamp", "desc"),
        ...(lastVisible ? [startAfter(lastVisible)] : []),
        limit(8)
      );
    } else if (isAdminPage) {
      blogsQuery = query(blogsRef, orderBy("timestamp", "desc"));
    } else {
      return; // Unknown context
    }
  
    getDocs(blogsQuery).then((querySnapshot) => {
      const blogs = [];
      querySnapshot.forEach(doc => {
        blogs.push({ id: doc.id, ...doc.data() });
      });
  
      if (!isLoadMore || isAdminPage) {
        blogsLoadedSoFar = 0;
        if (blogSection) blogSection.innerHTML = "";
        if (blogList) blogList.innerHTML = "";
      }
  
      blogs.forEach((blog) => {
        const deleteButton = (isAdminPage && isAdminUser)
          ? `<button class="delete-btn" onclick="deleteBlog('${blog.id}')">🗑️ Delete</button>`
          : "";
  
        const blogCard = `
          <div class="blog-card">
            <img src="${blog.image || 'images/placeholder.png'}" alt="${blog.title || 'Missing'}" class="blog-image">
            <div class="blog-card-content">
              <h3 class="blog-card-title">${blog.title || 'Untitled Blog'}</h3>
              <p class="blog-card-body">${(blog.content || '').substring(0, 150)}...</p>
              <div class="blog-card-footer">
                <a href="blog-details.html?id=${blog.id}" class="blog-read-more" target="_blank">Read More</a>
                ${deleteButton}
              </div>
            </div>
          </div>
        `;
  
        if (blogSection) blogSection.innerHTML += blogCard;
        if ((isAdminPage || blogList) && !isBlogPage) blogList.innerHTML += blogCard;
      });
  
      blogsLoadedSoFar += blogs.length;
  
      if (isBlogPage) {
        const loadMoreBtn = document.getElementById("load-more-btn");
  
        if (blogs.length < 8) {
          allBlogsLoaded = true;
          if (loadMoreBtn) loadMoreBtn.style.display = "none";
        } else {
          if (loadMoreBtn) {
            loadMoreBtn.style.display = "inline-block";
            loadMoreBtn.onclick = () => loadBlogs(true);
          }
          lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        }
      }
    }).catch(err => {
      console.error("❌ Error loading blogs:", err);
    });
  }
  

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM ready, calling loadBlogs()");
  loadBlogs();

  const loadMoreBtn = document.getElementById("load-more-btn");
  if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
          console.log("📥 Loading more blogs...");
          loadBlogs(true); // Load next page
      });
  }
});

async function addBlog() {
  const title = document.getElementById("blog-title").value;
  const content = document.getElementById("blog-content").value;
  const imageInput = document.getElementById("blog-image");

  if (!title) {
      alert("⚠️ Please fill out Blog Title!");
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
    //const isHomePage = window.location.pathname.includes("index.html");
    const isHomePage = window.location.pathname === "/" || window.location.pathname.endsWith("index.html");

    const musicQuery = isHomePage
        ? query(collection(db, "music"), orderBy("timestamp", "desc"), limit(4)) // ✅ Limit to 4
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
  window.updateAdminPassword = updateAdminPassword;

  // Expose Firebase Firestore methods globally
  window.addDoc = addDoc;
  window.collection = collection;
  window.loadWorkshopRegistrations = loadWorkshopRegistrations;
  window.db = db; // Expose the Firestore database instance
});