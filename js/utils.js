// Utility functions for Local Gigs App
const Utils = {
  showLoading: function (button, text) {
    if (!button) return;
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.innerHTML =
      '<span class="spinner"></span> ' + (text || "Loading...");
  },

  hideLoading: function (button, originalText) {
    if (!button) return;
    button.disabled = false;
    button.textContent =
      originalText || button.dataset.originalText || "Submit";
  },

  showSuccess: function (message, containerId) {
    this.showMessage(message, "success", containerId);
  },

  showError: function (message, containerId) {
    this.showMessage(message, "error", containerId);
  },

  showWarning: function (message, containerId) {
    this.showMessage(message, "warning", containerId);
  },

  showMessage: function (message, type, containerId) {
    const container = containerId
      ? document.getElementById(containerId)
      : document.body;
    if (!container) return;

    const existingMessages = container.querySelectorAll(".alert-message");
    existingMessages.forEach((msg) => msg.remove());

    const messageEl = document.createElement("div");
    messageEl.className = "alert-message alert-" + type;
    messageEl.textContent = message;

    const closeBtn = document.createElement("button");
    closeBtn.className = "alert-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = function () {
      messageEl.remove();
    };
    messageEl.appendChild(closeBtn);

    container.insertBefore(messageEl, container.firstChild);

    setTimeout(function () {
      if (messageEl.parentNode) {
        messageEl.remove();
      }
    }, 5000);
  },

  clearMessages: function (containerId) {
    const container = containerId
      ? document.getElementById(containerId)
      : document.body;
    if (!container) return;
    const messages = container.querySelectorAll(".alert-message");
    messages.forEach((msg) => msg.remove());
  },

  formatDate: function (dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  },

  formatTime: function (timeString) {
    if (!timeString) return "";
    const time = new Date("1970-01-01T" + timeString + "Z");
    return time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  },

  formatDateTimeForInput: function (date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  formatCurrency: function (amount) {
    if (typeof amount !== "number") return "$0.00";
    return "$" + amount.toFixed(2);
  },

  debounce: function (func, wait) {
    let timeout;
    return function executedFunction() {
      const context = this;
      const args = arguments;
      const later = function () {
        timeout = null;
        func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  apiCall: async function (url, options = {}) {
    try {
      console.log(" Making API call to:", url);
      console.log(" Options:", options);

      const defaultOptions = {
        headers: CONFIG.getAuthHeaders(),
      };

      const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...options.headers,
        },
      };

      console.log(" Final request options:", mergedOptions);

      const response = await fetch(url, mergedOptions);
      console.log(" Response status:", response.status, response.statusText);

      let data;
      const contentType = response.headers.get("content-type");
      console.log(" Content-Type:", contentType);

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      console.log(" Response data:", data);

      if (!response.ok) {
        console.error("❌ API call failed with status:", response.status);

        if (response.status === 404) {
          throw new Error("User not found");
        }
        if (response.status === 500) {
          console.error("Server error (500):", data);
          throw new Error(
            data.error ||
              data.message ||
              "Internal server error. Please try again later.",
          );
        }
        if (response.status === 403) {
          console.error("Forbidden (403):", data);
          throw new Error("Access denied. Please check your authentication.");
        }
        if (response.status === 401) {
          console.error("Unauthorized (401):", data);
          throw new Error("Authentication required. Please log in again.");
        }
        throw new Error(
          data.error ||
            data.message ||
            `HTTP error! status: ${response.status}`,
        );
      }

      console.log("API call successful");
      return data;
    } catch (error) {
      console.error(" API call failed:", error);
      throw error;
    }
  },

  validateEmail: function (email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  validatePassword: function (password) {
    if (!password) {
      return {
        isValid: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumbers: false,
        hasMinLength: false,
        hasSpecialChar: false,
      };
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /\W/.test(password);
    const hasMinLength =
      password.length >= CONFIG.VALIDATION.PASSWORD_MIN_LENGTH;

    return {
      isValid: hasUpperCase && hasLowerCase && hasNumbers && hasMinLength,
      hasUpperCase: hasUpperCase,
      hasLowerCase: hasLowerCase,
      hasNumbers: hasNumbers,
      hasSpecialChar: hasSpecialChar,
      hasMinLength: hasMinLength,
    };
  },

  validateUsername: function (username) {
    if (!username) return false;
    return (
      username.length >= CONFIG.VALIDATION.USERNAME_MIN_LENGTH &&
      username.length <= CONFIG.VALIDATION.USERNAME_MAX_LENGTH
    );
  },

  generateId: function () {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  sanitizeHtml: function (str) {
    const temp = document.createElement("div");
    temp.textContent = str;
    return temp.innerHTML;
  },

  sanitizeInput: function (input) {
    const div = document.createElement("div");
    div.textContent = input;
    return div.innerHTML;
  },

  truncateText: function (text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substr(0, maxLength) + "...";
  },

  isAuthenticated: function () {
    const accessToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    const idToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN);

    if (!accessToken || !idToken) {
      return false;
    }

    try {
      const parts = idToken.split(".");
      if (parts.length !== 3) {
        console.error("Invalid JWT token format");
        this.logout();
        return false;
      }

      const payload = parts[1];
      const paddedPayload =
        payload + "=".repeat((4 - (payload.length % 4)) % 4);
      const decodedPayload = JSON.parse(atob(paddedPayload));

      if (decodedPayload.exp && decodedPayload.exp * 1000 < Date.now()) {
        console.log("Token expired, logging out");
        this.logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validating token:", error);
      this.logout();
      return false;
    }
  },

  getUserFromToken: function () {
    try {
      console.log(" Getting user from token...");
      const idToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN);

      if (!idToken) {
        console.log("No ID token found in localStorage");
        console.log(" Available localStorage keys:", Object.keys(localStorage));
        return null;
      }

      console.log("ID token found, length:", idToken.length);

      const parts = idToken.split(".");
      if (parts.length !== 3) {
        console.error(
          "❌ Invalid JWT token format - expected 3 parts, got:",
          parts.length,
        );
        return null;
      }

      const payload = parts[1];

      const paddedPayload =
        payload + "=".repeat((4 - (payload.length % 4)) % 4);
      const decodedPayload = atob(paddedPayload);
      const userData = JSON.parse(decodedPayload);

      console.log("Token decoded successfully");
      console.log(" Token payload:", userData);

      const userInfo = {
        username: userData["cognito:username"] || userData.sub,
        email: userData.email,
        preferredUsername: userData.preferred_username,
        sub: userData.sub,
        user_id: userData.sub,
      };

      console.log("User info extracted:", userInfo);
      return userInfo;
    } catch (error) {
      console.error("❌ Error decoding user token:", error);
      console.log(
        " Token that failed:",
        localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN),
      );
      return null;
    }
  },

  checkAuth: async function () {
    if (!this.isAuthenticated()) {
      return null;
    }
    return this.getUserFromToken();
  },

  getCurrentUser: function () {
    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
    if (userData) {
      let parsed = JSON.parse(userData);

      if (parsed && parsed.message && typeof parsed.message === "string") {
        try {
          parsed = JSON.parse(parsed.message);
        } catch (e) {
          console.error("Failed to parse user data message:", e);
        }
      }

      if (parsed && !parsed.user_id) {
        if (parsed.userID) {
          parsed.user_id = parsed.userID;
        } else if (parsed.sub) {
          parsed.user_id = parsed.sub;
        }
      }

      return parsed;
    }

    const tokenUser = this.getUserFromToken();
    if (tokenUser) {
      localStorage.setItem(
        CONFIG.STORAGE_KEYS.USER_DATA,
        JSON.stringify(tokenUser),
      );
      return tokenUser;
    }

    return null;
  },

  logout: function () {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.ID_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.PREFERENCES);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.SIGNUP_USERNAME);
    window.location.href = "index.html";
  },

  requireAuth: function () {
    if (!this.isAuthenticated()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  },

  show: function (elementId) {
    const element = document.getElementById(elementId);
    if (element) element.style.display = "block";
  },

  getJoinedEvents: function () {
    const userData = this.getCurrentUser();
    if (!userData) return [];

    const joinedEvents = localStorage.getItem(
      `joined_events_${userData.user_id}`,
    );
    return joinedEvents ? JSON.parse(joinedEvents) : [];
  },

  loadJoinedEventsFromAPI: async function () {
    try {
      const userData = this.getCurrentUser();
      if (!userData || !userData.user_id) {
        console.log("No user data for loading joined events");
        return [];
      }

      console.log(" Loading user profile with joined events from API...");
      const userUrl = CONFIG.buildApiUrl(`users/${userData.user_id}`);
      const response = await this.apiCall(userUrl, {
        method: "GET",
        headers: CONFIG.getAuthHeaders(),
      });

      console.log("User profile loaded from API:", response);

      let joinedEvents = [];
      if (response && response.joinedEvents) {
        joinedEvents = Array.isArray(response.joinedEvents)
          ? response.joinedEvents
          : [];
      } else if (response && response.message) {
        try {
          const parsed =
            typeof response.message === "string"
              ? JSON.parse(response.message)
              : response.message;
          joinedEvents = parsed.joinedEvents || [];
        } catch (parseError) {
          console.error("❌ Failed to parse user data:", parseError);
          joinedEvents = [];
        }
      }

      if (joinedEvents && joinedEvents.length >= 0) {
        localStorage.setItem(
          `joined_events_${userData.user_id}`,
          JSON.stringify(joinedEvents),
        );
        console.log(
          `Synced ${joinedEvents.length} joined events to localStorage`,
        );
      }

      return joinedEvents || [];
    } catch (error) {
      console.error("❌ Failed to load joined events from API:", error);

      return this.getJoinedEvents();
    }
  },

  addJoinedEvent: async function (eventData) {
    try {
      console.log(" Adding joined event via API...");

      if (!this.isAuthenticated()) {
        console.error("User not authenticated");
        return false;
      }

      const userData = this.getCurrentUser();
      if (!userData || !userData.user_id) {
        console.error("No user ID found in token");
        return false;
      }

      const currentJoinedEvents = await this.loadJoinedEventsFromAPI();
      const alreadyJoined = currentJoinedEvents.find(
        (e) => e.eventID === eventData.eventID,
      );
      if (alreadyJoined) {
        console.log("Event already joined");
        return false;
      }

      const joinedEvent = {
        eventID: eventData.eventID,
        name: eventData.name,
        eventDate: eventData.eventDate,
        eventTime: eventData.eventTime,
        venueID: eventData.venueID,
        description: eventData.description,
        imageUrl: eventData.imageUrl,
        joinedAt: new Date().toISOString(),
      };

      const updatedJoinedEvents = [...currentJoinedEvents, joinedEvent];

      const currentUserProfile = await this.apiCall(
        CONFIG.buildApiUrl(`users/${userData.user_id}`),
        {
          method: "GET",
          headers: CONFIG.getAuthHeaders(),
        },
      );

      const userUrl = CONFIG.buildApiUrl(`users/${userData.user_id}`);
      const updateData = {
        userID: userData.user_id,
        name: currentUserProfile.name || userData.name || "",
        email: currentUserProfile.email || userData.email || "",
        preferences: currentUserProfile.preferences || {},
        profilePictureUrl: currentUserProfile.profilePictureUrl || null,
        bio: currentUserProfile.bio || null,
        location: currentUserProfile.location || null,
        website: currentUserProfile.website || null,
        joinedEvents: updatedJoinedEvents,
      };

      const response = await this.apiCall(userUrl, {
        method: "PUT",
        headers: CONFIG.getAuthHeaders(),
        body: JSON.stringify(updateData),
      });

      console.log("Joined event added to user profile:", response);

      localStorage.setItem(
        `joined_events_${userData.user_id}`,
        JSON.stringify(updatedJoinedEvents),
      );

      this.showJoinSuccessNotification(eventData.name);

      return true;
    } catch (error) {
      console.error("❌ Failed to add joined event via API:", error);

      const joinedEvents = this.getJoinedEvents();
      const alreadyJoined = joinedEvents.find(
        (e) => e.eventID === eventData.eventID,
      );
      if (alreadyJoined) {
        return false;
      }

      const joinedEvent = {
        ...eventData,
        joinedAt: new Date().toISOString(),
      };

      joinedEvents.push(joinedEvent);
      localStorage.setItem(
        `joined_events_${userData.user_id}`,
        JSON.stringify(joinedEvents),
      );

      this.showJoinSuccessNotification(eventData.name);
      return true;
    }
  },

  removeJoinedEvent: async function (eventID) {
    const userData = this.getCurrentUser();
    if (!userData) return false;

    try {
      console.log(" Removing joined event via API...");

      const currentJoinedEvents = await this.loadJoinedEventsFromAPI();
      const filteredEvents = currentJoinedEvents.filter(
        (e) => e.eventID !== eventID,
      );

      const currentUserProfile = await this.apiCall(
        CONFIG.buildApiUrl(`users/${userData.user_id}`),
        {
          method: "GET",
          headers: CONFIG.getAuthHeaders(),
        },
      );

      const userUrl = CONFIG.buildApiUrl(`users/${userData.user_id}`);
      const updateData = {
        userID: userData.user_id,
        name: currentUserProfile.name || userData.name || "",
        email: currentUserProfile.email || userData.email || "",
        preferences: currentUserProfile.preferences || {},
        profilePictureUrl: currentUserProfile.profilePictureUrl || null,
        bio: currentUserProfile.bio || null,
        location: currentUserProfile.location || null,
        website: currentUserProfile.website || null,
        joinedEvents: filteredEvents,
      };

      const response = await this.apiCall(userUrl, {
        method: "PUT",
        headers: CONFIG.getAuthHeaders(),
        body: JSON.stringify(updateData),
      });

      console.log("Joined event removed from user profile:", response);

      localStorage.setItem(
        `joined_events_${userData.user_id}`,
        JSON.stringify(filteredEvents),
      );

      return true;
    } catch (error) {
      console.error("❌ Failed to remove joined event via API:", error);

      const joinedEvents = this.getJoinedEvents();
      const filteredEvents = joinedEvents.filter((e) => e.eventID !== eventID);
      localStorage.setItem(
        `joined_events_${userData.user_id}`,
        JSON.stringify(filteredEvents),
      );
      return true;
    }
  },

  showJoinSuccessNotification: function (eventName) {
    const notification = document.createElement("div");
    notification.className = "join-success-notification";
    notification.innerHTML = `
            <div class="notification-content">
                <i class="fa fa-check-circle"></i>
                <span>Successfully joined "${eventName}"!</span>
            </div>
        `;

    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            min-width: 300px;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
            border-left: 4px solid #2E7D32;
        `;

    if (!document.getElementById("notification-styles")) {
      const style = document.createElement("style");
      style.id = "notification-styles";
      style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .notification-content i {
                    font-size: 18px;
                }
            `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease-in";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  },

  isEventJoined: function (eventID) {
    const joinedEvents = this.getJoinedEvents();
    return joinedEvents.some((e) => e.eventID === eventID);
  },

  getJoinedEventsCount: function () {
    return this.getJoinedEvents().length;
  },

  hide: function (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add("hidden");
    }
  },

  toggle: function (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.toggle("hidden");
    }
  },

  formatFileSize: function (bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  fileToBase64: function (file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function (error) {
        reject(error);
      };
    });
  },

  capitalize: function (str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  getCurrentLocation: function () {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        function (position) {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        function (error) {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        },
      );
    });
  },

  copyToClipboard: function (text) {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(function () {
          Utils.showSuccess("Copied to clipboard!");
        })
        .catch(function () {
          Utils.fallbackCopyTextToClipboard(text);
        });
    } else {
      Utils.fallbackCopyTextToClipboard(text);
    }
  },

  fallbackCopyTextToClipboard: function (text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      this.showSuccess("Copied to clipboard!");
    } catch (err) {
      this.showError("Failed to copy to clipboard");
    }

    document.body.removeChild(textArea);
  },

  initializeNavigation: function () {
    console.log("Navigation helper initialized (URL rewriting disabled)");
  },

  renderImage: function (imageUrl, alt, className) {
    alt = alt || "";
    className = className || "";

    if (!imageUrl) {
      return (
        '<div class="no-image-placeholder ' +
        className +
        '">' +
        "<span>📷</span>" +
        "<p>Image unavailable</p>" +
        "</div>"
      );
    }

    let fullUrl = imageUrl;
    if (!imageUrl.startsWith("http")) {
      fullUrl =
        "https://local-gigs-static.s3.us-east-1.amazonaws.com/" + imageUrl;
    }

    return (
      '<img src="' +
      fullUrl +
      '" alt="' +
      alt +
      '" class="' +
      className +
      '" onerror="this.parentElement.innerHTML=\'<div class=\\\"no-image-placeholder\\\"><span>📷</span><p>Image unavailable</p></div>\'">'
    );
  },

  renderProfilePicture: function (imageUrl, userName, size) {
    userName = userName || "";
    size = size || "medium";

    const sizeClasses = {
      small: "w-8 h-8",
      medium: "w-16 h-16",
      large: "w-32 h-32",
    };

    const className =
      "profile-picture " + (sizeClasses[size] || sizeClasses.medium);

    if (!imageUrl) {
      return (
        '<div class="' +
        className +
        ' bg-gray-200 rounded-full flex items-center justify-center">' +
        '<span class="text-gray-500">' +
        (userName.charAt(0).toUpperCase() || "👤") +
        "</span>" +
        "</div>"
      );
    }

    return this.renderImage(
      imageUrl,
      userName + " profile picture",
      className + " rounded-full object-cover",
    );
  },

  uploadImageToS3: async function (file, folder) {
    folder = folder || "events";

    try {
      if (!file || !file.type.startsWith("image/")) {
        throw new Error("Please select a valid image file");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image must be smaller than 5MB");
      }

      const base64Result = await this.fileToBase64(file);
      const base64Data = base64Result.split(",")[1];

      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop();
      const fileName = folder + "_" + timestamp + "." + fileExtension;

      const uploadData = {
        fileData: base64Data,
        fileName: fileName,
        folder: folder,
        fileType: file.type,
        fileSize: file.size,
      };

      const url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.UPLOAD);
      const response = await this.apiCall(url, {
        method: "POST",
        headers: CONFIG.getAuthHeaders(),
        body: JSON.stringify(uploadData),
      });

      return response.imageUrl;
    } catch (error) {
      console.error("Image upload failed:", error);
      throw error;
    }
  },

  s3: {
    uploadProfilePicture: async function (file, userId) {
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop();
      const fileName =
        "profile_" + userId + "_" + timestamp + "." + fileExtension;
      return await Utils.uploadImage(file, "users");
    },

    uploadEventImage: async function (file, eventId) {
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop();
      const fileName =
        "event_" + eventId + "_" + timestamp + "." + fileExtension;
      return await Utils.uploadImage(file, "events");
    },

    // Upload venue image
    uploadVenueImage: async function (file, venueId) {
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop();
      const fileName =
        "venue_" + venueId + "_" + timestamp + "." + fileExtension;
      return await Utils.uploadImage(file, "venues");
    },

    // Create image preview
    createImagePreview: function (file, previewElementId) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const preview = document.getElementById(previewElementId);
        if (preview) {
          preview.src = e.target.result;
          preview.style.display = "block";
        }
      };
      reader.readAsDataURL(file);
    },

    // Validate image file
    validateImageFile: function (file) {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        throw new Error("Please select a JPEG, PNG, GIF, or WebP image");
      }

      if (file.size > maxSize) {
        throw new Error("Image must be smaller than 5MB");
      }

      return true;
    },

    // Setup image upload input
    setupImageUpload: function (inputId, previewId, onUploadCallback) {
      const input = document.getElementById(inputId);
      const preview = document.getElementById(previewId);

      if (!input) return;

      input.addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
          Utils.s3.validateImageFile(file);

          // Create preview
          if (preview) {
            Utils.s3.createImagePreview(file, previewId);
          }

          // Call callback if provided
          if (onUploadCallback) {
            onUploadCallback(file);
          }
        } catch (error) {
          alert(error.message);
          input.value = "";
          if (preview) {
            preview.style.display = "none";
          }
        }
      });
    },
  },

  // Fix navigation to ensure .html extensions
  initializeNavigation: function () {
    document.addEventListener("DOMContentLoaded", function () {
      // Fix all navigation links to include .html
      const navLinks = document.querySelectorAll("a[href]");
      navLinks.forEach(function (link) {
        const href = link.getAttribute("href");

        // Skip external links, hash links, and already correct links
        if (
          href.startsWith("http") ||
          href.startsWith("#") ||
          href.includes(".html") ||
          href === "/"
        ) {
          return;
        }

        // Fix page navigation links
        const pageLinks = [
          "dashboard",
          "events",
          "venues",
          "profile",
          "login",
          "signup",
        ];
        pageLinks.forEach(function (page) {
          if (href === page || href === "/" + page || href === "./" + page) {
            link.setAttribute("href", page + ".html");
          }
        });
      });

      // Add click handler to ensure navigation works
      document.addEventListener("click", function (e) {
        const link = e.target.closest("a");
        if (link && link.getAttribute("href")) {
          const href = link.getAttribute("href");

          // Force navigation for page links
          if (href.endsWith(".html") && !href.startsWith("http")) {
            e.preventDefault();
            window.location.href = href;
          }
        }
      });
    });
  },

  // Image rendering utilities
  renderImage: function (imageUrl, alt, className) {
    alt = alt || "";
    className = className || "";

    if (!imageUrl) {
      return (
        '<div class="no-image-placeholder ' +
        className +
        '">' +
        "<span>📷</span>" +
        "<p>Image unavailable</p>" +
        "</div>"
      );
    }

    // Handle S3 URLs
    let fullUrl = imageUrl;
    if (!imageUrl.startsWith("http")) {
      fullUrl =
        "https://local-gigs-static.s3.us-east-1.amazonaws.com/" + imageUrl;
    }

    return (
      '<img src="' +
      fullUrl +
      '" alt="' +
      alt +
      '" class="' +
      className +
      '" onerror="this.parentElement.innerHTML=\'<div class=\\\"no-image-placeholder\\\"><span>📷</span><p>Image unavailable</p></div>\'">'
    );
  },

  // Profile picture renderer
  renderProfilePicture: function (imageUrl, userName, size) {
    userName = userName || "";
    size = size || "medium";

    const sizeClasses = {
      small: "w-8 h-8",
      medium: "w-16 h-16",
      large: "w-32 h-32",
    };

    const className =
      "profile-picture " + (sizeClasses[size] || sizeClasses.medium);

    if (!imageUrl) {
      return (
        '<div class="' +
        className +
        ' bg-gray-200 rounded-full flex items-center justify-center">' +
        '<span class="text-gray-500">' +
        (userName.charAt(0).toUpperCase() || "👤") +
        "</span>" +
        "</div>"
      );
    }

    return Utils.renderImage(
      imageUrl,
      userName + " profile picture",
      className + " rounded-full object-cover",
    );
  },

  // Upload image to S3 via Lambda function
  uploadImage: async function (file, folder) {
    folder = folder || "events";

    try {
      // Validate file
      if (!file || !file.type.startsWith("image/")) {
        throw new Error("Please select a valid image file");
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image must be smaller than 5MB");
      }

      // Convert to base64
      const base64Result = await Utils.fileToBase64(file);
      const base64Data = base64Result.split(",")[1]; // Remove data:image/jpeg;base64, prefix

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop();
      const fileName = folder + "_" + timestamp + "." + fileExtension;

      // Get current user ID for upload tracking
      const currentUser = Utils.getCurrentUser();
      const userID = currentUser ? currentUser.sub : null;

      // Prepare upload data matching Lambda function expectations
      const uploadData = {
        bucket: "local-gigs-static",
        folder: folder,
        fileName: fileName,
        fileType: file.type,
        fileData: base64Data,
        fileSize: file.size,
        userID: userID, // Include user ID for tracking
      };

      console.log(" Uploading image:", {
        fileName: fileName,
        fileType: file.type,
        fileSize: file.size,
        folder: folder,
      });

      // Upload via API Gateway
      const url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.UPLOAD);
      const response = await Utils.apiCall(url, {
        method: "POST",
        headers: CONFIG.getAuthHeaders(),
        body: JSON.stringify(uploadData),
      });

      if (response && response.imageUrl) {
        console.log("Image uploaded successfully:", response.imageUrl);
        return response.imageUrl;
      } else if (response && response.url) {
        console.log("Image uploaded successfully:", response.url);
        return response.url;
      } else if (response && response.message) {
        // Handle wrapped response (Lambda returns stringified JSON in message field)
        try {
          const parsedResponse = JSON.parse(response.message);
          if (parsedResponse.imageUrl) {
            console.log(
              "Image uploaded successfully (parsed):",
              parsedResponse.imageUrl,
            );
            return parsedResponse.imageUrl;
          } else if (parsedResponse.url) {
            console.log(
              "Image uploaded successfully (parsed):",
              parsedResponse.url,
            );
            return parsedResponse.url;
          }
        } catch (parseError) {
          console.error(
            "❌ Failed to parse upload response message:",
            parseError,
          );
        }
      }

      console.error("❌ Unexpected upload response:", response);
      throw new Error("Upload succeeded but no image URL returned");
    } catch (error) {
      console.error("Image upload failed:", error);
      throw error;
    }
  },

  // S3 helper functions for specific use cases
  s3: {
    // Upload profile picture
    uploadProfilePicture: async function (file, userId) {
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop();
      const fileName =
        "profile_" + userId + "_" + timestamp + "." + fileExtension;
      return await Utils.uploadImage(file, "users");
    },

    // Upload event image
    uploadEventImage: async function (file, eventId) {
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop();
      const fileName =
        "event_" + eventId + "_" + timestamp + "." + fileExtension;
      return await Utils.uploadImage(file, "events");
    },

    // Upload venue image
    uploadVenueImage: async function (file, venueId) {
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop();
      const fileName =
        "venue_" + venueId + "_" + timestamp + "." + fileExtension;
      return await Utils.uploadImage(file, "venues");
    },

    // Create image preview
    createImagePreview: function (file, previewElementId) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const preview = document.getElementById(previewElementId);
        if (preview) {
          preview.src = e.target.result;
          preview.style.display = "block";
        }
      };
      reader.readAsDataURL(file);
    },

    // Validate image file
    validateImageFile: function (file) {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        throw new Error("Please select a JPEG, PNG, GIF, or WebP image");
      }

      if (file.size > maxSize) {
        throw new Error("Image must be smaller than 5MB");
      }

      return true;
    },

    // Setup image upload input
    setupImageUpload: function (inputId, previewId, onUploadCallback) {
      const input = document.getElementById(inputId);
      const preview = document.getElementById(previewId);

      if (!input) return;

      input.addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
          Utils.s3.validateImageFile(file);

          // Create preview
          if (preview) {
            Utils.s3.createImagePreview(file, previewId);
          }

          // Call callback if provided
          if (onUploadCallback) {
            onUploadCallback(file);
          }
        } catch (error) {
          alert(error.message);
          input.value = "";
          if (preview) {
            preview.style.display = "none";
          }
        }
      });
    },
  },

  // Upload image with specific ID correlation for better file organization
  uploadImageWithId: async function (file, folder, entityId) {
    folder = folder || "events";

    try {
      // Validate file
      if (!file || !file.type.startsWith("image/")) {
        throw new Error("Please select a valid image file");
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image must be smaller than 5MB");
      }

      // Convert to base64
      const base64Result = await Utils.fileToBase64(file);
      const base64Data = base64Result.split(",")[1]; // Remove data:image/jpeg;base64, prefix

      // Generate filename with entity ID correlation
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop();
      const fileName = `${folder}_${entityId}_${timestamp}.${fileExtension}`;

      // Get current user ID for upload tracking
      const currentUser = Utils.getCurrentUser();
      const userID = currentUser ? currentUser.sub : null;

      // Prepare upload data matching Lambda function expectations
      const uploadData = {
        bucket: "local-gigs-static",
        folder: folder,
        fileName: fileName,
        fileType: file.type,
        fileData: base64Data,
        fileSize: file.size,
        userID: userID, // Include user ID for tracking
        entityId: entityId, // Include entity ID for correlation
      };

      console.log(" Uploading image with ID correlation:", {
        fileName: fileName,
        fileType: file.type,
        fileSize: file.size,
        folder: folder,
        entityId: entityId,
      });

      // Upload via API Gateway
      const url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.UPLOAD);
      const response = await Utils.apiCall(url, {
        method: "POST",
        headers: CONFIG.getAuthHeaders(),
        body: JSON.stringify(uploadData),
      });

      console.log(" Upload response:", response);

      // Handle different response formats from Lambda
      if (response && response.imageUrl) {
        console.log(
          "Image uploaded successfully with ID correlation:",
          response.imageUrl,
        );
        return response.imageUrl;
      } else if (response && response.url) {
        console.log(
          "Image uploaded successfully with ID correlation:",
          response.url,
        );
        return response.url;
      } else if (response && response.message) {
        // Handle wrapped response (Lambda returns stringified JSON in message field)
        try {
          const parsedResponse = JSON.parse(response.message);
          if (parsedResponse.imageUrl) {
            console.log(
              "Image uploaded successfully with ID correlation (parsed):",
              parsedResponse.imageUrl,
            );
            return parsedResponse.imageUrl;
          } else if (parsedResponse.url) {
            console.log(
              "Image uploaded successfully with ID correlation (parsed):",
              parsedResponse.url,
            );
            return parsedResponse.url;
          }
        } catch (parseError) {
          console.error(
            "❌ Failed to parse upload response message:",
            parseError,
          );
        }
      }

      console.error("❌ Unexpected upload response:", response);
      throw new Error("Upload succeeded but no image URL returned");
    } catch (error) {
      console.error("Image upload with ID correlation failed:", error);
      throw error;
    }
  },

  // Enhanced image URL resolver for consistent display across the app
  resolveImageUrl: function (
    imageUrl,
    entityType = "venues",
    entityId = null,
    fallback = null,
  ) {
    console.log(" Resolving image URL:", { imageUrl, entityType, entityId });

    // Set appropriate fallback
    const defaultFallback =
      entityType === "events"
        ? "/api/placeholder/400/200"
        : "/api/placeholder/350/180";
    const finalFallback = fallback || defaultFallback;

    if (!imageUrl) {
      console.log("No image URL provided, using fallback");
      return finalFallback;
    }

    // Already a full HTTP/HTTPS URL
    if (imageUrl.startsWith("http")) {
      console.log("Full URL found:", imageUrl);
      return imageUrl;
    }

    // Handle S3 path patterns
    if (imageUrl.includes(`${entityType}_`)) {
      let resolvedUrl;

      if (imageUrl.startsWith(`${entityType}/`)) {
        // Format: venues/venues_123_timestamp.jpg
        resolvedUrl = `https://local-gigs-static.s3.us-east-1.amazonaws.com/${imageUrl}`;
      } else {
        // Format: venues_123_timestamp.jpg (just filename)
        resolvedUrl = `https://local-gigs-static.s3.us-east-1.amazonaws.com/${entityType}/${imageUrl}`;
      }

      console.log("S3 URL resolved:", resolvedUrl);
      return resolvedUrl;
    }

    // Try to construct expected filename if we have entity ID
    if (entityId) {
      console.log("Attempting to construct filename with entity ID:", entityId);
      // This is a fallback - ideally the database should store the correct URL
      return finalFallback;
    }

    console.log("Could not resolve image URL, using fallback");
    return finalFallback;
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Utils;
}
