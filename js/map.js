// Map integration for Amazon Location Service
const MapService = {
  map: null,
  markers: [],
  userLocationMarker: null,
  isInitialized: false,
  useLocationService: false,

  // Initialize the map
  init: async function (containerId = "map") {
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error("Map container not found:", containerId);
        return false;
      }

      // Load MapLibre GL JS if not already loaded
      await this.loadMapLibreSDK();

      // Initialize with Amazon Location Service
      try {
        await this.initializeWithLocationService(containerId);
        this.useLocationService = true;
        console.log("Map initialized with Amazon Location Service");
      } catch (error) {
        console.warn(
          "Amazon Location Service failed, falling back to OpenStreetMap:",
          error,
        );
        await this.initializeWithOSM(containerId);
        this.useLocationService = false;
        console.log("Map initialized with OpenStreetMap fallback");
      }

      // Add map controls
      this.map.addControl(new maplibregl.NavigationControl());
      this.map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
        }),
      );

      // Wait for map to load
      await new Promise((resolve) => {
        this.map.on("load", resolve);
      });

      this.isInitialized = true;

      // Try to get and show user location
      this.showUserLocation();

      return true;
    } catch (error) {
      console.error("Error initializing map:", error);
      this.showMapError(containerId, error.message);
      return false;
    }
  },

  // Load MapLibre GL JS SDK
  loadMapLibreSDK: function () {
    return new Promise((resolve, reject) => {
      // Check if MapLibre is already loaded
      if (typeof maplibregl !== "undefined") {
        resolve();
        return;
      }

      // Load MapLibre GL JS
      const maplibreScript = document.createElement("script");
      maplibreScript.src =
        "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
      maplibreScript.onload = () => {
        // Load CSS
        const maplibreCSS = document.createElement("link");
        maplibreCSS.rel = "stylesheet";
        maplibreCSS.href =
          "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
        document.head.appendChild(maplibreCSS);
        resolve();
      };
      maplibreScript.onerror = reject;
      document.head.appendChild(maplibreScript);
    });
  },

  // Initialize with Amazon Location Service using access tokens
  initializeWithLocationService: async function (containerId) {
    // For now, throw error to use OSM fallback since Location Service needs proper setup
    throw new Error(
      "Amazon Location Service requires additional configuration",
    );
  },

  // Initialize with OpenStreetMap fallback
  initializeWithOSM: async function (containerId) {
    this.map = new maplibregl.Map({
      container: containerId,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: [
        CONFIG.APP.DEFAULT_COORDINATES.LNG,
        CONFIG.APP.DEFAULT_COORDINATES.LAT,
      ],
      zoom: CONFIG.APP.MAP_ZOOM,
    });
  },

  // Show map error
  showMapError: function (containerId, errorMessage) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; text-align: center; padding: 2rem;">
                    <h3>Map Unavailable</h3>
                    <p>Unable to load the map: ${errorMessage}</p>
                    <button onclick="location.reload()" class="btn btn-secondary" style="margin-top: 1rem;">Retry</button>
                </div>
            `;
    }
  },

  // Add marker for event or venue
  addMarker: function (lat, lng, popup = null, color = "#667eea") {
    if (!this.isInitialized) {
      console.warn("Map not initialized");
      return null;
    }

    // Create custom marker element
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

  // Add event markers to map
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
                        <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">
                            <strong>Date:</strong> ${Utils.formatDate(event.eventDate)}
                        </p>
                        <p style="margin: 0 0 1rem 0; color: #666; font-size: 0.9rem;">
                            <strong>Time:</strong> ${Utils.formatTime(event.eventTime)}
                        </p>
                        <button onclick="MapService.showDirections(${venue.latitude}, ${venue.longitude}, '${Utils.sanitizeInput(venue.name)}')"
                                class="btn" style="width: 100%; font-size: 0.8rem; padding: 0.5rem; margin-bottom: 0.5rem;">
                            Get Directions
                        </button>
                        <button onclick="window.location.href='event-details.html?id=${event.eventID}'"
                                class="btn btn-secondary" style="width: 100%; font-size: 0.8rem; padding: 0.5rem;">
                            View Details
                        </button>
                    </div>
                `;

        this.addMarker(
          parseFloat(venue.latitude),
          parseFloat(venue.longitude),
          popupContent,
          "#667eea",
        );
      }
    });

    // Fit map to show all markers
    if (this.markers.length > 0) {
      this.fitToMarkers();
    }
  },

  // Add venue markers to map
  addVenueMarkers: function (venues) {
    this.clearMarkers();

    venues.forEach((venue) => {
      if (venue.latitude && venue.longitude) {
        const popupContent = `
                    <div style="max-width: 200px;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #333;">${Utils.sanitizeInput(venue.name)}</h4>
                        <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">
                            ${Utils.sanitizeInput(venue.address)}
                        </p>
                        <p style="margin: 0 0 1rem 0; color: #666; font-size: 0.9rem;">
                            <strong>Capacity:</strong> ${venue.capacity || "N/A"}
                        </p>
                        <button onclick="MapService.showDirections(${venue.latitude}, ${venue.longitude}, '${Utils.sanitizeInput(venue.name)}')"
                                class="btn" style="width: 100%; font-size: 0.8rem; padding: 0.5rem; margin-bottom: 0.5rem;">
                            Get Directions
                        </button>
                        <button onclick="window.location.href='venue-details.html?id=${venue.venueID}'"
                                class="btn btn-secondary" style="width: 100%; font-size: 0.8rem; padding: 0.5rem;">
                            View Details
                        </button>
                    </div>
                `;

        this.addMarker(
          parseFloat(venue.latitude),
          parseFloat(venue.longitude),
          popupContent,
          "#764ba2",
        );
      }
    });

    // Fit map to show all markers
    if (this.markers.length > 0) {
      this.fitToMarkers();
    }
  },

  // Show user's current location
  showUserLocation: async function () {
    try {
      const location = await Utils.getCurrentLocation();

      if (this.userLocationMarker) {
        this.userLocationMarker.remove();
      }

      // Create user location marker
      const userMarkerElement = document.createElement("div");
      userMarkerElement.style.backgroundColor = "#ff6b6b";
      userMarkerElement.style.width = "16px";
      userMarkerElement.style.height = "16px";
      userMarkerElement.style.borderRadius = "50%";
      userMarkerElement.style.border = "3px solid white";
      userMarkerElement.style.boxShadow =
        "0 0 0 3px #ff6b6b40, 0 2px 6px rgba(0,0,0,0.3)";

      this.userLocationMarker = new maplibregl.Marker(userMarkerElement)
        .setLngLat([location.lng, location.lat])
        .addTo(this.map);

      // Add popup for user location
      const userPopup = new maplibregl.Popup({ offset: 25 }).setHTML(
        '<div style="text-align: center;"><strong>Your Location</strong></div>',
      );
      this.userLocationMarker.setPopup(userPopup);

      // Center map on user location
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

  // Clear all markers
  clearMarkers: function () {
    this.markers.forEach((marker) => marker.remove());
    this.markers = [];
  },

  // Fit map to show all markers
  fitToMarkers: function () {
    if (this.markers.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();

    this.markers.forEach((marker) => {
      bounds.extend(marker.getLngLat());
    });

    // Include user location if available
    if (this.userLocationMarker) {
      bounds.extend(this.userLocationMarker.getLngLat());
    }

    this.map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15,
    });
  },

  // Center map on specific coordinates
  centerOn: function (lat, lng, zoom = 14) {
    if (!this.isInitialized) return;

    this.map.flyTo({
      center: [lng, lat],
      zoom: zoom,
      duration: 1500,
    });
  },

  // Geocode address using external service (Nominatim)
  geocodeAddress: async function (address) {
    try {
      const encodedAddress = encodeURIComponent(address + ", Singapore");
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      );

      if (!response.ok) {
        throw new Error("Geocoding service unavailable");
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          formatted: result.display_name,
        };
      }

      throw new Error("Address not found");
    } catch (error) {
      console.error("Geocoding error:", error);

      // Return Singapore center as fallback
      return {
        lat: CONFIG.APP.DEFAULT_COORDINATES.LAT,
        lng: CONFIG.APP.DEFAULT_COORDINATES.LNG,
        formatted: "Singapore (approximate)",
      };
    }
  },

  // Reverse geocoding - get address from coordinates
  reverseGeocode: async function (lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      );

      if (!response.ok) {
        throw new Error("Reverse geocoding service unavailable");
      }

      const data = await response.json();

      if (data && data.display_name) {
        return data.display_name;
      }

      throw new Error("Location not found");
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  },

  // Show directions to a specific location
  showDirections: async function (destLat, destLng, placeName = "Destination") {
    try {
      const userLocation = await Utils.getCurrentLocation();

      // Create route URL for external navigation apps
      const routeUrls = {
        google: `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${destLat},${destLng}`,
        apple: `maps://maps.apple.com/?saddr=${userLocation.lat},${userLocation.lng}&daddr=${destLat},${destLng}`,
        waze: `https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`,
      };

      // Show directions popup
      const directionsPopup = `
        <div style="max-width: 250px; text-align: center;">
          <h4 style="margin: 0 0 1rem 0; color: #333;">Get Directions to ${placeName}</h4>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <a href="${routeUrls.google}" target="_blank" class="btn" style="font-size: 0.8rem; padding: 0.5rem;">
              Google Maps
            </a>
            <a href="${routeUrls.apple}" target="_blank" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.5rem;">
              Apple Maps
            </a>
            <a href="${routeUrls.waze}" target="_blank" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.5rem;">
              Waze
            </a>
          </div>
          <div style="margin-top: 1rem; font-size: 0.8rem; color: #666;">
            Distance: ${Utils.calculateDistance(userLocation.lat, userLocation.lng, destLat, destLng)} km
          </div>
        </div>
      `;

      // Show popup on map
      new maplibregl.Popup({ offset: 25 })
        .setLngLat([destLng, destLat])
        .setHTML(directionsPopup)
        .addTo(this.map);

      // Center map to show both locations
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([userLocation.lng, userLocation.lat]);
      bounds.extend([destLng, destLat]);

      this.map.fitBounds(bounds, {
        padding: 100,
        maxZoom: 15,
      });
    } catch (error) {
      console.error("Error showing directions:", error);
      Utils.showError("Could not get your location for directions.");
    }
  },

  // Calculate distance between two points
  calculateDistance: function (startLat, startLng, endLat, endLng) {
    return Utils.calculateDistance(startLat, startLng, endLat, endLng);
  },

  // Resize map (useful when container size changes)
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
    this.useLocationService = false;
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = MapService;
}
