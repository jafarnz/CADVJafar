// Authentication module for Local Gigs App
const Auth = {
  // Initialize authentication
  init: function () {
    // Set up event listeners immediately
    this.setupEventListeners();

    // Delay auth state check to avoid race conditions
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.checkAuthState();
      });
    } else {
      // Document is already loaded
      setTimeout(() => {
        this.checkAuthState();
      }, 100);
    }
  },

  // Check current authentication state
  checkAuthState: function () {
    const isAuth = Utils.isAuthenticated();
    const currentPage = window.location.pathname.split("/").pop();

    console.log("🔐 Auth.checkAuthState:", {
      isAuthenticated: isAuth,
      currentPage: currentPage,
      accessToken: !!localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN),
      idToken: !!localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN),
    });

    // Redirect logic based on auth state and current page
    if (isAuth) {
      console.log("✅ User is authenticated");
      if (currentPage === "login.html" || currentPage === "signup.html") {
        console.log("📍 On login/signup page, checking profile setup...");
        // Check if user has completed profile setup
        this.checkProfileSetup();
      }
    } else {
      console.log("❌ User is NOT authenticated");
      // Not authenticated - redirect to login if on protected pages
      const protectedPages = [
        "dashboard.html",
        "profile.html",
        "events.html",
        "venues.html",
        "profile-setup.html",
      ];
      if (protectedPages.includes(currentPage)) {
        console.log("🚫 On protected page, redirecting to login...");
        window.location.href = "login.html";
      }
    }
  },

  // Check if user has completed profile setup
  checkProfileSetup: async function () {
    try {
      const user = Utils.getUserFromToken();
      console.log("👤 checkProfileSetup - User from token:", user);

      if (!user) {
        console.log("❌ No user found in token, redirecting to login");
        window.location.href = "login.html";
        return;
      }

      console.log("🔍 Checking user profile in backend...");
      // Check if user profile exists in backend
      const response = await Utils.apiCall(
        CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.USER_BY_ID, user.sub),
        { method: "GET" },
      );

      console.log("📡 Profile check response:", response);

      if (response && response.preferences) {
        // Profile exists, redirect to dashboard
        console.log("✅ Profile exists, redirecting to dashboard");
        window.location.href = "dashboard.html";
      } else {
        // Profile doesn't exist, redirect to profile setup
        console.log("📝 Profile missing, redirecting to profile setup");
        window.location.href = "profile-setup.html";
      }
    } catch (error) {
      console.error("❌ Error checking profile setup:", error);
      // If error (like 404), assume profile needs to be set up
      console.log("📝 Error occurred, redirecting to profile setup");
      window.location.href = "profile-setup.html";
    }
  },

  // Setup event listeners for auth forms
  setupEventListeners: function () {
    // Login form
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", this.handleLogin.bind(this));
    }

    // Signup form
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
      signupForm.addEventListener("submit", this.handleSignup.bind(this));
    }

    // Profile setup form
    const profileForm = document.getElementById("profileSetupForm");
    if (profileForm) {
      profileForm.addEventListener(
        "submit",
        this.handleProfileSetup.bind(this),
      );
    }

    // Logout buttons
    const logoutButtons = document.querySelectorAll(".logout-btn");
    logoutButtons.forEach((btn) => {
      btn.addEventListener("click", this.handleLogout.bind(this));
    });

    // Email confirmation form
    const confirmForm = document.getElementById("confirmForm");
    if (confirmForm) {
      confirmForm.addEventListener(
        "submit",
        this.handleEmailConfirmation.bind(this),
      );
    }
  },

  // Handle user login
  handleLogin: async function (event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const username = formData.get("username").trim();
    const password = formData.get("password");
    const submitBtn = event.target.querySelector('button[type="submit"]');

    // Validation
    if (!username || !password) {
      Utils.showError(
        "Please enter both username and password",
        "loginMessages",
      );
      return;
    }

    try {
      Utils.showLoading(submitBtn, "Signing in...");

      const response = await fetch(
        CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.LOGIN),
        {
          method: "POST",
          headers: CONFIG.getBasicHeaders(),
          body: JSON.stringify({
            username: username,
            password: password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      console.log("🔑 Login successful! Full API response:", data);
      console.log("🔑 Response data structure:", {
        hasAccessToken: !!data.accessToken,
        hasIdToken: !!data.idToken,
        hasAccessTokenCaps: !!data.AccessToken,
        hasIdTokenCaps: !!data.IdToken,
        hasAuthResult: !!data.AuthenticationResult,
        allKeys: Object.keys(data),
        accessTokenLength: data.accessToken ? data.accessToken.length : 0,
        idTokenLength: data.idToken ? data.idToken.length : 0,
      });

      // Store tokens - handle multiple possible response formats
      const accessToken =
        data.accessToken ||
        data.AccessToken ||
        (data.AuthenticationResult && data.AuthenticationResult.AccessToken);
      const idToken =
        data.idToken ||
        data.IdToken ||
        (data.AuthenticationResult && data.AuthenticationResult.IdToken);

      if (!accessToken || !idToken) {
        console.error("❌ Missing tokens in response:", data);
        throw new Error("Login response missing required tokens");
      }

      localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      localStorage.setItem(CONFIG.STORAGE_KEYS.ID_TOKEN, idToken);

      console.log("💾 Tokens stored in localStorage:", {
        accessTokenStored: !!localStorage.getItem(
          CONFIG.STORAGE_KEYS.ACCESS_TOKEN,
        ),
        idTokenStored: !!localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN),
        isAuthenticatedCheck: Utils.isAuthenticated(),
      });

      Utils.showSuccess("Login successful! Redirecting...", "loginMessages");

      // Check profile setup after successful login
      console.log("⏱️ Starting profile setup check in 1 second...");
      setTimeout(() => {
        console.log("🔄 Calling checkProfileSetup()...");
        this.checkProfileSetup();
      }, 1000);
    } catch (error) {
      console.error("Login error:", error);
      Utils.showError(
        error.message || "Login failed. Please try again.",
        "loginMessages",
      );
    } finally {
      Utils.hideLoading(submitBtn, "Sign In");
    }
  },

  // Handle user signup
  handleSignup: async function (event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const username = formData.get("username").trim();
    const email = formData.get("email").trim();
    const preferredUsername = formData.get("preferredUsername").trim();
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");
    const termsAccepted = formData.get("termsAccepted");
    const submitBtn = event.target.querySelector('button[type="submit"]');

    // Validation
    if (
      !username ||
      !email ||
      !preferredUsername ||
      !password ||
      !confirmPassword
    ) {
      Utils.showError("Please fill in all fields", "signupMessages");
      return;
    }

    if (!termsAccepted) {
      Utils.showError("Please accept the Terms of Service", "signupMessages");
      return;
    }

    if (!Utils.validateEmail(email)) {
      Utils.showError("Please enter a valid email address", "signupMessages");
      return;
    }

    const passwordValidation = Utils.validatePassword(password);
    if (!passwordValidation.isValid) {
      let errorMsg = "Password must be at least 8 characters and contain: ";
      const missing = [];
      if (!passwordValidation.hasUpperCase) missing.push("uppercase letter");
      if (!passwordValidation.hasLowerCase) missing.push("lowercase letter");
      if (!passwordValidation.hasNumbers) missing.push("number");
      errorMsg += missing.join(", ");
      Utils.showError(errorMsg, "signupMessages");
      return;
    }

    if (password !== confirmPassword) {
      Utils.showError("Passwords do not match", "signupMessages");
      return;
    }

    try {
      Utils.showLoading(submitBtn, "Creating account...");

      const response = await fetch(
        CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.SIGNUP),
        {
          method: "POST",
          headers: CONFIG.getBasicHeaders(),
          body: JSON.stringify({
            username: username,
            email: email,
            preferred_username: preferredUsername,
            password: password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Signup failed");
      }

      Utils.showSuccess(
        "Account created successfully! Please check your email for verification.",
        "signupMessages",
      );

      // Store signup data for confirmation page
      localStorage.setItem(CONFIG.STORAGE_KEYS.SIGNUP_USERNAME, username);

      // Redirect to confirmation page after delay
      setTimeout(() => {
        window.location.href = "confirm.html";
      }, 2000);
    } catch (error) {
      console.error("Signup error:", error);
      Utils.showError(
        error.message || "Signup failed. Please try again.",
        "signupMessages",
      );
    } finally {
      Utils.hideLoading(submitBtn, "Create Account");
    }
  },

  // Handle email confirmation
  handleEmailConfirmation: async function (event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const confirmationCode = formData.get("confirmationCode").trim();
    const username = localStorage.getItem(CONFIG.STORAGE_KEYS.SIGNUP_USERNAME);
    const submitBtn = event.target.querySelector('button[type="submit"]');

    if (!confirmationCode) {
      Utils.showError("Please enter the confirmation code", "confirmMessages");
      return;
    }

    if (!username) {
      Utils.showError(
        "Session expired. Please sign up again.",
        "confirmMessages",
      );
      setTimeout(() => (window.location.href = "signup.html"), 2000);
      return;
    }

    try {
      Utils.showLoading(submitBtn, "Confirming...");

      const response = await fetch(
        CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.CONFIRM),
        {
          method: "POST",
          headers: CONFIG.getBasicHeaders(),
          body: JSON.stringify({
            username: username,
            confirmationCode: confirmationCode,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Confirmation failed");
      }

      Utils.showSuccess(
        "Email confirmed successfully! Redirecting to login...",
        "confirmMessages",
      );

      // Clear session storage
      localStorage.removeItem(CONFIG.STORAGE_KEYS.SIGNUP_USERNAME);

      // Redirect to login
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    } catch (error) {
      console.error("Confirmation error:", error);
      Utils.showError(
        error.message || "Confirmation failed. Please try again.",
        "confirmMessages",
      );
    } finally {
      Utils.hideLoading(submitBtn, "Confirm Email");
    }
  },

  // Handle profile setup after initial signup
  handleProfileSetup: async function (event) {
    event.preventDefault();

    console.log("Profile setup started");
    console.log("Event target:", event.target);

    const user = Utils.getUserFromToken();
    if (!user) {
      console.error("No user found in token");
      window.location.href = "login.html";
      return;
    }

    console.log("User from token:", user);

    const formData = new FormData(event.target);
    const name = formData.get("name")?.trim();
    const selectedGenre = document.querySelector(
      'input[name="genre"]:checked',
    )?.value;
    const notifications = document.getElementById("notifications")?.checked;
    const shareLocation = document.getElementById("shareLocation")?.checked;

    console.log("Form data:", {
      name,
      selectedGenre,
      notifications,
      shareLocation,
    });

    // Try multiple ways to find the submit button with detailed logging
    let submitBtn = null;

    // Method 1: From event target
    submitBtn = event.target.querySelector('button[type="submit"]');
    console.log("Submit button from event target:", submitBtn);

    // Method 2: From form ID
    if (!submitBtn) {
      submitBtn = document.querySelector(
        '#profileSetupForm button[type="submit"]',
      );
      console.log("Submit button from form ID:", submitBtn);
    }

    // Method 3: Any submit button on page
    if (!submitBtn) {
      submitBtn = document.querySelector('button[type="submit"]');
      console.log("Submit button from document:", submitBtn);
    }

    // Method 4: Create a dummy button if none found
    if (!submitBtn) {
      console.warn("No submit button found, creating dummy for loading states");
      submitBtn = {
        tagName: "BUTTON",
        disabled: false,
        textContent: "",
        classList: { add: () => {}, remove: () => {} },
      };
    }

    console.log("Final submit button:", submitBtn);

    // Validation
    if (!name) {
      Utils.showError("Please enter your name", "profileMessages");
      return;
    }

    if (!selectedGenre) {
      Utils.showError("Please select your preferred genre", "profileMessages");
      return;
    }

    try {
      console.log("Starting API call...");
      Utils.showLoading(submitBtn, "Setting up profile...");

      // Create user profile
      const profileData = {
        userID: user.sub,
        email: user.email,
        name: name,
        preferences: {
          genre: selectedGenre,
          notifications: notifications,
          shareLocation: shareLocation,
        },
      };

      console.log("Profile data to send:", profileData);

      const apiUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.USERS);
      console.log("API URL:", apiUrl);

      const response = await Utils.apiCall(apiUrl, {
        method: "POST",
        body: JSON.stringify(profileData),
      });

      console.log("API response:", response);

      // Store user preferences locally
      localStorage.setItem(
        CONFIG.STORAGE_KEYS.USER_DATA,
        JSON.stringify(profileData),
      );
      localStorage.setItem(
        CONFIG.STORAGE_KEYS.PREFERENCES,
        JSON.stringify(profileData.preferences),
      );

      console.log("Data stored locally");

      Utils.showSuccess(
        "Profile setup complete! Welcome to Local Gigs!",
        "profileMessages",
      );

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 2000);
    } catch (error) {
      console.error("Profile setup error:", error);

      let errorMessage = "Profile setup failed. Please try again.";

      if (error.message.includes("CORS")) {
        errorMessage =
          "Configuration error: The users API endpoint needs CORS setup.";
      } else if (error.message.includes("Failed to fetch")) {
        errorMessage =
          "Unable to connect to the server. Please check if the /users endpoint is configured.";
      } else if (error.message.includes("404")) {
        errorMessage =
          "API endpoint not found. The /users endpoint may not be configured.";
      } else {
        errorMessage =
          error.message || "Profile setup failed. Please try again.";
      }

      Utils.showError(errorMessage, "profileMessages");
    } finally {
      console.log("Cleaning up loading state...");
      Utils.hideLoading(submitBtn, "Complete Setup");
    }
  },

  // Handle logout
  handleLogout: function (event) {
    event.preventDefault();

    if (confirm("Are you sure you want to log out?")) {
      Utils.logout();
    }
  },

  // Setup genre selection in profile setup
  setupGenreSelection: function () {
    const genreContainer = document.getElementById("genreOptions");
    if (!genreContainer) return;

    genreContainer.innerHTML = "";

    CONFIG.PREFERENCES.GENRES.forEach((genre) => {
      const genreOption = document.createElement("div");
      genreOption.className = "genre-option";
      genreOption.innerHTML = `
                <input type="radio" name="genre" value="${genre}" id="genre-${genre}" hidden>
                <label for="genre-${genre}">${genre.charAt(0).toUpperCase() + genre.slice(1)}</label>
            `;

      genreOption.addEventListener("click", () => {
        // Remove selected class from all options
        document.querySelectorAll(".genre-option").forEach((opt) => {
          opt.classList.remove("selected");
        });

        // Add selected class to clicked option
        genreOption.classList.add("selected");

        // Select the radio button
        genreOption.querySelector('input[type="radio"]').checked = true;
      });

      genreContainer.appendChild(genreOption);
    });
  },

  // Resend confirmation code
  resendConfirmationCode: async function () {
    const username = localStorage.getItem(CONFIG.STORAGE_KEYS.SIGNUP_USERNAME);
    if (!username) {
      Utils.showError("Session expired. Please sign up again.");
      return;
    }

    try {
      const response = await fetch(
        CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.RESEND_CONFIRMATION),
        {
          method: "POST",
          headers: CONFIG.getBasicHeaders(),
          body: JSON.stringify({ username: username }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend confirmation code");
      }

      Utils.showSuccess("Confirmation code resent to your email.");
    } catch (error) {
      console.error("Resend confirmation error:", error);
      Utils.showError("Failed to resend confirmation code. Please try again.");
    }
  },
};

// Initialize auth when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  Auth.init();

  // Setup genre selection if on profile setup page
  if (window.location.pathname.includes("profile-setup.html")) {
    Auth.setupGenreSelection();
  }

  // Setup resend confirmation link
  const resendLink = document.getElementById("resendConfirmation");
  if (resendLink) {
    resendLink.addEventListener("click", function (e) {
      e.preventDefault();
      Auth.resendConfirmationCode();
    });
  }
});
