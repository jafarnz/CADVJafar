// Simplified Map integration using Amazon Location Auth Helper
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

      console.log("🗺️ Starting map initialization...");

      // Load required libraries
      await this.loadMapLibreGL();
      await this.loadAmazonLocationAuthHelper();

      // Initialize with Amazon Location Service
      await this.initializeWithLocationService(containerId);

      console.log("✅ Map initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Map initialization failed:", error);
      this.displayMapError(error.message);
      return false;
    }
  },

  // Load MapLibre GL library
  loadMapLibreGL: function () {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.maplibregl) {
        resolve();
        return;
      }

      // Load CSS
      const link = document.createElement("link");
      link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
      link.rel = "stylesheet";
      document.head.appendChild(link);

      // Load JS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
      script.onload = () => {
        console.log("✅ MapLibre GL loaded");
        resolve();
      };
      script.onerror = () => {
        reject(new Error("Failed to load MapLibre GL"));
      };
      document.head.appendChild(script);
    });
  },

  // Load Amazon Location Auth Helper
  loadAmazonLocationAuthHelper: function () {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.amazonLocationAuthHelper) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://unpkg.com/@aws/amazon-location-utilities-auth-helper@1.x/dist/amazonLocationAuthHelper.js";
      script.onload = () => {
        console.log("✅ Amazon Location Auth Helper loaded");
        resolve();
      };
      script.onerror = () => {
        reject(new Error("Failed to load Amazon Location Auth Helper"));
      };
      document.head.appendChild(script);
    });
  },

  // Initialize map with Amazon Location Service
  initializeWithLocationService: async function (containerId) {
    try {
      console.log("🔐 Initializing authentication helper...");

      // Create auth helper with identity pool
      this.authHelper = await amazonLocationAuthHelper.withIdentityPoolId(
        CONFIG.COGNITO.IDENTITY_POOL_ID,
      );

      console.log("🗺️ Creating map with Amazon Location Service...");

      // Create the map
      this.map = new maplibregl.Map({
        container: containerId,
        center: [
          CONFIG.APP.DEFAULT_COORDINATES.LNG,
          CONFIG.APP.DEFAULT_COORDINATES.LAT,
        ],
        zoom: CONFIG.APP.MAP_ZOOM,
        style: `https://maps.geo.${CONFIG.LOCATION.REGION}.amazonaws.com/maps/v0/maps/${CONFIG.LOCATION.MAP_NAME}/style-descriptor`,
        ...this.authHelper.getMapAuthenticationOptions(),
      });

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

      // Set up event handlers
      this.setupEventHandlers();

      // Wait for map to load
      await this.waitForMapLoad();

      this.isInitialized = true;
      console.log("✅ Map fully initialized with Amazon Location Service");
    } catch (error) {
      console.error(
        "❌ Failed to initialize map with Location Service:",
        error,
      );
      throw error;
    }
  },

  // Wait for map to fully load
  waitForMapLoad: function () {
    return new Promise((resolve, reject) => {
      if (this.map.loaded()) {
        resolve();
        return;
      }

      this.map.on("load", () => {
        console.log("✅ Map tiles loaded successfully");
        resolve();
      });

      this.map.on("error", (error) => {
        console.error("❌ Map loading error:", error);
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error("Map loading timeout"));
      }, 30000);
    });
  },

  // Set up map event handlers
  setupEventHandlers: function () {
    this.map.on("load", () => {
      console.log("🎯 Map loaded successfully");
    });

    this.map.on("error", (error) => {
      console.error("❌ Map error:", error);
      this.displayMapError(
        "Map loading failed. Please check your internet connection.",
      );
    });

    this.map.on("click", (e) => {
      console.log("🖱️ Map clicked at:", e.lngLat);
    });
  },

  // Add a marker to the map
  addMarker: function (lng, lat, options = {}) {
    if (!this.isInitialized) {
      console.warn("Map not initialized, cannot add marker");
      return null;
    }

    const marker = new maplibregl.Marker(options)
      .setLngLat([lng, lat])
      .addTo(this.map);

    this.markers.push(marker);
    return marker;
  },

  // Add a popup marker
  addPopupMarker: function (lng, lat, content, options = {}) {
    if (!this.isInitialized) {
      console.warn("Map not initialized, cannot add popup marker");
      return null;
    }

    const popup = new maplibregl.Popup({ offset: 25 }).setHTML(content);

    const marker = new maplibregl.Marker(options)
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(this.map);

    this.markers.push(marker);
    return marker;
  },

  // Clear all markers
  clearMarkers: function () {
    this.markers.forEach((marker) => marker.remove());
    this.markers = [];
  },

  // Fly to location
  flyTo: function (lng, lat, zoom = 14) {
    if (!this.isInitialized) {
      console.warn("Map not initialized, cannot fly to location");
      return;
    }

    this.map.flyTo({
      center: [lng, lat],
      zoom: zoom,
      speed: 1.2,
      curve: 1.42,
    });
  },

  // Get user's current location
  getUserLocation: function () {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lng: position.coords.longitude,
            lat: position.coords.latitude,
          };
          resolve(location);
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

  // Add user location marker
  addUserLocationMarker: async function () {
    try {
      const location = await this.getUserLocation();

      // Remove existing user location marker
      if (this.userLocationMarker) {
        this.userLocationMarker.remove();
      }

      // Add new user location marker
      this.userLocationMarker = this.addMarker(location.lng, location.lat, {
        color: "#007cbf",
      });

      // Fly to user location
      this.flyTo(location.lng, location.lat, 15);

      console.log("📍 User location marker added:", location);
      return location;
    } catch (error) {
      console.error("❌ Failed to get user location:", error);
      throw error;
    }
  },

  // Search for places using Amazon Location Service
  searchPlaces: async function (query, biasPosition = null) {
    try {
      if (!this.authHelper) {
        throw new Error("Authentication helper not initialized");
      }

      console.log("🔍 Searching for places:", query);

      // Get the location client from auth helper
      const client = this.authHelper.getLocationClient();

      const searchParams = {
        IndexName: CONFIG.LOCATION.PLACE_INDEX_NAME,
        Text: query,
        MaxResults: 10,
      };

      // Add bias position if provided
      if (biasPosition) {
        searchParams.BiasPosition = [biasPosition.lng, biasPosition.lat];
      }

      const result = await client
        .searchPlaceIndexForText(searchParams)
        .promise();

      console.log("🎯 Places search results:", result);
      return result.Results || [];
    } catch (error) {
      console.error("❌ Places search failed:", error);
      throw error;
    }
  },

  // Reverse geocoding - get address from coordinates
  reverseGeocode: async function (lng, lat) {
    try {
      if (!this.authHelper) {
        throw new Error("Authentication helper not initialized");
      }

      console.log("🔄 Reverse geocoding:", { lng, lat });

      const client = this.authHelper.getLocationClient();

      const result = await client
        .searchPlaceIndexForPosition({
          IndexName: CONFIG.LOCATION.PLACE_INDEX_NAME,
          Position: [lng, lat],
          MaxResults: 1,
        })
        .promise();

      console.log("📍 Reverse geocoding result:", result);
      return result.Results?.[0] || null;
    } catch (error) {
      console.error("❌ Reverse geocoding failed:", error);
      throw error;
    }
  },

  // Display map error message
  displayMapError: function (message) {
    const mapContainer = document.getElementById("map");
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; color: #6c757d; text-align: center; padding: 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🗺️</div>
          <h3 style="margin: 0 0 1rem 0; color: #495057;">Map Unavailable</h3>
          <p style="margin: 0; max-width: 400px; line-height: 1.5;">${message}</p>
          <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007cbf; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Retry
          </button>
        </div>
      `;
    }
  },

  // Resize map (call when container size changes)
  resize: function () {
    if (this.map) {
      this.map.resize();
    }
  },

  // Destroy map instance
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

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = MapService;
}
