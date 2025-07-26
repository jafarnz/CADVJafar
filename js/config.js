// Configuration file for Local Gigs App
const CONFIG = {
  // API Gateway Configuration
  API: {
    BASE_URL: "https://dxotswm9sh.execute-api.us-east-1.amazonaws.com",
    ENDPOINTS: {
      // Auth endpoints
      SIGNUP: "/auth/signup",
      LOGIN: "/auth/login",
      CONFIRM: "/auth/confirm",
      RESEND_CONFIRMATION: "/auth/resend-confirmation",

      // Geocoding endpoints
      GEOCODE: "/geocode",
      REVERSE_GEOCODE: "/reverse-geocode",

      // User endpoints
      USERS: "/users",
      USER_BY_ID: "/users",

      // Event endpoints
      EVENTS: "/events",
      EVENT_BY_ID: "/events",

      // Venue endpoints
      VENUES: "/venues",
      VENUE_BY_ID: "/venues",

      // Upload endpoint
      UPLOAD: "/upload",
    },
  },

  // AWS Cognito Configuration
  // NOTE: You MUST replace the IDENTITY_POOL_ID below with your actual AWS Cognito Identity Pool ID
  // This is required for AWS Location Service to work properly
  // Example: "us-east-1:12345678-1234-1234-1234-123456789012"
  COGNITO: {
    CLIENT_ID: "m9kv9bgjlbctat24f36ar236b",
    USER_POOL_ID: "us-east-1_vY3ORmav8",
    IDENTITY_POOL_ID: "us-east-1:965741ea-08fd-488f-ad78-775566391b0d",
    REGION: "us-east-1",
  },

  // Amazon Location Service Configuration
  // NOTE: Ensure these resources exist in your AWS account before enabling map features
  LOCATION: {
    PLACE_INDEX_NAME: "LocalGigsPlaces", // Must exist in AWS Location Service
    MAP_NAME: "LocalGigsMap", // Must exist in AWS Location Service
    REGION: "us-east-1",
    IDENTITY_POOL_ID: "us-east-1:965741ea-08fd-488f-ad78-775566391b0d", // Configured Identity Pool ID
  },

  // App Configuration
  APP: {
    NAME: "Local Gigs",
    VERSION: "1.0.0",
    DEFAULT_COORDINATES: {
      LAT: 1.3521, // Singapore default
      LNG: 103.8198,
    },
    MAP_ZOOM: 11,
  },

  // User preferences options
  PREFERENCES: {
    GENRES: [
      "rock",
      "pop",
      "jazz",
      "electronic",
      "hip-hop",
      "hiphop",
      "indie",
      "metal",
      "country",
      "reggae",
      "classical",
      "soul",
      "rnb",
    ],
  },

  // Local Storage Keys
  STORAGE_KEYS: {
    ACCESS_TOKEN: "localGigs_accessToken",
    ID_TOKEN: "localGigs_idToken",
    USER_DATA: "localGigs_userData",
    PREFERENCES: "localGigs_preferences",
    SIGNUP_USERNAME: "localGigs_signupUsername",
  },

  // API Headers
  getAuthHeaders: function () {
    const token = localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  },

  // API Headers without auth (for login/signup)
  getBasicHeaders: function () {
    return {
      "Content-Type": "application/json",
    };
  },

  // Helper method to build full API URLs
  buildApiUrl: function (endpoint, pathParam = null) {
    let url = this.API.BASE_URL + endpoint;
    if (pathParam) {
      url += "/" + pathParam;
    }
    return url;
  },

  // Validate AWS configuration
  validateAWSConfig: function () {
    const errors = [];

    // Check Identity Pool ID format
    const identityPoolRegex = /^[a-z0-9-]+:[a-f0-9-]{36}$/;
    if (!identityPoolRegex.test(this.COGNITO.IDENTITY_POOL_ID)) {
      errors.push("Invalid Identity Pool ID format");
    }

    // Check if placeholder values are still being used
    if (this.COGNITO.IDENTITY_POOL_ID.includes("12345678")) {
      errors.push(
        "Please replace placeholder Identity Pool ID with actual value",
      );
    }

    // Check required Location Service settings
    if (!this.LOCATION.PLACE_INDEX_NAME || !this.LOCATION.MAP_NAME) {
      errors.push("Location Service resource names are required");
    }

    if (errors.length > 0) {
      console.error("AWS Configuration Errors:", errors);
      return false;
    }

    console.log("AWS configuration validation passed");
    return true;
  },

  // Generate unique IDs for events and venues
  generateEventID: function () {
    return Math.floor(Math.random() * 9000) + 1000; // 4-digit random number
  },

  generateVenueID: function () {
    return Math.floor(Math.random() * 9000) + 1000; // 4-digit random number
  },

  // Get Location Service configuration
  getLocationConfig: function () {
    return {
      region: this.LOCATION.REGION,
      placeIndexName: this.LOCATION.PLACE_INDEX_NAME,
      mapName: this.LOCATION.MAP_NAME,
      identityPoolId: this.LOCATION.IDENTITY_POOL_ID,
    };
  },

  // Validation rules
  VALIDATION: {
    PASSWORD_MIN_LENGTH: 8,
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 20,
    NAME_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 500,
    ADDRESS_MAX_LENGTH: 200,
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
