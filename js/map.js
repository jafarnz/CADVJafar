// Simplified Map integration using Amazon Location Auth Helper
const MapService = {
    map: null,
    markers: [],
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
            console.log("🔐 Initializing authentication helper...");

            // Get access token for authenticated access
            const accessToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
            const idToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ID_TOKEN);

            if (!accessToken && !idToken) {
                throw new Error("No authentication tokens found. Please log in.");
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

                // Refresh credentials
                await new Promise((resolve, reject) => {
                    AWS.config.credentials.refresh((error) => {
                        if (error) {
                            console.error("Failed to refresh AWS credentials:", error);
                            reject(error);
                        } else {
                            console.log("✅ AWS credentials refreshed successfully");
                            resolve();
                        }
                    });
                });
            }

            // Create auth helper with multiple fallback methods
            try {
                // Method 1: Try with CognitoIdentityCredentials
                if (window.amazonLocationAuthHelper && window.amazonLocationAuthHelper.withCognitoCredentialProvider) {
                    this.authHelper = await window.amazonLocationAuthHelper.withCognitoCredentialProvider({
                        identityPoolId: CONFIG.COGNITO.IDENTITY_POOL_ID,
                        region: CONFIG.COGNITO.REGION,
                        logins: {
                            [`cognito-idp.${CONFIG.COGNITO.REGION}.amazonaws.com/${CONFIG.COGNITO.USER_POOL_ID}`]: idToken || accessToken
                        }
                    });
                    console.log("✅ Auth helper created with Cognito credential provider");
                }
                // Method 2: Try with direct credentials
                else if (window.amazonLocationAuthHelper && window.amazonLocationAuthHelper.withCredentials) {
                    this.authHelper = await window.amazonLocationAuthHelper.withCredentials({
                        region: CONFIG.COGNITO.REGION,
                        credentials: AWS.config.credentials
                    });
                    console.log("✅ Auth helper created with direct credentials");
                }
                // Method 3: Create simple auth function
                else {
                    console.log("⚠️ Using fallback authentication method");
                    this.authHelper = {
                        getCredentials: () => AWS.config.credentials,
                        transformRequest: (url, resourceType) => {
                            if (resourceType === 'Style' && !url.includes('://')) {
                                return {
                                    url: `https://maps.geo.${CONFIG.COGNITO.REGION}.amazonaws.com/maps/v0/maps/${CONFIG.LOCATION.MAP_NAME}/style-descriptor`
                                };
                            }
                            return { url };
                        }
                    };
                }
            } catch (authError) {
                console.error("Auth helper creation failed:", authError);
                // Create a simple fallback auth helper
                this.authHelper = {
                    transformRequest: (url, resourceType) => {
                        console.log("🔄 Transform request:", url, resourceType);
                        if (resourceType === 'Style' && !url.includes('://')) {
                            return {
                                url: `https://maps.geo.${CONFIG.COGNITO.REGION}.amazonaws.com/maps/v0/maps/${CONFIG.LOCATION.MAP_NAME}/style-descriptor`
                            };
                        }
                        return { url };
                    }
                };
                console.log("⚠️ Using minimal fallback auth helper");
            }

            console.log("🗺️ Creating map with Amazon Location Service...");

            // Create the map with transformRequest for authentication
            this.map = new maplibregl.Map({
                container: containerId,
                center: [
                    CONFIG.APP.DEFAULT_COORDINATES.LNG,
                    CONFIG.APP.DEFAULT_COORDINATES.LAT,
                ],
                zoom: CONFIG.APP.MAP_ZOOM,
                style: `https://maps.geo.${CONFIG.COGNITO.REGION}.amazonaws.com/maps/v0/maps/${CONFIG.LOCATION.MAP_NAME}/style-descriptor`,
                transformRequest: (url, resourceType) => {
                    if (this.authHelper && this.authHelper.transformRequest) {
                        return this.authHelper.transformRequest(url, resourceType);
                    }
                    // Fallback transform request
                    if (resourceType === 'Style' && !url.includes('://')) {
                        return {
                            url: `https://maps.geo.${CONFIG.COGNITO.REGION}.amazonaws.com/maps/v0/maps/${CONFIG.LOCATION.MAP_NAME}/style-descriptor`
                        };
                    }
                    return { url };
                }
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
    waitForMapLoad: function() {
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
    setupEventHandlers: function() {
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

    // Search for places using Amazon Location Service
    searchPlaces: async function(query, biasPosition = null) {
        try {
            if (!this.authHelper) {
                throw new Error("Authentication helper not initialized");
            }

            console.log("🔍 Searching for places:", query);

            // Create AWS Location client with credentials
            const AWS = window.AWS;

            // Get credentials from auth helper
            let credentials;
            if (this.authHelper.getCredentials) {
                credentials = await this.authHelper.getCredentials();
            } else if (this.authHelper.credentials) {
                credentials = this.authHelper.credentials;
            } else {
                throw new Error("Unable to get credentials from auth helper");
            }

            const locationClient = new AWS.Location({
                region: CONFIG.LOCATION.REGION,
                credentials: credentials,
            });

            const searchParams = {
                IndexName: CONFIG.LOCATION.PLACE_INDEX_NAME,
                Text: query,
                MaxResults: 10,
            };

            // Add bias position if provided
            if (biasPosition) {
                searchParams.BiasPosition = [biasPosition.lng, biasPosition.lat];
            }

            const result = await locationClient
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
    reverseGeocode: async function(lng, lat) {
        try {
            if (!this.authHelper) {
                throw new Error("Authentication helper not initialized");
            }

            console.log("🔄 Reverse geocoding:", { lng, lat });

            // Create AWS Location client with credentials
            const AWS = window.AWS;

            // Get credentials from auth helper
            let credentials;
            if (this.authHelper.getCredentials) {
                credentials = await this.authHelper.getCredentials();
            } else if (this.authHelper.credentials) {
                credentials = this.authHelper.credentials;
            } else {
                throw new Error("Unable to get credentials from auth helper");
            }

            const locationClient = new AWS.Location({
                region: CONFIG.LOCATION.REGION,
                credentials: credentials,
            });

            const result = await locationClient
                .searchPlaceIndexForPosition({
                    IndexName: CONFIG.LOCATION.PLACE_INDEX_NAME,
                    Position: [lng, lat],
                    MaxResults: 1,
                })
                .promise();

            console.log("📍 Reverse geocoding result:", result);
            return result.Results ? .[0] || null;
        } catch (error) {
            console.error("❌ Reverse geocoding failed:", error);
            throw error;
        }
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
        this.userLocationMarker = null;
        this.isInitialized = false;
        this.authHelper = null;
    },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = MapService;
}