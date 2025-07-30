const Auth = {
  init: function () {
    this.setupEventListeners();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.checkAuthState();
      });
    } else {
      setTimeout(() => {
        this.checkAuthState();
      }, 100);
    }
  },

  checkAuthState: function () {
    const isAuth = Utils.isAuthenticated();
    const currentPage = window.location.pathname.split("/").pop();

    console.log("Auth.checkAuthState:", {
      isAuthenticated: isAuth,
      currentPage: currentPage,
      accessToken: !!localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN),
      idToken: !!localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN),
      userFromToken: Utils.getUserFromToken(),
      allStorageKeys: Object.keys(localStorage),
      relevantStorage: {
        accessToken: localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN)
          ? `${localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN).substring(0, 20)}...`
          : null,
        idToken: localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN)
          ? `${localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN).substring(0, 20)}...`
          : null,
      },
    });

    if (isAuth) {
      console.log("User is authenticated");
      if (currentPage === "login.html" || currentPage === "signup.html") {
        console.log(" On login/signup page, checking profile setup...");

        this.checkProfileSetup();
      }
    } else {
      console.log(" User is NOT authenticated");

      const protectedPages = [
        "dashboard.html",
        "profile.html",
        "events.html",
        "venues.html",
        "profile-setup.html",
      ];
      if (protectedPages.includes(currentPage)) {
        console.log(" On protected page, redirecting to login...");
        window.location.href = "login.html";
      }
    }
  },

  checkProfileSetup: async function () {
    console.log(" checkProfileSetup() called");
    console.log(" Current authentication state:", {
      isAuthenticated: Utils.isAuthenticated(),
      hasAccessToken: !!localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN),
      hasIdToken: !!localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN),
    });

    try {
      const user = Utils.getUserFromToken();
      console.log("checkProfileSetup - User from token:", user);

      if (!user || !user.email) {
        console.log("No user email found in token, redirecting to login");
        console.log(" Token details:", {
          idToken: localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN)
            ? "EXISTS"
            : "MISSING",
          tokenLength: localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN)
            ? localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN).length
            : 0,
        });
        window.location.href = "login.html";
        return;
      }

      const userID = user.sub;
      console.log(" Checking profile for user ID:", userID);

      const userApiUrl = CONFIG.buildApiUrl(
        `${CONFIG.API.ENDPOINTS.USER_BY_ID}/${encodeURIComponent(userID)}`,
      );
      console.log("Making API call to:", userApiUrl);

      const response = await Utils.apiCall(userApiUrl, {
        method: "GET",
        headers: CONFIG.getAuthHeaders(),
      });

      console.log("Profile check response:", response);

      let userData = null;
      if (response && response.message) {
        try {
          userData = JSON.parse(response.message);
          console.log("Parsed user data:", userData);
        } catch (parseError) {
          console.error("❌ Failed to parse user data:", parseError);
          userData = response;
        }
      } else {
        userData = response;
      }

      if (userData && userData.email && userData.name && userData.preferences) {
        console.log("Profile setup complete, redirecting to dashboard");

        localStorage.setItem(
          CONFIG.STORAGE_KEYS.USER_DATA,
          JSON.stringify(userData),
        );
        if (userData.preferences) {
          localStorage.setItem(
            CONFIG.STORAGE_KEYS.PREFERENCES,
            JSON.stringify(userData.preferences),
          );
        }

        console.log(" Redirecting to dashboard.html...");
        window.location.href = "dashboard.html";
      } else {
        console.log("Profile setup incomplete, redirecting to profile setup");
        console.log("Missing fields:", {
          hasEmail: !!(userData && userData.email),
          hasName: !!(userData && userData.name),
          hasPreferences: !!(userData && userData.preferences),
          userData: userData,
        });
        console.log("Redirecting to profile-setup.html...");
        window.location.href = "profile-setup.html";
      }
    } catch (error) {
      console.error(" Error checking profile setup:", error);
      console.error(" Error details:", {
        message: error.message,
        stack: error.stack,
        status: error.status,
      });

      if (error.message && error.message.includes("404")) {
        console.log(
          " User profile not found (404), redirecting to profile setup",
        );
        console.log(" Redirecting to profile-setup.html...");
        window.location.href = "profile-setup.html";
      } else {
        console.log(
          " Error occurred, redirecting to profile setup as fallback",
        );
        console.log(" Redirecting to profile-setup.html due to error...");
        window.location.href = "profile-setup.html";
      }
    }
  },

  getCurrentUserEmail: function () {
    try {
      const user = Utils.getUserFromToken();
      return user && user.email ? user.email : null;
    } catch (error) {
      console.error("Error getting user email:", error);
      return null;
    }
  },

  setupEventListeners: function () {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", this.handleLogin.bind(this));
    }

    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
      signupForm.addEventListener("submit", this.handleSignup.bind(this));
    }

    const profileForm = document.getElementById("profileSetupForm");
    if (profileForm) {
      profileForm.addEventListener(
        "submit",
        this.handleProfileSetup.bind(this),
      );
    }

    const logoutButtons = document.querySelectorAll(".logout-btn");
    logoutButtons.forEach((btn) => {
      btn.addEventListener("click", this.handleLogout.bind(this));
    });

    const confirmForm = document.getElementById("confirmForm");
    if (confirmForm) {
      confirmForm.addEventListener(
        "submit",
        this.handleEmailConfirmation.bind(this),
      );
    }
  },

  handleLogin: async function (event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const username = formData.get("username").trim();
    const password = formData.get("password");
    const submitBtn = event.target.querySelector('button[type="submit"]');

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
        console.error(" Login API failed:", {
          status: response.status,
          statusText: response.statusText,
          data: data,
        });
        throw new Error(data.error || "Login failed");
      }

      console.log(" Login successful! Full API response:", data);
      console.log("Response data structure:", {
        hasAccessToken: !!data.accessToken,
        hasIdToken: !!data.idToken,
        hasAccessTokenCaps: !!data.AccessToken,
        hasIdTokenCaps: !!data.IdToken,
        hasAuthResult: !!data.AuthenticationResult,
        allKeys: Object.keys(data),
        accessTokenLength: data.accessToken ? data.accessToken.length : 0,
        idTokenLength: data.idToken ? data.idToken.length : 0,
      });

      const accessToken =
        data.accessToken ||
        data.AccessToken ||
        (data.AuthenticationResult && data.AuthenticationResult.AccessToken);
      const idToken =
        data.idToken ||
        data.IdToken ||
        (data.AuthenticationResult && data.AuthenticationResult.IdToken);

      console.log("Token extraction results:", {
        accessToken: accessToken
          ? `${accessToken.substring(0, 20)}...`
          : "MISSING",
        idToken: idToken ? `${idToken.substring(0, 20)}...` : "MISSING",
        accessTokenLength: accessToken ? accessToken.length : 0,
        idTokenLength: idToken ? idToken.length : 0,
      });

      if (!accessToken || !idToken) {
        console.error("❌ Missing tokens in response:", data);
        throw new Error("Login response missing required tokens");
      }

      // Store tokens
      console.log("Storing tokens in localStorage...");
      localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      localStorage.setItem(CONFIG.STORAGE_KEYS.ID_TOKEN, idToken);

      // Verify storage immediately
      const storedAccessToken = localStorage.getItem(
        CONFIG.STORAGE_KEYS.ACCESS_TOKEN,
      );
      const storedIdToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN);

      console.log("Token storage verification:", {
        accessTokenStored: !!storedAccessToken,
        idTokenStored: !!storedIdToken,
        accessTokenMatches: storedAccessToken === accessToken,
        idTokenMatches: storedIdToken === idToken,
        storageKeys: {
          accessKey: CONFIG.STORAGE_KEYS.ACCESS_TOKEN,
          idKey: CONFIG.STORAGE_KEYS.ID_TOKEN,
        },
      });

      // Test authentication immediately after storage
      const isAuthNow = Utils.isAuthenticated();
      console.log("Authentication test after token storage:", {
        isAuthenticated: isAuthNow,
        userFromToken: Utils.getUserFromToken(),
      });

      Utils.showSuccess("Login successful! Redirecting...", "loginMessages");

      // Check profile setup after successful login
      console.log(" Starting profile setup check in 1 second...");
      setTimeout(() => {
        console.log("About to call checkProfileSetup()...");
        console.log("Current auth state before profile check:", {
          isAuthenticated: Utils.isAuthenticated(),
          hasAccessToken: !!localStorage.getItem(
            CONFIG.STORAGE_KEYS.ACCESS_TOKEN,
          ),
          hasIdToken: !!localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN),
          userFromToken: Utils.getUserFromToken(),
        });
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
    const nameField = formData.get("name");
    const name = nameField && nameField.trim();
    const selectedGenreEl = document.querySelector(
      'input[name="genre"]:checked',
    );
    const selectedGenre = selectedGenreEl && selectedGenreEl.value;
    const notificationsEl = document.getElementById("notifications");
    const notifications = notificationsEl && notificationsEl.checked;
    const shareLocationEl = document.getElementById("shareLocation");
    const shareLocation = shareLocationEl && shareLocationEl.checked;

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

      // Check if there's an existing profile to preserve data
      let existingProfile = null;
      try {
        const checkUrl = CONFIG.buildApiUrl(
          CONFIG.API.ENDPOINTS.USER_BY_ID,
          user.sub,
        );
        existingProfile = await Utils.apiCall(checkUrl, { method: "GET" });
        console.log("Existing profile found:", existingProfile);
      } catch (error) {
        console.log("No existing profile found, creating new one");
      }

      // Create user profile
      const profileData = {
        userID: user.sub,
        email: user.email,
        name: name,
        profileSetupComplete: true,
        preferences: {
          genre: selectedGenre,
          notifications: notifications,
          shareLocation: shareLocation,
        },
      };

      // Preserve any existing data not covered in setup
      if (existingProfile) {
        // Preserve any additional fields that might exist
        Object.keys(existingProfile).forEach((key) => {
          if (!profileData.hasOwnProperty(key) && key !== "preferences") {
            profileData[key] = existingProfile[key];
          }
        });

        // Merge preferences, preserving any existing ones not in setup
        if (existingProfile.preferences) {
          Object.keys(existingProfile.preferences).forEach((key) => {
            if (!profileData.preferences.hasOwnProperty(key)) {
              profileData.preferences[key] = existingProfile.preferences[key];
            }
          });
        }
      }

      console.log("Profile data to send:", profileData);

      // Use the correct endpoint based on whether profile exists
      let apiUrl, method;
      if (existingProfile) {
        // Update existing profile using PUT /users/{userID}
        apiUrl = CONFIG.buildApiUrl(
          `${CONFIG.API.ENDPOINTS.USER_BY_ID}/${encodeURIComponent(userEmail)}`,
        );
        method = "PUT";
      } else {
        // Create new profile using POST /users
        apiUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.USERS);
        method = "POST";
      }

      console.log("API URL:", apiUrl);
      console.log("Using HTTP method:", method);

      const response = await Utils.apiCall(apiUrl, {
        method: method,
        headers: CONFIG.getAuthHeaders(),
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
