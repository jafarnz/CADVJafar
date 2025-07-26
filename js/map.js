// Simplified Map integration using Amazon Location Auth Helper
const MapService = {
    map: null,
    markers: [],
    venues: [],
    venueMarkers: [],
    userLocationMarker: null,
    isInitialized: false,
    authHelper: null,

    // Initialize the map
    init: async function(containerId = "map") {
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

            // Initialize with Amazon Location Service only
            await this.initializeWithLocationService(containerId);

            console.log("✅ Map initialized successfully");
            return true;
        } catch (error) {
            console.error("❌ Map initialization failed:", error);
            this.displayMapError("Map authentication failed. Please ensure you're logged in and AWS Location Service is properly configured.");
            return false;
        }
    },

    // Load MapLibre GL library
    loadMapLibreGL: function() {
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

            // Load AWS SDK first
            const awsScript = document.createElement("script");
            awsScript.src = "https://sdk.amazonaws.com/js/aws-sdk-2.1691.0.min.js";
            awsScript.onload = () => {
                // Then load MapLibre GL
                const script = document.createElement("script");
                script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
                script.onload = () => {
                    console.log("✅ MapLibre GL and AWS SDK loaded");
                    resolve();
                };
                script.onerror = () => {
                    reject(new Error("Failed to load MapLibre GL"));
                };
                document.head.appendChild(script);
            };
            awsScript.onerror = () => {
                reject(new Error("Failed to load AWS SDK"));
            };
            document.head.appendChild(awsScript);
        });
    },

    // Load Amazon Location Auth Helper
    loadAmazonLocationAuthHelper: function() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.amazonLocationAuthHelper) {
                resolve();
                return;
            }

            // Try multiple versions for compatibility
            const versions = [
                "https://unpkg.com/@aws/amazon-location-utilities-auth-helper@1.0.12/dist/amazonLocationAuthHelper.js",
                "https://unpkg.com/@aws/amazon-location-utilities-auth-helper@1.0.5/dist/amazonLocationAuthHelper.js",
                "https://unpkg.com/@aws/amazon-location-utilities-auth-helper@1.x/dist/amazonLocationAuthHelper.js",
            ];

            let versionIndex = 0;

            const tryLoadVersion = () => {
                if (versionIndex >= versions.length) {
                    reject(
                        new Error(
                            "Failed to load Amazon Location Auth Helper from all sources",
                        ),
                    );
                    return;
                }

                const script = document.createElement("script");
                script.src = versions[versionIndex];
                script.onload = () => {
                    console.log(
                        "✅ Amazon Location Auth Helper loaded from:",
                        versions[versionIndex],
                    );
                    resolve();
                };
                script.onerror = () => {
                    console.warn(
                        `Failed to load from ${versions[versionIndex]}, trying next...`,
                    );
                    versionIndex++;
                    tryLoadVersion();
                };
                document.head.appendChild(script);
            };

            tryLoadVersion();
        });
    },

    // Initialize map with Amazon Location Service
    initializeWithLocationService: async function(containerId) {
        try {
            console.log("🔐 Initializing AWS credentials for Location Service...");

            // Get access token for authenticated access
            const accessToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
            const idToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN);

            if (!accessToken && !idToken) {
                throw new Error("No authentication tokens found. Please log in first.");
            }

            console.log("🔑 Setting up Cognito credentials for Location Service...");

            // Initialize AWS SDK with Cognito credentials
            if (typeof AWS !== 'undefined') {
                AWS.config.region = CONFIG.COGNITO.REGION;
                AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                    IdentityPoolId: CONFIG.COGNITO.IDENTITY_POOL_ID,
                    Logins: {
                        [`cognito-idp.${CONFIG.COGNITO.REGION}.amazonaws.com/${CONFIG.COGNITO.USER_POOL_ID}`]: idToken || accessToken
                    }
                });

                // Refresh credentials and get them
                await new Promise((resolve, reject) => {
                    AWS.config.credentials.refresh((error) => {
                        if (error) {
                            console.error("Failed to refresh AWS credentials:", error);
                            reject(new Error(`AWS credentials refresh failed: ${error.message}`));
                        } else {
                            console.log("✅ AWS credentials refreshed successfully");
                            resolve();
                        }
                    });
                });
            } else {
                throw new Error("AWS SDK not loaded");
            }

            // Create auth helper with Cognito credentials
            if (!window.amazonLocationAuthHelper || !window.amazonLocationAuthHelper.withCredentials) {
                throw new Error("Amazon Location Auth Helper not loaded properly");
            }

            this.authHelper = await window.amazonLocationAuthHelper.withCredentials({
                region: CONFIG.COGNITO.REGION,
                credentials: AWS.config.credentials
            });

            console.log("✅ Auth helper created successfully");

            console.log("🗺️ Creating map with Amazon Location Service...");

            // Create the map with proper authentication
            this.map = new maplibregl.Map({
                container: containerId,
                center: [
                    CONFIG.APP.DEFAULT_COORDINATES.LNG,
                    CONFIG.APP.DEFAULT_COORDINATES.LAT,
                ],
                zoom: CONFIG.APP.MAP_ZOOM,
                style: `https://maps.geo.${CONFIG.COGNITO.REGION}.amazonaws.com/maps/v0/maps/${CONFIG.LOCATION.MAP_NAME}/style-descriptor`,
                transformRequest: this.authHelper.transformRequest
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
            console.error("❌ Failed to initialize map with Location Service:", error);
            throw error;
        }
    },

    // Wait for map to fully load
    waitForMapLoad: function() {
        return new Promise((resolve, reject) => {
            if (this.map.loaded()) {
                resolve();
                return;
            }

            let loadTimeout;

            this.map.on("load", () => {
                console.log("✅ Map tiles loaded successfully");
                clearTimeout(loadTimeout);
                resolve();
            });

            this.map.on("error", (error) => {
                console.error("❌ Map loading error:", error);
                clearTimeout(loadTimeout);
                
                // Check if it's a 403 error (authentication issue)
                if (error.error && error.error.message && error.error.message.includes('403')) {
                    reject(new Error("AWS Location Service authentication failed (403 Forbidden). Please check your Cognito configuration and IAM permissions."));
                } else if (error.error && error.error.message && error.error.message.includes('404')) {
                    reject(new Error("AWS Location Service map not found (404). Please verify MAP_NAME configuration."));
                } else {
                    reject(new Error(`AWS Location Service error: ${error.error ? error.error.message : 'Unknown error'}`));
                }
            });

            // Timeout after 30 seconds
            loadTimeout = setTimeout(() => {
                reject(new Error("AWS Location Service timeout - map failed to load within 30 seconds. This may indicate authentication or configuration issues."));
            }, 30000);
        });
    },

    // Set up map event handlers
    setupEventHandlers: function() {
        this.map.on("load", () => {
            console.log("🎯 Map loaded successfully");
        });

        this.map.on("error", (error) => {
            console.error("❌ Map error:", error);
            
            let errorMessage = "AWS Location Service encountered an error.";
            if (error.error && error.error.message) {
                if (error.error.message.includes('403')) {
                    errorMessage = "Authentication failed for AWS Location Service. Please check your login credentials and IAM permissions.";
                } else if (error.error.message.includes('404')) {
                    errorMessage = "AWS Location Service map configuration not found. Please verify your map settings.";
                } else {
                    errorMessage = `AWS Location Service error: ${error.error.message}`;
                }
            }
            
            this.displayMapError(errorMessage);
        });

        this.map.on("click", (e) => {
            console.log("🖱️ Map clicked at:", e.lngLat);
        });
    },

    // Add a marker to the map
    addMarker: function(lng, lat, options = {}) {
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
    addPopupMarker: function(lng, lat, content, options = {}) {
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
    clearMarkers: function() {
        this.markers.forEach((marker) => marker.remove());
        this.markers = [];
    },

    // Fly to location
    flyTo: function(lng, lat, zoom = 14) {
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
    getUserLocation: function() {
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
                }, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0,
                },
            );
        });
    },

    // Add user location marker
    addUserLocationMarker: async function() {
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

    // Search for places using your Location Lambda API
    searchPlaces: async function(query, biasPosition = null) {
        try {
            console.log("🔍 Searching for places:", query);

            const searchData = {
                text: query,
                maxResults: 10,
                indexName: CONFIG.LOCATION.PLACE_INDEX_NAME
            };

            if (biasPosition) {
                searchData.biasPosition = [biasPosition.lng, biasPosition.lat];
            }

            const response = await Utils.apiCall(
                CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.LOCATION, 'places/search'), 
                {
                    method: 'GET',
                    headers: CONFIG.getAuthHeaders(),
                    queryParams: searchData
                }
            );

            console.log("🎯 Places search results:", response);
            return response.results || [];
        } catch (error) {
            console.error("❌ Places search failed:", error);
            throw error;
        }
    },

    // Reverse geocoding using your Location Lambda API
    reverseGeocode: async function(lng, lat) {
        try {
            console.log("🔄 Reverse geocoding:", { lng, lat });

            const response = await Utils.apiCall(
                CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.LOCATION, 'reverse-geocode'), 
                {
                    method: 'POST',
                    headers: CONFIG.getAuthHeaders(),
                    body: JSON.stringify({
                        longitude: lng,
                        latitude: lat,
                        indexName: CONFIG.LOCATION.PLACE_INDEX_NAME
                    })
                }
            );

            console.log("📍 Reverse geocoding result:", response);
            return response;
        } catch (error) {
            console.error("❌ Reverse geocoding failed:", error);
            throw error;
        }
    },

    // Geocode address using your Location Lambda API
    geocodeAddress: async function(address, biasPosition = null) {
        try {
            console.log("🏠 Geocoding address:", address);

            const geocodeData = {
                address: address,
                indexName: CONFIG.LOCATION.PLACE_INDEX_NAME
            };

            if (biasPosition) {
                geocodeData.biasPosition = [biasPosition.lng, biasPosition.lat];
            }

            const response = await Utils.apiCall(
                CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.LOCATION, 'geocode'), 
                {
                    method: 'POST',
                    headers: CONFIG.getAuthHeaders(),
                    body: JSON.stringify(geocodeData)
                }
            );

            console.log("📍 Geocoding result:", response);
            return response;
        } catch (error) {
            console.error("❌ Geocoding failed:", error);
            throw error;
        }
    },

    // Venue functions using your Lambda APIs
    loadVenues: async function() {
        try {
            console.log("🏪 Loading venues from Lambda API");

            const response = await Utils.apiCall(
                CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES), 
                {
                    method: 'GET',
                    headers: CONFIG.getAuthHeaders()
                }
            );

            console.log("✅ Venues loaded:", response);

            // Handle wrapped response
            const venues = response.venues || response.message?.venues || response.Items || response;
            
            if (Array.isArray(venues)) {
                this.venues = venues;
                this.addVenueMarkers();
                return venues;
            } else {
                console.warn("⚠️ Venues response not in expected format:", response);
                return [];
            }
        } catch (error) {
            console.error("❌ Failed to load venues:", error);
            this.displayError(`Failed to load venues: ${error.message}`);
            return [];
        }
    },

    addVenueMarkers: function() {
        console.log("📍 Adding venue markers");
        
        // Clear existing venue markers
        this.clearVenueMarkers();

        this.venues.forEach(venue => {
            // Handle different coordinate formats
            let coordinates;
            if (venue.coordinates) {
                if (Array.isArray(venue.coordinates)) {
                    coordinates = venue.coordinates; // [lng, lat]
                } else if (venue.coordinates.lat && venue.coordinates.lng) {
                    coordinates = [venue.coordinates.lng, venue.coordinates.lat];
                }
            } else if (venue.lat && venue.lng) {
                coordinates = [venue.lng, venue.lat];
            } else if (venue.latitude && venue.longitude) {
                coordinates = [venue.longitude, venue.latitude];
            }

            if (!coordinates) {
                console.warn("⚠️ Venue missing coordinates:", venue);
                return;
            }

            // Create popup content
            const popupContent = this.createVenuePopup(venue);

            // Create marker
            const marker = new maplibregl.Marker({ 
                color: '#ff6b6b',
                scale: 0.8
            })
            .setLngLat(coordinates)
            .setPopup(new maplibregl.Popup().setHTML(popupContent))
            .addTo(this.map);

            this.venueMarkers.push(marker);
        });

        console.log(`✅ Added ${this.venueMarkers.length} venue markers`);
    },

    createVenuePopup: function(venue) {
        return `
            <div class="venue-popup">
                <h3>${venue.name || 'Unnamed Venue'}</h3>
                <p><strong>Type:</strong> ${venue.type || 'Unknown'}</p>
                ${venue.address ? `<p><strong>Address:</strong> ${venue.address}</p>` : ''}
                ${venue.phone ? `<p><strong>Phone:</strong> ${venue.phone}</p>` : ''}
                ${venue.website ? `<p><strong>Website:</strong> <a href="${venue.website}" target="_blank">${venue.website}</a></p>` : ''}
                ${venue.description ? `<p>${venue.description}</p>` : ''}
                <button onclick="MapService.selectVenue('${venue.venueId || venue.id}')" class="btn btn-primary btn-sm">Select Venue</button>
            </div>
        `;
    },

    selectVenue: function(venueId) {
        console.log("🎯 Venue selected:", venueId);
        const venue = this.venues.find(v => v.venueId === venueId || v.id === venueId);
        if (venue) {
            // Emit custom event for other parts of the app to listen to
            window.dispatchEvent(new CustomEvent('venueSelected', { detail: venue }));
            
            // Close any open popups
            this.map.getPopups().forEach(popup => popup.remove());
        }
    },

    clearVenueMarkers: function() {
        this.venueMarkers.forEach(marker => marker.remove());
        this.venueMarkers = [];
    },

    // Display map error message
    displayMapError: function(message) {
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
    resize: function() {
        if (this.map) {
            this.map.resize();
        }
    },

    // Destroy map instance
    destroy: function() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.markers = [];
        this.venues = [];
        this.venueMarkers = [];
        this.userLocationMarker = null;
        this.isInitialized = false;
        this.authHelper = null;
    },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = MapService;
}