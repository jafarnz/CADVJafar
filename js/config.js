const CONFIG = {
  API: {
    BASE_URL: "https://dxotswm9sh.execute-api.us-east-1.amazonaws.com",
    ENDPOINTS: {
      SIGNUP: "/auth/signup",
      LOGIN: "/auth/login",
      CONFIRM: "/auth/confirm",
      RESEND_CONFIRMATION: "/auth/resend-confirmation",

      GEOCODE: "/geocode",
      REVERSE_GEOCODE: "/reverse-geocode",

      LOCATION: "/location",

      USERS: "/users",
      USER_BY_ID: "/users",

      EVENTS: "/events",
      EVENT_BY_ID: "/events",

      VENUES: "/venues",
      VENUE_BY_ID: "/venues",

      UPLOAD: "/upload",
    },
  },

  COGNITO: {
    CLIENT_ID: "m9kv9bgjlbctat24f36ar236b",
    USER_POOL_ID: "us-east-1_vY3ORmav8",
    IDENTITY_POOL_ID: "us-east-1:965741ea-08fd-488f-ad78-775566391b0d",
    REGION: "us-east-1",
  },

  LOCATION: {
    PLACE_INDEX_NAME: "LocalGigsPlaces",
    REGION: "us-east-1",
    API_KEY:
      "v1.public.eyJqdGkiOiIwOGNmNmYwNy03NmUyLTRjMWUtOTllYi00M2JmMjk3MzcwZDAifTC7LOivLklvf_slA88w5njIcP4QXqhEVIdAwEwAXMzHGyson0LsiaV8VBsLL-XHwEzp6Bv8pP1V6UxyYi2A58GutcpTkfhU7XwCkW366-fe4ECXmlSQh0Ntdw8-2J02n-HVW3teNO8GZHtCPYL_ifGcsjmXfBZ0MjCBqrk1AMiGEYkyYOI4vF0haSGYnz2600AVfDab81Q2VYaYkz74vrvtZs-5lqETn8ejzpbNxv0aAGfFcgGVD0lmoNTXre6unG37VkcCrQ7PgKxeh9yxAEpVxiEHJi7Avgi9wtBeHWQEiuyLjJbONpsZ6Y_6YmAoXowWGbMXOGnx6bXiCTwUcSI.ZWU0ZWIzMTktMWRhNi00Mzg0LTllMzYtNzlmMDU3MjRmYTkx",
  },

  APP: {
    NAME: "Local Gigs",
    VERSION: "1.0.0",
    DEFAULT_COORDINATES: {
      LAT: 1.3521,
      LNG: 103.8198,
    },
    MAP_ZOOM: 11,
  },

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

  STORAGE_KEYS: {
    ACCESS_TOKEN: "localGigs_accessToken",
    ID_TOKEN: "localGigs_idToken",
    USER_DATA: "localGigs_userData",
    PREFERENCES: "localGigs_preferences",
    SIGNUP_USERNAME: "localGigs_signupUsername",
  },

  getAuthHeaders: function () {
    const token = localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  },

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

  validateAWSConfig: function () {
    const errors = [];

    // Check Identity Pool ID format
    const identityPoolRegex = /^[a-z0-9-]+:[a-f0-9-]{36}$/;
    if (!identityPoolRegex.test(this.COGNITO.IDENTITY_POOL_ID)) {
      errors.push("Invalid Identity Pool ID format");
    }

    if (this.COGNITO.IDENTITY_POOL_ID.includes("12345678")) {
      errors.push(
        "Please replace placeholder Identity Pool ID with actual value",
      );
    }

    if (!this.LOCATION.PLACE_INDEX_NAME || !this.LOCATION.API_KEY) {
      errors.push("Location Service place index name and API key are required");
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

  getLocationConfig: function () {
    return {
      region: this.LOCATION.REGION,
      placeIndexName: this.LOCATION.PLACE_INDEX_NAME,
      apiKey: this.LOCATION.API_KEY,
    };
  },

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
