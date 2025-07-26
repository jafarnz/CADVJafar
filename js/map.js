// Map integration for Amazon Location Service ONLY
const MapService = {
  map: null,
  markers: [],
  userLocationMarker: null,
  isInitialized: false,
  authHelper: null,

  // Initialize the map
  init: async function (containerId = "map") {
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error("Map container not found:", containerId);
        return false;
      }

      // Validate AWS configuration before proceeding
      if (!CONFIG.validateAWSConfig()) {
        throw new Error(
          "AWS configuration validation failed. Check console for details.",
        );
      }

      console.log(
        "Starting map initialization with validated AWS configuration...",
      );

      // Load required SDKs from CDN
      await this.loadMapLibreSDK();
      await this.loadAwsSDK();

      // Initialize with Amazon Location Service
      await this.initializeWithLocationService(containerId);

      // Add map controls
      this.map.addControl(new maplibregl.NavigationControl(), "top-left");
      this.map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
        }),
        "top-left",
      );

      // Wait for map to be fully loaded
      await new Promise((resolve) => {
        this.map.on("load", () => {
          console.log("Map tiles loaded successfully");
          this.updateMapContainer("map-container", "Map loaded successfully!");
          resolve();
        });

        this.map.on("error", (e) => {
          console.error("Map loading error:", e);
          this.showMapError("map-container", "Failed to load map tiles");
        });
      });

      this.isInitialized = true;
      console.log("Map initialized with Amazon Location Service");

      // Show the user's location on the map
      this.showUserLocation();

      return true;
    } catch (error) {
      console.error("Amazon Location Service failed:", error);
      this.showMapError(containerId, error.message);
      return false;
    }
  },

  // Load MapLibre GL JS SDK from CDN
  loadMapLibreSDK: function () {
    return new Promise((resolve, reject) => {
      if (typeof maplibregl !== "undefined") return resolve();

      const script = document.createElement("script");
      script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
      script.onload = () => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
        document.head.appendChild(link);
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  // Load AWS SDK for credentials
  loadAwsSDK: function () {
    return new Promise((resolve, reject) => {
      if (typeof AWS !== "undefined") return resolve();

      const script = document.createElement("script");
      script.src = "https://sdk.amazonaws.com/js/aws-sdk-2.1691.0.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  // Initialize with Amazon Location Service
  initializeWithLocationService: async function (containerId) {
    try {
      console.log("Initializing Amazon Location Service...");

      // Get AWS credentials from token
      const credentials = await this.getAWSCredentials();

      if (!credentials) {
        throw new Error(
          "Failed to obtain AWS credentials. Please check your authentication and Identity Pool configuration.",
        );
      }

      console.log("AWS credentials obtained successfully");

      // Configure AWS SDK
      AWS.config.update({
        region: CONFIG.LOCATION.REGION,
        credentials: credentials,
      });

      console.log(`Creating map with style: maps/${CONFIG.LOCATION.MAP_NAME}`);

      // Create the map with AWS Location Service
      this.map = new maplibregl.Map({
        container: containerId,
        style: `https://maps.geo.${CONFIG.LOCATION.REGION}.amazonaws.com/maps/v0/maps/${CONFIG.LOCATION.MAP_NAME}/style-descriptor`,
        center: [
          CONFIG.APP.DEFAULT_COORDINATES.LNG,
          CONFIG.APP.DEFAULT_COORDINATES.LAT,
        ],
        zoom: CONFIG.APP.MAP_ZOOM,
        transformRequest: (url, resourceType) => {
          if (url.includes("amazonaws.com")) {
            return {
              url: this.signRequest(url, credentials),
            };
          }
          return { url };
        },
      });

      // Add additional event listeners for better feedback
      this.map.on("styledata", () => {
        console.log("Map style loaded successfully");
      });

      this.map.on("sourcedata", (e) => {
        if (e.isSourceLoaded) {
          console.log("Map source data loaded");
        }
      });

      console.log("Map created successfully with Amazon Location Service");
    } catch (error) {
      console.error("Failed to initialize Amazon Location Service:", error);
      if (
        error.message.includes("NetworkingError") ||
        error.message.includes("403")
      ) {
        console.error(
          "This might be due to missing permissions or incorrect resource names",
        );
        console.error("Please verify your Location Service resources exist:");
        console.error(`- Map: ${CONFIG.LOCATION.MAP_NAME}`);
        console.error(`- Place Index: ${CONFIG.LOCATION.PLACE_INDEX_NAME}`);
      }
      throw error;
    }
  },

  // Get AWS credentials from Cognito token
  getAWSCredentials: async function () {
    try {
      console.log("Retrieving AWS credentials from Cognito...");
      const idToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN);
      const accessToken = localStorage.getItem(
        CONFIG.STORAGE_KEYS.ACCESS_TOKEN,
      );

      if (!idToken || !accessToken) {
        console.error("Authentication tokens not found in localStorage");
        throw new Error("No authentication tokens found");
      }

      console.log("Tokens found, configuring Cognito Identity client...");

      // Create credentials using Cognito Identity
      const cognitoIdentity = new AWS.CognitoIdentity({
        region: CONFIG.COGNITO.REGION,
      });

      const params = {
        IdentityPoolId: CONFIG.COGNITO.IDENTITY_POOL_ID,
        Logins: {
          [`cognito-idp.${CONFIG.COGNITO.REGION}.amazonaws.com/${CONFIG.COGNITO.USER_POOL_ID}`]:
            idToken,
        },
      };

      const identityResult = await cognitoIdentity.getId(params).promise();
      const credentialsResult = await cognitoIdentity
        .getCredentialsForIdentity({
          IdentityId: identityResult.IdentityId,
          Logins: params.Logins,
        })
        .promise();

      console.log("AWS credentials retrieved successfully");
      return {
        accessKeyId: credentialsResult.Credentials.AccessKeyId,
        secretAccessKey: credentialsResult.Credentials.SecretKey,
        sessionToken: credentialsResult.Credentials.SessionToken,
      };
    } catch (error) {
      console.error("Failed to get AWS credentials:", error.message);
      console.error("Error details:", error);
      if (error.code === "ValidationException") {
        console.error("Check your Identity Pool ID configuration in config.js");
      }
      return null;
    }
  },

  // Sign AWS requests for Location Service
  signRequest: function (url, credentials) {
    const urlObj = new URL(url);
    const host = urlObj.host;
    const path = urlObj.pathname + urlObj.search;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substr(0, 8);

    const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-date";
    const payloadHash =
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // empty string hash

    const canonicalRequest = `GET\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // Add auth headers
    urlObj.searchParams.set("X-Amz-Date", amzDate);
    urlObj.searchParams.set("X-Amz-Security-Token", credentials.sessionToken);

    return urlObj.toString();
  },

  // Update map container with success message
  updateMapContainer: function (containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
      // Only update if it's showing a loading message
      const currentContent = container.innerHTML;
      if (
        currentContent.includes("Loading") ||
        currentContent.includes("loading")
      ) {
        console.log("Map container updated:", message);
        // Don't replace the actual map, just log success
        return;
      }
    }
  },

  // Show a user-friendly error message in the map container
  showMapError: function (containerId, errorMessage) {
    console.log("Displaying map error:", errorMessage);
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; text-align: center; padding: 2rem; background: #f8f9fa; border-radius: 8px;">
          <h3 style="color: #333; margin-bottom: 1rem;">Map Service Unavailable</h3>
          <p style="margin-bottom: 1rem;">Amazon Location Service configuration required.</p>
          <p style="font-size: 0.9rem; color: #999;">${errorMessage}</p>
          <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
        </div>
      `;
    }
  },

  // Geocode an address using the backend API
  geocodeAddress: async function (address) {
    try {
      const url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.GEOCODE);
      const response = await Utils.apiCall(url, {
        method: "POST",
        headers: CONFIG.getAuthHeaders(),
        body: JSON.stringify({ address }),
      });

      if (response && response.lat && response.lng) {
        return response;
      }
      throw new Error("Address not found or geocoding failed.");
    } catch (error) {
      console.error("Geocoding error:", error);
      Utils.showError("Could not find coordinates for the address.");
      return null;
    }
  },

  // Reverse geocode coordinates using the backend API
  reverseGeocode: async function (lat, lng) {
    try {
      const url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.REVERSE_GEOCODE);
      const response = await Utils.apiCall(url, {
        method: "POST",
        headers: CONFIG.getAuthHeaders(),
        body: JSON.stringify({ lat, lng }),
      });

      if (response && response.address) {
        return response.address;
      }
      throw new Error("Could not find address for the coordinates.");
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  },

  // Add a generic marker to the map
  addMarker: function (lat, lng, popup = null, color = "#333") {
    if (!this.isInitialized) {
      console.warn("Map not initialized");
      return null;
    }

    const markerElement = document.createElement("div");
    markerElement.style.backgroundColor = color;
    markerElement.style.width = "20px";
    markerElement.style.height = "20px";
    markerElement.style.borderRadius = "50%";
    markerElement.style.border = "3px solid white";
    markerElement.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
    markerElement.style.cursor = "pointer";

    const marker = new maplibregl.Marker(markerElement)
      .setLngLat([lng, lat])
      .addTo(this.map);

    if (popup) {
      const popupInstance = new maplibregl.Popup({ offset: 25 }).setHTML(popup);
      marker.setPopup(popupInstance);
    }

    this.markers.push(marker);
    return marker;
  },

  // Add markers for a list of events
  addEventMarkers: function (events, venues) {
    this.clearMarkers();

    events.forEach((event) => {
      const venue = venues.find((v) => v.venueID === event.venueID);
      if (venue && venue.latitude && venue.longitude) {
        const popupContent = `
          <div style="max-width: 200px;">
            <h4 style="margin: 0 0 0.5rem 0; color: #333;">${Utils.sanitizeInput(event.name)}</h4>
            <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">
              <strong>Venue:</strong> ${Utils.sanitizeInput(venue.name)}
            </p>
            <p style="margin: 0 0 1rem 0; color: #666; font-size: 0.9rem;">
              <strong>Date:</strong> ${Utils.formatDate(event.eventDate)} at ${Utils.formatTime(event.eventTime)}
            </p>
            <button onclick="MapService.showDirections(${venue.latitude}, ${venue.longitude}, '${Utils.sanitizeInput(venue.name)}')"
                    style="width: 100%; font-size: 0.8rem; padding: 0.5rem; margin-bottom: 0.5rem; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Get Directions
            </button>
            <button onclick="window.location.href='event-details.html?id=${event.eventID}'"
                    style="width: 100%; font-size: 0.8rem; padding: 0.5rem; background: #f8f9fa; color: #333; border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer;">
              View Details
            </button>
          </div>
        `;
        this.addMarker(
          parseFloat(venue.latitude),
          parseFloat(venue.longitude),
          popupContent,
          "#333",
        );
      }
    });

    if (this.markers.length > 0) {
      this.fitToMarkers();
    }
  },

  // Add markers for a list of venues
  addVenueMarkers: function (venues) {
    this.clearMarkers();

    venues.forEach((venue) => {
      if (venue.latitude && venue.longitude) {
        const popupContent = `
          <div style="max-width: 200px;">
            <h4 style="margin: 0 0 0.5rem 0; color: #333;">${Utils.sanitizeInput(venue.name)}</h4>
            <p style="margin: 0 0 1rem 0; color: #666; font-size: 0.9rem;">
              ${Utils.sanitizeInput(venue.address)}
            </p>
            <button onclick="MapService.showDirections(${venue.latitude}, ${venue.longitude}, '${Utils.sanitizeInput(venue.name)}')"
                    style="width: 100%; font-size: 0.8rem; padding: 0.5rem; margin-bottom: 0.5rem; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Get Directions
            </button>
            <button onclick="window.location.href='venue-details.html?id=${venue.venueID}'"
                    style="width: 100%; font-size: 0.8rem; padding: 0.5rem; background: #f8f9fa; color: #333; border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer;">
              View Details
            </button>
          </div>
        `;
        this.addMarker(
          parseFloat(venue.latitude),
          parseFloat(venue.longitude),
          popupContent,
          "#666",
        );
      }
    });

    if (this.markers.length > 0) {
      this.fitToMarkers();
    }
  },

  // Show the user's current location on the map
  showUserLocation: async function () {
    try {
      const location = await Utils.getCurrentLocation();
      if (this.userLocationMarker) this.userLocationMarker.remove();

      const userMarkerElement = document.createElement("div");
      userMarkerElement.style.cssText =
        "background-color: #007bff; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 3px rgba(0,123,255,0.3), 0 2px 6px rgba(0,0,0,0.3);";

      this.userLocationMarker = new maplibregl.Marker(userMarkerElement)
        .setLngLat([location.lng, location.lat])
        .addTo(this.map);

      const userPopup = new maplibregl.Popup({ offset: 25 }).setHTML(
        '<div style="text-align: center;"><strong>Your Location</strong></div>',
      );
      this.userLocationMarker.setPopup(userPopup);

      this.map.flyTo({
        center: [location.lng, location.lat],
        zoom: 14,
        duration: 2000,
      });
      console.log("User location shown on map");
    } catch (error) {
      console.log("Could not get user location:", error.message);
    }
  },

  // Clear all markers from the map
  clearMarkers: function () {
    this.markers.forEach((marker) => marker.remove());
    this.markers = [];
  },

  // Adjust the map's viewport to fit all markers
  fitToMarkers: function () {
    if (this.markers.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    this.markers.forEach((marker) => bounds.extend(marker.getLngLat()));
    if (this.userLocationMarker)
      bounds.extend(this.userLocationMarker.getLngLat());
    this.map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
  },

  // Center the map on specific coordinates
  centerOn: function (lat, lng, zoom = 14) {
    if (!this.isInitialized) return;
    this.map.flyTo({ center: [lng, lat], zoom: zoom, duration: 1500 });
  },

  // Show directions using external map applications
  showDirections: async function (destLat, destLng, placeName = "Destination") {
    try {
      const userLocation = await Utils.getCurrentLocation();
      const routeUrls = {
        google: `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${destLat},${destLng}`,
        apple: `maps://maps.apple.com/?saddr=${userLocation.lat},${userLocation.lng}&daddr=${destLat},${destLng}`,
        waze: `https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`,
      };

      const directionsPopup = `
        <div style="max-width: 250px; text-align: center;">
          <h4 style="margin: 0 0 1rem 0; color: #333;">Get Directions to ${placeName}</h4>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <a href="${routeUrls.google}" target="_blank" style="font-size: 0.8rem; padding: 0.5rem; background: #333; color: white; text-decoration: none; border-radius: 4px;">Google Maps</a>
            <a href="${routeUrls.apple}" target="_blank" style="font-size: 0.8rem; padding: 0.5rem; background: #f8f9fa; color: #333; text-decoration: none; border: 1px solid #dee2e6; border-radius: 4px;">Apple Maps</a>
            <a href="${routeUrls.waze}" target="_blank" style="font-size: 0.8rem; padding: 0.5rem; background: #f8f9fa; color: #333; text-decoration: none; border: 1px solid #dee2e6; border-radius: 4px;">Waze</a>
          </div>
          <div style="margin-top: 1rem; font-size: 0.8rem; color: #666;">
            Distance: ${Utils.calculateDistance(userLocation.lat, userLocation.lng, destLat, destLng)} km
          </div>
        </div>
      `;

      new maplibregl.Popup({ offset: 25 })
        .setLngLat([destLng, destLat])
        .setHTML(directionsPopup)
        .addTo(this.map);
    } catch (error) {
      console.error("Error showing directions:", error);
      Utils.showError("Could not get your location for directions.");
    }
  },

  // Resize the map when its container changes size
  resize: function () {
    if (this.map) this.map.resize();
  },

  // Clean up the map instance
  destroy: function () {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markers = [];
    this.userLocationMarker = null;
    this.isInitialized = false;
    this.authHelper = null;
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = MapService;
}
