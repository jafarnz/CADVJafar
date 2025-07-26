// Utility functions for Local Gigs App
const Utils = {
  // Show loading state on buttons
  showLoading: function (button, text) {
    if (!button) return;
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.innerHTML =
      '<span class="spinner"></span> ' + (text || "Loading...");
  },

  // Hide loading state on buttons
  hideLoading: function (button, originalText) {
    if (!button) return;
    button.disabled = false;
    button.textContent =
      originalText || button.dataset.originalText || "Submit";
  },

  // Show success message
  showSuccess: function (message, containerId) {
    this.showMessage(message, "success", containerId);
  },

  // Show error message
  showError: function (message, containerId) {
    this.showMessage(message, "error", containerId);
  },

  // Show warning message
  showWarning: function (message, containerId) {
    this.showMessage(message, "warning", containerId);
  },

  // Generic message display
  showMessage: function (message, type, containerId) {
    const container = containerId
      ? document.getElementById(containerId)
      : document.body;
    if (!container) return;

    // Remove existing messages
    const existingMessages = container.querySelectorAll(".alert-message");
    existingMessages.forEach((msg) => msg.remove());

    // Create message element
    const messageEl = document.createElement("div");
    messageEl.className = "alert-message alert-" + type;
    messageEl.textContent = message;

    // Add close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "alert-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = function () {
      messageEl.remove();
    };
    messageEl.appendChild(closeBtn);

    // Insert at top of container
    container.insertBefore(messageEl, container.firstChild);

    // Auto remove after 5 seconds
    setTimeout(function () {
      if (messageEl.parentNode) {
        messageEl.remove();
      }
    }, 5000);
  },

  // Clear all messages
  clearMessages: function (containerId) {
    const container = containerId
      ? document.getElementById(containerId)
      : document.body;
    if (!container) return;
    const messages = container.querySelectorAll(".alert-message");
    messages.forEach((msg) => msg.remove());
  },

  // Format date
  formatDate: function (dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  },

  // Format time
  formatTime: function (timeString) {
    if (!timeString) return "";
    const time = new Date("1970-01-01T" + timeString + "Z");
    return time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  },

  // Format currency
  formatCurrency: function (amount) {
    if (typeof amount !== "number") return "$0.00";
    return "$" + amount.toFixed(2);
  },

  // Debounce function
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

  // Generic API call helper
  apiCall: async function (url, options) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Request failed" }));
        throw new Error(
          errorData.error || "Request failed with status " + response.status,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("API call failed:", error);
      throw error;
    }
  },

  // Validate email
  validateEmail: function (email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  // Validate password
  validatePassword: function (password) {
    return password && password.length >= CONFIG.VALIDATION.PASSWORD_MIN_LENGTH;
  },

  // Validate username
  validateUsername: function (username) {
    if (!username) return false;
    return (
      username.length >= CONFIG.VALIDATION.USERNAME_MIN_LENGTH &&
      username.length <= CONFIG.VALIDATION.USERNAME_MAX_LENGTH
    );
  },

  // Generate random ID
  generateId: function () {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // Sanitize HTML
  sanitizeHtml: function (str) {
    const temp = document.createElement("div");
    temp.textContent = str;
    return temp.innerHTML;
  },

  // Truncate text
  truncateText: function (text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substr(0, maxLength) + "...";
  },

  // Check if user is authenticated
  isAuthenticated: function () {
    return !!localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
  },

  // Get current user data
  getCurrentUser: function () {
    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  },

  // Logout user
  logout: function () {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.ID_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.PREFERENCES);
    window.location.href = "login.html";
  },

  // Redirect if not authenticated
  requireAuth: function () {
    if (!this.isAuthenticated()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  },

  // Format file size
  formatFileSize: function (bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  // Convert file to base64
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

  // Capitalize first letter
  capitalize: function (str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  // Get current user's location
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

  // Copy text to clipboard
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

  // Fallback for older browsers
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
      Utils.showSuccess("Copied to clipboard!");
    } catch (err) {
      Utils.showError("Failed to copy to clipboard");
    }

    document.body.removeChild(textArea);
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

      // Prepare upload data matching Lambda function expectations
      const uploadData = {
        fileData: base64Data,
        fileName: fileName,
        folder: folder,
        fileType: file.type,
        fileSize: file.size,
      };

      // Upload via API Gateway
      const url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.UPLOAD);
      const response = await Utils.apiCall(url, {
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
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Utils;
}
