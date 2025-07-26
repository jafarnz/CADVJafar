// Utility functions for Local Gigs App

const Utils = {
  // Show loading spinner or disable button
  showLoading: function (element, text = "Loading...") {
    if (element && element.tagName === "BUTTON") {
      element.disabled = true;
      element.textContent = text;
      element.classList.add("loading");
    }
  },

  // Hide loading spinner or re-enable button
  hideLoading: function (element, originalText = "Submit") {
    if (element && element.tagName === "BUTTON") {
      element.disabled = false;
      element.textContent = originalText;
      element.classList.remove("loading");
    }
  },

  // Show error message
  showError: function (message, containerId = null) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message fade-in";
    errorDiv.textContent = message;

    if (containerId) {
      const container = document.getElementById(containerId);
      if (container) {
        // Remove existing error messages
        const existingErrors = container.querySelectorAll(".error-message");
        existingErrors.forEach((error) => error.remove());

        container.appendChild(errorDiv);
      }
    } else {
      // Show as alert if no container specified
      alert(message);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  },

  // Show success message
  showSuccess: function (message, containerId = null) {
    const successDiv = document.createElement("div");
    successDiv.className = "success-message fade-in";
    successDiv.textContent = message;

    if (containerId) {
      const container = document.getElementById(containerId);
      if (container) {
        // Remove existing messages
        const existingMessages = container.querySelectorAll(
          ".success-message, .error-message",
        );
        existingMessages.forEach((msg) => msg.remove());

        container.appendChild(successDiv);
      }
    }

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 3000);
  },

  // Format date for display
  formatDate: function (dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-SG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  },

  // Format time for display
  formatTime: function (timeString) {
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString("en-SG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  },

  // Format datetime for input fields
  formatDateTimeForInput: function (date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  // Validate email format
  validateEmail: function (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate password strength
  validatePassword: function (password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonalphas = /\W/.test(password);

    return {
      isValid:
        password.length >= minLength &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumbers,
      minLength: password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar: hasNonalphas,
    };
  },

  // Sanitize input to prevent XSS
  sanitizeInput: function (input) {
    const div = document.createElement("div");
    div.textContent = input;
    return div.innerHTML;
  },

  // Generate unique ID
  generateId: function (prefix = "id") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Calculate distance between two coordinates
  calculateDistance: function (lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in kilometers
    return Math.round(d * 100) / 100; // Round to 2 decimal places
  },

  // Convert degrees to radians
  deg2rad: function (deg) {
    return deg * (Math.PI / 180);
  },

  // Debounce function for search inputs
  debounce: function (func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  },

  // Check if user is authenticated
  isAuthenticated: function () {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return false;

    try {
      // Basic token validation (check if it's expired)
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      console.error("Error validating token:", error);
      return false;
    }
  },

  // Check authentication and return user data
  checkAuth: async function () {
    if (!this.isAuthenticated()) {
      return null;
    }
    return this.getUserFromToken();
  },

  // Get user data from token
  getUserFromToken: function () {
    const idToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN);
    if (!idToken) return null;

    try {
      const payload = JSON.parse(atob(idToken.split(".")[1]));
      return {
        username: payload["cognito:username"] || payload.sub,
        email: payload.email,
        preferredUsername: payload.preferred_username,
        sub: payload.sub,
      };
    } catch (error) {
      console.error("Error parsing token:", error);
      return null;
    }
  },

  // Logout user
  logout: function () {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.ID_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.PREFERENCES);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.SIGNUP_USERNAME);
    window.location.href = "index.html";
  },

  // Redirect to login if not authenticated
  requireAuth: function () {
    if (!this.isAuthenticated()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  },

  // Show/hide elements
  show: function (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.remove("hidden");
    }
  },

  hide: function (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add("hidden");
    }
  },

  // Toggle element visibility
  toggle: function (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.toggle("hidden");
    }
  },

  // Make API calls with proper error handling
  apiCall: async function (url, options = {}) {
    try {
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

      const response = await fetch(url, mergedOptions);

      // Handle non-JSON responses
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 404) {
          throw new Error("User not found");
        }
        throw new Error(
          data.error ||
            data.message ||
            `HTTP error! status: ${response.status}`,
        );
      }

      return data;
    } catch (error) {
      console.error("API call failed:", error);
      throw error;
    }
  },

  // Copy text to clipboard
  copyToClipboard: function (text) {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          this.showSuccess("Copied to clipboard!");
        })
        .catch(() => {
          this.fallbackCopyTextToClipboard(text);
        });
    } else {
      this.fallbackCopyTextToClipboard(text);
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
      this.showSuccess("Copied to clipboard!");
    } catch (err) {
      this.showError("Failed to copy to clipboard");
    }

    document.body.removeChild(textArea);
  },

  // Get current user's location
  getCurrentLocation: function () {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
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

  // Format file size
  formatFileSize: function (bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  // Convert image file to base64
  fileToBase64: function (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  },

  // Capitalize first letter
  capitalize: function (str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  // Upload image to S3 via backend
  uploadImage: async function (file, folder = "events") {
    try {
      const base64 = await this.fileToBase64(file);
      const base64Data = base64.split(",")[1]; // Remove data:image/jpeg;base64, prefix

      const url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.UPLOAD);
      const response = await this.apiCall(url, {
        method: "POST",
        headers: CONFIG.getAuthHeaders(),
        body: JSON.stringify({
          image: base64Data,
          folder: folder,
          filename: file.name,
        }),
      });

      return response.imageUrl;
    } catch (error) {
      console.error("Image upload failed:", error);
      throw error;
    }
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Utils;
}
