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
  getDoc,
  updateDoc,
  setDoc,
  limit,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

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
const storage = getStorage(app);
const auth = getAuth();
const provider = new GoogleAuthProvider();

// ============================================================
// FIREBASE STORAGE HELPER
// Uploads a file to Storage, returns the public download URL
// folder = "blogs" | "workshops" | "music" | "podcasts" | "store"
// ============================================================
async function uploadImageToStorage(file, folder) {
  if (!file) return "";
  const filename = Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageRef = ref(storage, folder + "/" + filename);
  //showNotification("⏳ Uploading image...");
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  } catch (err) {
    console.error("❌ Storage upload failed:", err);
    alert("❌ Image upload failed. Check Firebase Storage is enabled in your Firebase Console.");
    return "";
  }
}

// Delete an image from Storage by its URL (called when deleting a document)
async function deleteImageFromStorage(imageUrl) {
  if (!imageUrl || imageUrl.startsWith("data:")) return; // skip base64 or empty
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (err) {
    // Non-fatal - file may already be deleted or URL may be external
    console.warn("Could not delete image from storage:", err.code);
  }
}


// Enable offline persistence - makes repeat visits INSTANT from local cache
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    // Multiple tabs open - persistence only works in one tab at a time
    console.log("Offline persistence unavailable: multiple tabs open");
  } else if (err.code === "unimplemented") {
    // Browser doesn't support it
    console.log("Offline persistence not supported in this browser");
  }
});

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
    loadPodcasts();
    loadStoreItems();
    loadQuizQuestions();

    } else {
      alert("Incorrect password! Please try again.");
      return;
    }
  }

  // Query Management
  function loadQueries() {
    const queryList = document.getElementById("query-list");
    if (!queryList) return;

    // Use getDocs (one-time fetch) to avoid double listener on repeated calls
    // No orderBy so ALL documents show even if timestamp field is missing
    getDocs(collection(db, "queries")).then((querySnapshot) => {
      queryList.innerHTML = "";

      if (querySnapshot.empty) {
        queryList.innerHTML = "<p style='color:var(--muted); padding:1rem;'>No queries submitted yet.</p>";
        return;
      }

      // Sort manually so missing timestamp docs still appear (at bottom)
      const docs = [];
      querySnapshot.forEach(docSnap => docs.push({ id: docSnap.id, ...docSnap.data() }));
      docs.sort((a, b) => {
        const ta = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const tb = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return tb - ta; // newest first
      });

      docs.forEach((queryData) => {
        // Safe timestamp formatting - handles Firestore Timestamp, JS Date, string, or missing
        let formattedTime = "Unknown";
        try {
          if (queryData.timestamp?.toMillis) {
            formattedTime = new Date(queryData.timestamp.toMillis()).toLocaleString();
          } else if (queryData.timestamp) {
            formattedTime = new Date(queryData.timestamp).toLocaleString();
          }
        } catch(e) { formattedTime = "Unknown"; }

        queryList.innerHTML += `
          <div class="admin-card">
            <p><strong>Name:</strong> ${queryData.name || "—"}</p>
            <p><strong>Email:</strong> ${queryData.email || "—"}</p>
            <p><strong>Contact:</strong> ${queryData.contact || "—"}</p>
            <p><strong>Source:</strong> ${queryData.source || "website"}</p>
            <p><strong>Message:</strong> ${queryData.message || "—"}</p>
            <p><strong>Received:</strong> ${formattedTime}</p>
            <button class="btn-delete" onclick="deleteQuery('${queryData.id}')">🗑 Delete</button>
          </div>`;
      });
    }).catch((error) => {
      console.error("❌ Error loading queries:", error);
      document.getElementById("query-list").innerHTML = "<p style='color:red'>Error loading queries. Check Firestore rules.</p>";
    });
  }

  async function addQuery(event, source) {
    event.preventDefault();

    // Support both regular forms (visitor-* IDs) and booking form (booking-* IDs)
    const isBooking = source === "booking";
    const name    = isBooking ? document.getElementById("booking-name")?.value    : document.getElementById("visitor-name")?.value;
    const email   = isBooking ? document.getElementById("booking-email")?.value   : document.getElementById("visitor-email")?.value;
    const contact = isBooking ? document.getElementById("booking-phone")?.value   : document.getElementById("visitor-contact")?.value;
    const message = isBooking ? document.getElementById("booking-session")?.value : document.getElementById("visitor-message")?.value;
    const page    = source || window.location.pathname.split("/").pop() || "index.html";

    if (!name || !email) {
      alert("⚠️ Please fill Name and Email at minimum!");
      return;
    }

    try {
      await addDoc(collection(db, "queries"), {
        name:      name || "",
        email:     email || "",
        contact:   contact || "",
        message:   message || "",
        source:    page,
        timestamp: new Date()
      });
      const n = document.createElement("div");
      n.className = "notification";
      n.textContent = "✅ Message sent successfully!";
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 3500);
      event.target.reset();
    } catch (error) {
      console.error("❌ Error submitting inquiry:", error);
      alert("❌ Failed to send. Please email us directly at gauri.peakliving@gmail.com");
    }
  }
  
  // Attach form submit handlers directly (inside DOMContentLoaded - DOM is ready)
  const inquiryForm = document.getElementById("home-inquiry-form");
  if (inquiryForm) {
    inquiryForm.addEventListener("submit", addQuery);
  }

  // Booking/quick enquiry form (index.html) - uses booking-* field IDs
  const bookingForm = document.getElementById("booking-form");
  if (bookingForm) {
    bookingForm.addEventListener("submit", function(e) {
      addQuery(e, "booking");
    });
  }

  

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

    getDocs(workshopQuery).then((querySnapshot) => {
        let upcomingWorkshops = [];
        let pastWorkshops = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
                    <img src="${workshop.image}" alt="Workshop Image" class="workshop-image" loading="lazy">
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
    }).catch((error) => {
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
  const title   = document.getElementById("workshop-title").value.trim();
  const details = document.getElementById("workshop-details").value.trim();
  const date    = document.getElementById("workshop-date").value.trim();
  const imageInput = document.getElementById("workshop-image");

  if (!title || !details) { alert("⚠️ Please fill out all required fields!"); return; }

  try {
    const imageUrl = imageInput.files.length > 0
      ? await uploadImageToStorage(imageInput.files[0], "workshops")
      : "";

    await addDoc(collection(db, "workshops"), { title, details, date, image: imageUrl });
    loadWorkshops();
    showNotification("✅ Workshop successfully scheduled!", "success");
    document.getElementById("workshop-title").value = "";
    document.getElementById("workshop-details").value = "";
    document.getElementById("workshop-date").value = "";
    if (imageInput) imageInput.value = "";
  } catch (error) {
    console.error("❌ Error adding workshop:", error);
    showNotification("❌ Failed to add workshop. Try again.", "error");
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
    const blogList    = document.getElementById("blog-list");

    if (!blogSection && !blogList) return;

    const isAdminPage = window.location.pathname.endsWith("admin.html");
    const isIndexPage = window.location.pathname === "/" || window.location.pathname.endsWith("index.html");
    const isBlogPage  = window.location.pathname.endsWith("blog.html");
    const isAdminUser = sessionStorage.getItem("isAdmin") === "true";

    const blogsRef = collection(db, "blogs");
    let blogsQuery;

    if (isIndexPage) {
      blogsQuery = query(blogsRef, orderBy("timestamp", "desc"), limit(4));
    } else if (isBlogPage) {
      if (allBlogsLoaded) return;
      // FIX: reduced from 10 to 6 per page - less data per request
      blogsQuery = query(
        blogsRef,
        orderBy("timestamp", "desc"),
        ...(lastVisible ? [startAfter(lastVisible)] : []),
        limit(6)
      );
    } else if (isAdminPage) {
      blogsQuery = query(blogsRef, orderBy("timestamp", "desc"));
    } else {
      return;
    }

    // Show skeleton placeholders immediately so page doesn't look blank
    if (!isLoadMore && blogSection) {
      blogSection.innerHTML = Array(isBlogPage ? 6 : 4).fill(0).map(() => `
        <div class="blog-card" style="pointer-events:none;">
          <div style="width:100%;height:200px;background:linear-gradient(90deg,var(--ivory-deep) 25%,var(--ivory) 50%,var(--ivory-deep) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:var(--radius-lg) var(--radius-lg) 0 0;"></div>
          <div class="blog-card-content">
            <div style="height:13px;background:var(--ivory-deep);border-radius:4px;margin-bottom:8px;width:55%;animation:shimmer 1.5s infinite;"></div>
            <div style="height:20px;background:var(--ivory-deep);border-radius:4px;margin-bottom:10px;animation:shimmer 1.5s infinite;"></div>
            <div style="height:13px;background:var(--ivory-deep);border-radius:4px;margin-bottom:5px;animation:shimmer 1.5s infinite;"></div>
            <div style="height:13px;background:var(--ivory-deep);border-radius:4px;width:75%;animation:shimmer 1.5s infinite;"></div>
          </div>
        </div>`).join("");
    }

    getDocs(blogsQuery).then((querySnapshot) => {
      const blogs = [];
      querySnapshot.forEach(d => blogs.push({ id: d.id, ...d.data() }));

      if (!isLoadMore || isAdminPage) {
        blogsLoadedSoFar = 0;
        if (blogSection) blogSection.innerHTML = "";
        if (blogList)    blogList.innerHTML = "";
      }

      // FIX: build full HTML string first, then set once - avoids 10x DOM reflows
      let blogHTML = "";
      let adminHTML = "";

      blogs.forEach((blog) => {
        const deleteButton = (isAdminPage && isAdminUser)
          ? `<button class="delete-btn" onclick="deleteBlog('${blog.id}')">🗑️ Delete</button>`
          : "";

        // Smart image: Storage URLs load fast, base64 shows placeholder until migrated
        // After admin runs migration once, ALL blogs will be Storage URLs (fast + with image)
        const isStorageUrl = blog.image && blog.image.startsWith("http");
        const imgHtml = isStorageUrl
          ? `<img src="${blog.image}" alt="${blog.title || ""}" class="blog-image" loading="lazy">`
          : blog.image
            ? `<div class="blog-image" style="background:linear-gradient(135deg,var(--forest),var(--forest-mid));display:flex;align-items:center;justify-content:center;color:var(--gold-light);font-size:2.5rem;flex-direction:column;gap:8px;"><span style="font-size:2rem;">📝</span><span style="font-size:11px;opacity:0.7;">Image migrating...</span></div>`
            : `<div class="blog-image" style="background:linear-gradient(135deg,var(--forest),var(--forest-mid));display:flex;align-items:center;justify-content:center;color:var(--gold-light);font-size:2.5rem;">📝</div>`;

        const card = `
          <div class="blog-card">
            ${imgHtml}
            <div class="blog-card-content">
              <h3 class="blog-card-title">${blog.title || "Untitled Blog"}</h3>
              <p class="blog-card-body">${(blog.content || "").substring(0, 150)}...</p>
              <div class="blog-card-footer">
                <a href="blog-details.html?id=${blog.id}" class="blog-read-more" target="_blank">Read More</a>
                ${deleteButton}
              </div>
            </div>
          </div>`;

        blogHTML  += card;
        adminHTML += card;
      });

      // FIX: single DOM write instead of N writes in a loop
      if (blogSection) blogSection.innerHTML = (isLoadMore ? blogSection.innerHTML : "") + blogHTML;
      if (isAdminPage && blogList) blogList.innerHTML += adminHTML;

      blogsLoadedSoFar += blogs.length;

      if (isBlogPage) {
        const loadMoreBtn = document.getElementById("load-more-btn");
        if (blogs.length < 6) {
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
      if (blogSection) blogSection.innerHTML = "<p style='color:var(--muted);text-align:center;padding:2rem;'>Could not load blogs. Please refresh.</p>";
    });
  }
  



async function addBlog() {
  const title = document.getElementById("blog-title").value.trim();
  const content = document.getElementById("blog-content").value.trim();
  const imageInput = document.getElementById("blog-image");

  if (!title) { alert("⚠️ Please fill out Blog Title!"); return; }

  try {
    // Upload image to Firebase Storage, get back a URL (or "" if no image)
    const imageUrl = imageInput.files.length > 0
      ? await uploadImageToStorage(imageInput.files[0], "blogs")
      : "";

    await addDoc(collection(db, "blogs"), {
      title, content,
      image: imageUrl,
      timestamp: new Date()
    });

    loadBlogs();
    showNotification("✅ Blog added successfully!");
    document.getElementById("blog-title").value = "";
    document.getElementById("blog-content").value = "";
    if (imageInput) imageInput.value = "";
  } catch (error) {
    console.error("❌ Error adding blog:", error);
    alert("❌ Failed to add blog. Try again.");
  }
}

// showNotification defined above at line 510

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

    getDocs(musicQuery).then((querySnapshot) => {
        musicContainer.innerHTML = "";

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
                        class="music-thumbnail" loading="lazy"
                    >
                    <h3>${music.title}</h3>
                    ${isAdminPage && isAdminUser
                        ? `<button class="delete-btn" onclick="deleteMusic(event, '${docSnap.id}')">🗑️ Delete</button>`
                        : ""}
                </div>
            `;

            musicContainer.innerHTML += musicCard;
        });
    }).catch((error) => {
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
    const url   = document.getElementById("music-url").value.trim();
    const thumbnailInput = document.getElementById("music-thumbnail");

    if (!title || !url || thumbnailInput.files.length === 0) {
        alert("⚠️ Please fill out all fields and upload a thumbnail.");
        return;
    }

    try {
      const thumbnailUrl = await uploadImageToStorage(thumbnailInput.files[0], "music");

      await addDoc(collection(db, "music"), {
        title,
        videoUrl: url,
        thumbnail: thumbnailUrl,
        timestamp: new Date(),
      });

      showNotification("✅ Music video added successfully!");
      loadMusic();
      document.getElementById("music-title").value = "";
      document.getElementById("music-url").value = "";
      thumbnailInput.value = "";
    } catch (error) {
      console.error("❌ Error adding music video:", error);
      alert("❌ Error adding music video. Please try again.");
    }
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




  // ============ PODCAST MANAGEMENT ============
  function loadPodcasts() {
    // Supports three containers:
    // id="podcast-list"      → podcast.html (all episodes) and admin.html
    // id="podcast-list-home" → index.html (latest 3 only)
    const podcastList     = document.getElementById("podcast-list");
    const podcastListHome = document.getElementById("podcast-list-home");
    if (!podcastList && !podcastListHome) return;
    const isAdminPage = window.location.pathname.endsWith("admin.html");

    getDocs(collection(db, "podcasts")).then((snap) => {
      if (podcastList) podcastList.innerHTML = "";
      if (snap.empty) {
        if (podcastListHome) podcastListHome.innerHTML = "<p style='color:var(--muted);grid-column:1/-1;text-align:center;padding:1rem;'>Podcast episodes coming soon!</p>";
        if (podcastList) podcastList.innerHTML = isAdminPage
          ? "<p style='color:var(--muted)'>No podcast episodes added yet.</p>"
          : "<p style='color:var(--muted);text-align:center;grid-column:1/-1;padding:2rem;'>Podcast episodes coming soon! Subscribe below to be notified.</p>";
        return;
      }

      // Sort by episodeNumber numerically, fallback to timestamp
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const ea = parseInt(a.episodeNumber) || 0;
        const eb = parseInt(b.episodeNumber) || 0;
        if (ea !== eb) return eb - ea; // newest episode first
        const ta = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tb = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tb - ta;
      });

      // Render homepage preview (latest 3, public style)
      if (podcastListHome) {
        podcastListHome.innerHTML = "";
        const homeItems = docs.slice(0, 3);
        if (homeItems.length === 0) {
          podcastListHome.innerHTML = "<p style='color:var(--muted);grid-column:1/-1;text-align:center;padding:1rem;'>Podcast episodes coming soon!</p>";
        } else {
          homeItems.forEach(p => {
            const emojis = ["🎙","🧠","🌿","💡","🍃","💤","🎵","🔍"];
            const emoji = emojis[(parseInt(p.episodeNumber)||1) % emojis.length];
            podcastListHome.innerHTML += `
              <div class="podcast-card" style="cursor:${p.audioUrl?'pointer':'default'}" ${p.audioUrl?`onclick="window.open('${p.audioUrl}','_blank')"`:""}> 
                ${p.image
                  ? `<img src="${p.image}" alt="${p.title}" style="width:80px;height:80px;border-radius:var(--radius);object-fit:cover;flex-shrink:0;">`
                  : `<div class="podcast-thumb">${emoji}</div>`}
                <div class="podcast-info">
                  <h4>${p.title || "Untitled"}</h4>
                  <p>${p.description || ""}</p>
                  <div class="podcast-meta">
                    ${p.episodeNumber ? `<span>Ep ${p.episodeNumber}</span>` : ""}
                    ${p.duration ? `<span>· ${p.duration}</span>` : ""}
                    ${p.audioUrl ? `<span style="color:var(--forest-light);">· Listen ▶</span>` : `<span>· Coming Soon</span>`}
                  </div>
                </div>
              </div>`;
          });
        }
      }

      // Render full list (podcast.html or admin.html)
      if (!podcastList) return;
      podcastList.innerHTML = "";
      docs.forEach((p) => {
        if (isAdminPage) {
          // Admin view: compact info card with delete button
          let timeStr = "Unknown";
          try { if (p.timestamp?.toMillis) timeStr = new Date(p.timestamp.toMillis()).toLocaleDateString(); } catch(e){}
          podcastList.innerHTML += `
            <div class="admin-card">
              ${p.image ? `<img src="${p.image}" alt="${p.title}" style="width:100%;height:140px;object-fit:cover;border-radius:var(--radius);margin-bottom:0.75rem;">` : ""}
              <p><strong>Ep ${p.episodeNumber || "?"}</strong> — ${p.title || "Untitled"}</p>
              <p style="font-size:13px;color:var(--muted);">${p.description ? p.description.substring(0,80)+"..." : ""}</p>
              <p style="font-size:12px;color:var(--muted);">Duration: ${p.duration || "—"} | Added: ${timeStr}</p>
              ${p.audioUrl ? `<p><a href="${p.audioUrl}" target="_blank" style="color:var(--forest-light);font-size:13px;">🔗 Listen →</a></p>` : ""}
              <button class="btn-delete" onclick="deletePodcast('${p.id}')">🗑 Delete</button>
            </div>`;
        } else {
          // Public view: beautiful podcast card
          const emojis = ["🎙","🧠","🌿","💡","🍃","💤","🎵","🔍"];
          const emoji = emojis[(parseInt(p.episodeNumber)||1) % emojis.length];
          podcastList.innerHTML += `
            <div class="podcast-card" style="cursor:${p.audioUrl ? 'pointer' : 'default'}" ${p.audioUrl ? `onclick="window.open('${p.audioUrl}','_blank')"` : ""}>
              ${p.image
                ? `<img src="${p.image}" alt="${p.title}" style="width:80px;height:80px;border-radius:var(--radius);object-fit:cover;flex-shrink:0;">`
                : `<div class="podcast-thumb">${emoji}</div>`}
              <div class="podcast-info">
                <h4>${p.title || "Untitled"}</h4>
                <p>${p.description || ""}</p>
                <div class="podcast-meta">
                  ${p.episodeNumber ? `<span>Ep ${p.episodeNumber}</span>` : ""}
                  ${p.duration ? `<span>· ${p.duration}</span>` : ""}
                  ${p.audioUrl ? `<span style="color:var(--forest-light);">· Listen ▶</span>` : `<span>· Coming Soon</span>`}
                </div>
              </div>
            </div>`;
        }
      });
    }).catch(err => {
      console.error("❌ loadPodcasts error:", err);
      podcastList.innerHTML = "<p style='color:red;grid-column:1/-1'>Failed to load podcasts. Check Firestore rules.</p>";
    });
  }

  async function addPodcast() {
    const title    = document.getElementById("podcast-title")?.value.trim();
    const desc     = document.getElementById("podcast-desc")?.value.trim();
    const episode  = document.getElementById("podcast-episode")?.value.trim();
    const duration = document.getElementById("podcast-duration")?.value.trim();
    const audioUrl = document.getElementById("podcast-url")?.value.trim();
    const imageInput = document.getElementById("podcast-image");
    if (!title) { alert("⚠️ Episode title is required!"); return; }

    try {
      const imageUrl = (imageInput && imageInput.files.length > 0)
        ? await uploadImageToStorage(imageInput.files[0], "podcasts")
        : "";

      await addDoc(collection(db, "podcasts"), {
        title, description: desc, episodeNumber: episode,
        duration, audioUrl, image: imageUrl, timestamp: new Date()
      });

      showNotification("✅ Podcast episode added!");
      ["podcast-title","podcast-desc","podcast-episode","podcast-duration","podcast-url"].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = "";
      });
      if (imageInput) imageInput.value = "";
    } catch(e) {
      console.error(e);
      alert("❌ Failed to add podcast.");
    }
  }

  window.deletePodcast = async function(id) {
    if (!confirm("Delete this podcast episode?")) return;
    await deleteDoc(doc(db, "podcasts", id));
    showNotification("✅ Episode deleted.");
  };

  window.addPodcast = addPodcast;
  window.loadPodcasts = loadPodcasts;

  // ============ STORE / BOOKS MANAGEMENT ============
  function loadStoreItems() {
    // Supports three containers:
    // id="store-list"      → store.html (all items) and admin.html
    // id="store-list-home" → index.html (latest 3 only)
    const storeList     = document.getElementById("store-list");
    const storeListHome = document.getElementById("store-list-home");
    if (!storeList && !storeListHome) return;
    const isAdminPage = window.location.pathname.endsWith("admin.html");

    getDocs(collection(db, "store")).then((snap) => {
      if (storeList) storeList.innerHTML = "";
      if (snap.empty) {
        if (storeListHome) storeListHome.innerHTML = "<p style='color:var(--muted);grid-column:1/-1;text-align:center;padding:1rem;'>Store items coming soon!</p>";
        if (storeList) storeList.innerHTML = isAdminPage
          ? "<p style='color:var(--muted)'>No store items added yet.</p>"
          : "<p style='color:var(--muted);text-align:center;grid-column:1/-1;padding:2rem;'>Store items coming soon!</p>";
        return;
      }

      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const ta = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tb = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tb - ta;
      });

      // Render homepage preview (latest 3, public style)
      if (storeListHome) {
        storeListHome.innerHTML = "";
        const homeItems = docs.slice(0, 3);
        if (homeItems.length === 0) {
          storeListHome.innerHTML = "<p style='color:var(--muted);grid-column:1/-1;text-align:center;padding:1rem;'>Store items coming soon!</p>";
        } else {
          homeItems.forEach(item => {
            const categoryEmojis = { "Book":"📖","Online Course":"🎓","Wellness Kit":"🧘","Other":"✨" };
            const emoji = item.image ? null : (categoryEmojis[item.category] || "📦");
            storeListHome.innerHTML += `
              <div class="store-card">
                <div class="store-card-img-box">
                  ${item.image ? `<img src="${item.image}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover;">` : emoji}
                </div>
                <div class="store-card-body">
                  <div class="store-category">${item.category || "Book"}</div>
                  <h4>${item.title || "Untitled"}</h4>
                  <p>${item.description || ""}</p>
                  <span class="store-price">${item.price || "Coming Soon"}</span>
                </div>
                <div class="store-card-footer">
                  ${item.link
                    ? `<a href="${item.link}" target="_blank" class="btn btn-primary" style="flex:1;justify-content:center;font-size:14px;padding:10px;">Buy Now →</a>`
                    : `<button class="btn btn-outline" style="flex:1;justify-content:center;font-size:14px;padding:10px;" onclick="notifyStoreItem(this)">Notify Me</button>`}
                </div>
              </div>`;
          });
        }
      }

      // Render full list (store.html or admin.html)
      if (!storeList) return;
      storeList.innerHTML = "";
      docs.forEach((item) => {
        if (isAdminPage) {
          let timeStr = "Unknown";
          try { if (item.timestamp?.toMillis) timeStr = new Date(item.timestamp.toMillis()).toLocaleDateString(); } catch(e){}
          storeList.innerHTML += `
            <div class="admin-card">
              ${item.image ? `<img src="${item.image}" alt="${item.title}" style="width:100%;height:140px;object-fit:cover;border-radius:var(--radius);margin-bottom:0.75rem;">` : ""}
              <p><strong>${item.title || "Untitled"}</strong> &nbsp;|&nbsp; <span style="color:var(--gold);">${item.category || "Book"}</span></p>
              <p style="font-size:13px;color:var(--muted);">${item.description ? item.description.substring(0,80)+"..." : "—"}</p>
              <p style="font-size:12px;color:var(--muted);">Price: ${item.price || "Coming Soon"} | Added: ${timeStr}</p>
              ${item.link ? `<p><a href="${item.link}" target="_blank" style="color:var(--forest-light);font-size:13px;">🔗 Buy Link →</a></p>` : ""}
              <button class="btn-delete" onclick="deleteStoreItem('${item.id}')">🗑 Delete</button>
            </div>`;
        } else {
          // Public view: beautiful store card
          const categoryEmojis = { "Book": "📖", "Online Course": "🎓", "Wellness Kit": "🧘", "Other": "✨" };
          const emoji = item.image ? null : (categoryEmojis[item.category] || "📦");
          storeList.innerHTML += `
            <div class="store-card">
              <div class="store-card-img-box">
                ${item.image
                  ? `<img src="${item.image}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover;">`
                  : emoji}
              </div>
              <div class="store-card-body">
                <div class="store-category">${item.category || "Book"}</div>
                <h4>${item.title || "Untitled"}</h4>
                <p>${item.description || ""}</p>
                <span class="store-price">${item.price || "Coming Soon"}</span>
              </div>
              <div class="store-card-footer">
                ${item.link
                  ? `<a href="${item.link}" target="_blank" class="btn btn-primary" style="flex:1;justify-content:center;font-size:14px;padding:10px;">Buy Now →</a>`
                  : `<button class="btn btn-outline" style="flex:1;justify-content:center;font-size:14px;padding:10px;" onclick="notifyStoreItem(this)">Notify Me</button>`}
              </div>
            </div>`;
        }
      });
    }).catch(err => {
      console.error("❌ loadStoreItems error:", err);
      storeList.innerHTML = "<p style='color:red;grid-column:1/-1'>Failed to load store. Check Firestore rules.</p>";
    });
  }

  async function addStoreItem() {
    const title    = document.getElementById("store-title")?.value.trim();
    const desc     = document.getElementById("store-desc")?.value.trim();
    const category = document.getElementById("store-category")?.value.trim();
    const price    = document.getElementById("store-price")?.value.trim();
    const link     = document.getElementById("store-link")?.value.trim();
    const imageInput = document.getElementById("store-image");
    if (!title) { alert("⚠️ Item title is required!"); return; }

    try {
      const imageUrl = (imageInput && imageInput.files.length > 0)
        ? await uploadImageToStorage(imageInput.files[0], "store")
        : "";

      await addDoc(collection(db, "store"), {
        title, description: desc, category, price, link,
        image: imageUrl, timestamp: new Date()
      });

      showNotification("✅ Store item added!");
      ["store-title","store-desc","store-category","store-price","store-link"].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = "";
      });
      if (imageInput) imageInput.value = "";
    } catch(e) {
      console.error(e);
      alert("❌ Failed to add item.");
    }
  }

  window.deleteStoreItem = async function(id) {
    if (!confirm("Delete this store item?")) return;
    await deleteDoc(doc(db, "store", id));
    showNotification("✅ Item deleted.");
  };

  window.addStoreItem = addStoreItem;
  window.loadStoreItems = loadStoreItems;
  window.notifyStoreItem = function(btn) {
    const n = document.createElement("div");
    n.className = "notification";
    n.textContent = "✅ We\'ll notify you when this is available!";
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
  };

  
  // ============================================================
  // QUIZ QUESTION MANAGEMENT
  // ============================================================
  async function addQuizQuestion() {
    const order  = parseInt(document.getElementById("quiz-order")?.value);
    const text   = document.getElementById("quiz-text")?.value.trim();
    const active = document.getElementById("quiz-active")?.checked ?? true;

    const opt1Text  = document.getElementById("quiz-opt1-text")?.value.trim();
    const opt2Text  = document.getElementById("quiz-opt2-text")?.value.trim();
    const opt3Text  = document.getElementById("quiz-opt3-text")?.value.trim();

    if (!text || !opt1Text || !opt2Text || !opt3Text) {
      alert("⚠️ Please fill in the question and all 3 option texts.");
      return;
    }
    if (!order || order < 1) {
      alert("⚠️ Please enter a valid order number.");
      return;
    }

    const options = [
      {
        text:  opt1Text,
        earth: parseInt(document.getElementById("quiz-opt1-earth")?.value) || 0,
        wind:  parseInt(document.getElementById("quiz-opt1-wind")?.value)  || 0,
        fire:  parseInt(document.getElementById("quiz-opt1-fire")?.value)  || 0,
      },
      {
        text:  opt2Text,
        earth: parseInt(document.getElementById("quiz-opt2-earth")?.value) || 0,
        wind:  parseInt(document.getElementById("quiz-opt2-wind")?.value)  || 0,
        fire:  parseInt(document.getElementById("quiz-opt2-fire")?.value)  || 0,
      },
      {
        text:  opt3Text,
        earth: parseInt(document.getElementById("quiz-opt3-earth")?.value) || 0,
        wind:  parseInt(document.getElementById("quiz-opt3-wind")?.value)  || 0,
        fire:  parseInt(document.getElementById("quiz-opt3-fire")?.value)  || 0,
      },
    ];

    try {
      await addDoc(collection(db, "quiz_questions"), {
        text, order, active, options, timestamp: new Date()
      });
      showNotification("✅ Question added!");
      // Clear form
      ["quiz-order","quiz-text","quiz-opt1-text","quiz-opt2-text","quiz-opt3-text"].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = "";
      });
      ["quiz-opt1-earth","quiz-opt1-wind","quiz-opt1-fire"].forEach((id,i) => {
        const el = document.getElementById(id); if (el) el.value = i===0?3:0;
      });
      ["quiz-opt2-earth","quiz-opt2-wind","quiz-opt2-fire"].forEach((id,i) => {
        const el = document.getElementById(id); if (el) el.value = i===1?3:0;
      });
      ["quiz-opt3-earth","quiz-opt3-wind","quiz-opt3-fire"].forEach((id,i) => {
        const el = document.getElementById(id); if (el) el.value = i===2?3:0;
      });
      loadQuizQuestions();
    } catch(e) {
      console.error(e);
      alert("❌ Failed to add question.");
    }
  }

  function loadQuizQuestions() {
    const list = document.getElementById("quiz-list");
    if (!list) return;
    list.innerHTML = "<p style='color:var(--muted);font-size:14px;'>Loading...</p>";

    getDocs(query(collection(db, "quiz_questions"), orderBy("order", "asc")))
      .then(snap => {
        if (snap.empty) {
          list.innerHTML = "<p style='color:var(--muted)'>No questions yet. Add your first question above.</p>";
          return;
        }
        list.innerHTML = "";
        snap.forEach(docSnap => {
          const q = docSnap.data();
          const id = docSnap.id;
          const statusColor = q.active ? "var(--forest-light)" : "var(--muted)";
          const statusLabel = q.active ? "● Active" : "○ Inactive";
          list.innerHTML += `
            <div class="admin-card" style="border-left-color:${statusColor};">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;">
                <div style="flex:1;">
                  <p style="font-size:12px;color:var(--gold);font-weight:600;margin-bottom:4px;">Q${q.order || "?"} · <span style="color:${statusColor}">${statusLabel}</span></p>
                  <p style="font-weight:600;color:var(--charcoal);margin-bottom:0.75rem;">${q.text}</p>
                  ${(q.options||[]).map((opt,i) => {
                    const icons=["🌍","💨","🔥"];
                    return `<p style="font-size:13px;color:var(--muted);margin-bottom:3px;">${icons[i]||""} ${opt.text} <span style="color:var(--forest);font-size:11px;">(E:${opt.earth||0} W:${opt.wind||0} F:${opt.fire||0})</span></p>`;
                  }).join("")}
                </div>
                <div style="display:flex;flex-direction:column;gap:0.5rem;flex-shrink:0;">
                  <button class="btn btn-outline" style="font-size:12px;padding:6px 12px;" onclick="toggleQuizQuestion('${id}', ${!q.active})">
                    ${q.active ? "Deactivate" : "Activate"}
                  </button>
                  <button class="btn-delete" onclick="deleteQuizQuestion('${id}')">🗑 Delete</button>
                </div>
              </div>
            </div>`;
        });
      }).catch(err => {
        console.error(err);
        list.innerHTML = "<p style='color:red'>Error loading questions.</p>";
      });
  }

  window.toggleQuizQuestion = async function(id, newState) {
    try {
      await updateDoc(doc(db, "quiz_questions", id), { active: newState });
      showNotification(newState ? "✅ Question activated!" : "✅ Question deactivated!");
      loadQuizQuestions();
    } catch(e) { alert("❌ Failed to update question."); }
  };

  window.deleteQuizQuestion = async function(id) {
    if (!confirm("Delete this question permanently?")) return;
    await deleteDoc(doc(db, "quiz_questions", id));
    showNotification("✅ Question deleted.");
    loadQuizQuestions();
  };

  window.addQuizQuestion  = addQuizQuestion;
  window.loadQuizQuestions = loadQuizQuestions;


    // Smart page-specific loading - only fetch what this page actually needs
  // This avoids wasting bandwidth on data not shown on the current page
  const path = window.location.pathname;
  const page = path.split("/").pop() || "index.html";

  if (page === "index.html" || page === "") {
    // Homepage: workshops preview, blog preview, podcast preview, store preview
    loadWorkshops();
    loadBlogs();
    loadPodcasts();
    loadStoreItems();
    loadQuizQuestions();
  } else if (page === "blog.html") {
    loadBlogs();
  } else if (page === "workshop.html") {
    loadWorkshops();
  } else if (page === "music.html") {
    loadMusic();
  } else if (page === "podcast.html") {
    loadPodcasts();
  } else if (page === "store.html") {
    loadStoreItems();
  } else if (page === "quiz.html") {
    // quiz.html loads its own questions via standalone Firebase module
  } else if (page === "admin.html") {
    // Admin loads everything - but only AFTER login (handled in adminLogin())
    // Don't auto-load here to avoid unnecessary reads
  } else if (page === "workshop-details.html") {
    // Handled by loadWorkshopDetails() separately
  } else {
    // Fallback: load blogs and workshops for any unknown page
    loadBlogs();
    loadWorkshops();
  }

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
  window.addPodcast = addPodcast;
  window.deletePodcast = window.deletePodcast;
  window.loadPodcasts = loadPodcasts;
  window.addStoreItem = addStoreItem;
  window.deleteStoreItem = window.deleteStoreItem;
  window.loadStoreItems = loadStoreItems;

  // Expose Firebase Firestore methods globally
  window.addDoc = addDoc;
  window.collection = collection;
  window.loadWorkshopRegistrations = loadWorkshopRegistrations;
  window.db = db; // Expose the Firestore database instance
});