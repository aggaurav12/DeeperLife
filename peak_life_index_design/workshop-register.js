import { db, addDoc, collection, getDoc, doc } from "./script.js";

// Extract workshop ID from URL
const urlParams = new URLSearchParams(window.location.search);
const workshopId = urlParams.get("id");

// Fetch workshop details
async function fetchWorkshopTitle(workshopId) {
    if (!workshopId) return "Unknown Workshop"; // Default fallback

    try {
        const workshopDoc = await getDoc(doc(db, "workshops", workshopId));
        if (workshopDoc.exists()) {
            return workshopDoc.data().title || "Untitled Workshop";
        }
    } catch (error) {
        console.error("❌ Error fetching workshop title:", error);
    }

    return "Unknown Workshop"; // Fallback if fetch fails
}

// Populate hidden workshop ID field
document.getElementById("workshop-id").value = workshopId;

// Handle form submission
document.getElementById("registration-form").addEventListener("submit", async function(event) {
    event.preventDefault();

    // Collect user details
    const userName = document.getElementById("user-name").value.trim();
    const userCity = document.getElementById("city").value.trim();
    const userState = document.getElementById("state").value.trim();
    const userCounty = document.getElementById("country").value.trim();
    const emailId = document.getElementById("email-id").value.trim();
    const contactNumber = document.getElementById("contact-number").value.trim();
    const specialRequest = document.getElementById("special-request").value.trim();

    if (!userName || !emailId || !contactNumber) {
        alert("⚠️ Please fill out all required fields!");
        return;
    }

    try {
        // Get workshop title before saving registration
        const workshopTitle = await fetchWorkshopTitle(workshopId);

        // Save data to Firestore
        await addDoc(collection(db, "registrations"), {
            workshopId,
            workshopTitle,  // ✅ Now storing workshop title
            userName,
            userCity,
            userCounty,
            userState,
            emailId,
            contactNumber,
            specialRequest,
            timestamp: new Date(),
        });

        alert(`✅ Successfully registered for "${workshopTitle}"!`);
        window.close(); // Close the pop-up window after successful submission
    } catch (error) {
        console.error("❌ Error registering:", error);
        alert("❌ Registration failed. Please try again.");
    }
});
