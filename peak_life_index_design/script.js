document.addEventListener("DOMContentLoaded", function () {
  const adminPassword = "admin123";

  // Admin Login Functionality
  document
    .getElementById("admin-login-btn")
    ?.addEventListener("click", adminLogin);

  function adminLogin() {
    const enteredPassword = document.getElementById("admin-password").value;
    if (enteredPassword === adminPassword) {
      document.getElementById("admin-login").style.display = "none";
      document.getElementById("admin-panel").style.display = "block";
      alert("Welcome, Admin!");
      loadQueries();
      loadBlogs();
      loadWorkshops();
    } else {
      alert("Incorrect password! Please try again.");
    }
  }

  // Query Management
  function loadQueries() {
    const queryList = document.getElementById("query-list");
    const storedQueries = JSON.parse(localStorage.getItem("queries")) || [];
    queryList.innerHTML = "";
    storedQueries.forEach((query, index) => {
      queryList.innerHTML += `<div>
        <p><strong>Name:</strong> ${query.name}</p>
        <p><strong>School:</strong> ${query.school}</p>
        <p><strong>Email:</strong> ${query.email}</p>
        <p><strong>Message:</strong> ${query.message}</p>
        <button onclick="deleteQuery(${index})">Delete</button>
      </div><hr>`;
    });
  }

  function addQuery(event) {
    event.preventDefault();
    const name = document.getElementById("visitor-name").value;
    const school = document.getElementById("visitor-school").value;
    const email = document.getElementById("visitor-email").value;
    const message = document.getElementById("visitor-message").value;
    const queries = JSON.parse(localStorage.getItem("queries")) || [];

    queries.push({ name, school, email, message });
    localStorage.setItem("queries", JSON.stringify(queries));
    alert("Your query has been submitted successfully!");
    document.getElementById("home-inquiry-form")?.reset();
  }

  function deleteQuery(index) {
    const queries = JSON.parse(localStorage.getItem("queries")) || [];
    queries.splice(index, 1);
    localStorage.setItem("queries", JSON.stringify(queries));
    loadQueries();
  }

  // Blog Management
  function loadBlogs() {
    const blogPostsContainer = document.getElementById("blogPosts");
    const blogListContainer = document.getElementById("blog-list");
    const storedBlogs = JSON.parse(localStorage.getItem("blogs")) || [];

    if (blogPostsContainer) {
      blogPostsContainer.innerHTML = "";
      storedBlogs.forEach((blog) => {
        blogPostsContainer.innerHTML += `<div>
          <img src="${blog.image}" alt="${blog.title}">
          <h3>${blog.title}</h3>
          <p>${blog.content}</p>
        </div>`;
      });
    }

    if (blogListContainer) {
      blogListContainer.innerHTML = "";
      storedBlogs.forEach((blog, index) => {
        blogListContainer.innerHTML += `<div>
          <h3>${blog.title}</h3>
          <p>${blog.content}</p>
          <button onclick="deleteBlog(${index})">Delete</button>
        </div>`;
      });
    }
  }

  function addBlog() {
    const title = document.getElementById("blog-title").value;
    const content = document.getElementById("blog-content").value;
    const imageInput = document.getElementById("blog-image");
    const blogs = JSON.parse(localStorage.getItem("blogs")) || [];

    if (imageInput.files && imageInput.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        blogs.push({ title, content, image: e.target.result });
        localStorage.setItem("blogs", JSON.stringify(blogs));
        loadBlogs();
      };
      reader.readAsDataURL(imageInput.files[0]);
    } else {
      blogs.push({ title, content, image: "" });
      localStorage.setItem("blogs", JSON.stringify(blogs));
      loadBlogs();
    }
  }

  function deleteBlog(index) {
    const blogs = JSON.parse(localStorage.getItem("blogs")) || [];
    blogs.splice(index, 1);
    localStorage.setItem("blogs", JSON.stringify(blogs));
    loadBlogs();
  }

  // Workshop Management
  function loadWorkshops() {
    const workshopSchedule = document.getElementById("workshopSchedule");
    const workshopList = document.getElementById("workshop-list");
    const storedWorkshops = JSON.parse(localStorage.getItem("workshops")) || [];

    if (workshopSchedule) {
      workshopSchedule.innerHTML = "";
      storedWorkshops.forEach((workshop, index) => {
        workshopSchedule.innerHTML += `<tr>
          <td>${workshop.date}</td>
          <td>${workshop.title}</td>
          <td>${workshop.details}</td>
        </tr>`;
      });
    }

    if (workshopList) {
      workshopList.innerHTML = "";
      storedWorkshops.forEach((workshop, index) => {
        workshopList.innerHTML += `<div>
          <h3>${workshop.title}</h3>
          <p>${workshop.details}</p>
          <p>${workshop.date}</p>
          <button onclick="deleteWorkshop(${index})">Delete</button>
        </div>`;
      });
    }
  }

  function addWorkshop() {
    const title = document.getElementById("workshop-title").value;
    const details = document.getElementById("workshop-details").value;
    const date = document.getElementById("workshop-date").value;
    const workshops = JSON.parse(localStorage.getItem("workshops")) || [];

    workshops.push({ title, details, date });
    localStorage.setItem("workshops", JSON.stringify(workshops));
    loadWorkshops();
  }

  function deleteWorkshop(index) {
    const workshops = JSON.parse(localStorage.getItem("workshops")) || [];
    workshops.splice(index, 1);
    localStorage.setItem("workshops", JSON.stringify(workshops));
    loadWorkshops();
  }

  // Attach Form Event Listeners
  const homeInquiryForm = document.getElementById("home-inquiry-form");
  if (homeInquiryForm) {
    homeInquiryForm.addEventListener("submit", addQuery);
  }

  // Initial Data Loading
  loadBlogs();
  loadWorkshops();

  // Expose Functions Globally for Admin Access
  window.adminLogin = adminLogin;
  window.addQuery = addQuery;
  window.deleteQuery = deleteQuery;
  window.addBlog = addBlog;
  window.deleteBlog = deleteBlog;
  window.addWorkshop = addWorkshop;
  window.deleteWorkshop = deleteWorkshop;
});
