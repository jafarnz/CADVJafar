// Simplified Map integration using Amazon Location Service API Key
const MapService = {
    map: null,
    markers: [],
    venues: [],
    venueMarkers: [],
    userLocationMarker: null,
    isInitialized: false,

    // Initialize the map
    init: async function(containerId = "map") {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error("Map container not found:", containerId);
                return false;
            }

            console.log("🗺️ Starting map initialization with API Key...");

            // Check API key configuration
            if (!CONFIG.LOCATION.API_KEY || CONFIG.LOCATION.API_KEY === 'YOUR_API_KEY_HERE') {
                throw new Error("API Key not configured. Please set CONFIG.LOCATION.API_KEY");
            }

            // Load required libraries
            await this.loadMapLibreGL();

            // Initialize with Amazon Location Service using API Key
            await this.initializeWithApiKey(containerId);

            console.log("✅ Map initialized successfully");
            return true;
        } catch (error) {
            console.error("❌ Map initialization failed:", error);
            this.displayMapError(`Map initialization failed: ${error.message}`);
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

            // Load MapLibre GL
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

    // Initialize map with Amazon Location Service API Key
    initializeWithApiKey: async function(containerId) {
        try {
            console.log("🔐 Initializing with API Key authentication...");

            // Create the map style URL with API key
            const styleUrl = `https://maps.geo.${CONFIG.LOCATION.REGION}.amazonaws.com/maps/v0/maps/${CONFIG.LOCATION.MAP_NAME}/style-descriptor?key=${CONFIG.LOCATION.API_KEY}`;

            console.log("🗺️ Creating map with API Key authentication...");

            // Create the map with API key authentication
            const mapConfig = {
                container: containerId,
                center: [
                    CONFIG.APP.DEFAULT_COORDINATES.LNG,
                    CONFIG.APP.DEFAULT_COORDINATES.LAT,
                ],
                zoom: CONFIG.APP.MAP_ZOOM,
                style: styleUrl,
                transformRequest: (url, resourceType) => {
                    console.log("🔄 Transform request for:", url);
                    
                    // For AWS Location Service requests that don't already have API key
                    if ((url.includes('amazonaws.com') || url.includes('maps.geo.')) && !url.includes('key=')) {
                        console.log("🔐 Adding API key to AWS request");
                        
                        // Check if URL already has query parameters
                        const separator = url.includes('?') ? '&' : '?';
                        const authenticatedUrl = `${url}${separator}key=${CONFIG.LOCATION.API_KEY}`;
                        
                        console.log("✅ Authenticated URL created");
                        return { url: authenticatedUrl };
                    }
                    
                    // Don't modify URLs that already have the API key
                    console.log("🔄 URL already has key or not AWS, passing through:", url);
                    return { url };
                }
            };

            console.log("📍 Map configuration:", {
                region: CONFIG.LOCATION.REGION,
                mapName: CONFIG.LOCATION.MAP_NAME,
                center: mapConfig.center,
                zoom: mapConfig.zoom
            });

            this.map = new maplibregl.Map(mapConfig);

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
            console.log("✅ Map fully initialized with API Key");
        } catch (error) {
            console.error("❌ Failed to initialize map with API Key:", error);
            throw error;
        }
    },

    // Wait for map to fully load
    waitForMapLoad: function() {
        return new Promise((resolve, reject) => {
            if (this.map.loaded()) {
                console.log("✅ Map already loaded");
                resolve();
                return;
            }

            let loadTimeout;
            let errorOccurred = false;

            this.map.on("load", () => {
                if (!errorOccurred) {
                    console.log("✅ Map tiles loaded successfully");
                    clearTimeout(loadTimeout);
                    resolve();
                }
            });

            this.map.on("error", (error) => {
                if (!errorOccurred) {
                    errorOccurred = true;
                    console.error("❌ Map loading error:", error);
                    clearTimeout(loadTimeout);
                    
                    let errorMessage = "Unknown map error";
                    
                    // Check for different types of errors
                    if (error.error) {
                        const errMsg = error.error.message || error.error.toString();
                        
                        if (errMsg.includes('403') || errMsg.includes('Forbidden')) {
                            errorMessage = "AWS Location Service authentication failed (403 Forbidden). Please check your Cognito configuration and IAM permissions for Location Service.";
                        } else if (errMsg.includes('404') || errMsg.includes('Not Found')) {
                            errorMessage = `AWS Location Service map '${CONFIG.LOCATION.MAP_NAME}' not found (404). Please verify MAP_NAME configuration in AWS Location Service.`;
                        } else if (errMsg.includes('CORS')) {
                            errorMessage = "CORS error accessing AWS Location Service. Please check your AWS configuration.";
                        } else {
                            errorMessage = `AWS Location Service error: ${errMsg}`;
                        }
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
                    
                    console.error("🔍 Detailed error analysis:", {
                        error: error,
                        mapName: CONFIG.LOCATION.MAP_NAME,
                        region: CONFIG.LOCATION.REGION,
                        styleUrl: `https://maps.geo.${CONFIG.LOCATION.REGION}.amazonaws.com/maps/v0/maps/${CONFIG.LOCATION.MAP_NAME}/style-descriptor`
                    });
                    
                    reject(new Error(errorMessage));
                }
            });

            // Timeout after 30 seconds
            loadTimeout = setTimeout(() => {
                if (!errorOccurred) {
                    errorOccurred = true;
                    console.error("⏰ Map load timeout");
                    reject(new Error("AWS Location Service timeout - map failed to load within 30 seconds. This may indicate authentication, network, or configuration issues."));
                }
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

    // Search for places using API key
    searchPlaces: async function(query, biasPosition = null) {
        try {
            console.log("🔍 Searching for places:", query);

            const searchData = {
                text: query,
                maxResults: 10,
                indexName: CONFIG.LOCATION.PLACE_INDEX_NAME,
                key: CONFIG.LOCATION.API_KEY
            };

            if (biasPosition) {
                searchData.biasPosition = [biasPosition.lng, biasPosition.lat];
            }

            // Build URL with query parameters
            const baseUrl = `https://places.geo.${CONFIG.LOCATION.REGION}.amazonaws.com/places/v0/indexes/${CONFIG.LOCATION.PLACE_INDEX_NAME}/search/text`;
            const urlParams = new URLSearchParams(searchData);
            const searchUrl = `${baseUrl}?${urlParams.toString()}`;

            const response = await fetch(searchUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log("🎯 Places search results:", result);
            return result.Results || [];
        } catch (error) {
            console.error("❌ Places search failed:", error);
            throw error;
        }
    },

    // Reverse geocoding using API key
    reverseGeocode: async function(lng, lat) {
        try {
            console.log("🔄 Reverse geocoding:", { lng, lat });

            const url = `https://places.geo.${CONFIG.LOCATION.REGION}.amazonaws.com/places/v0/indexes/${CONFIG.LOCATION.PLACE_INDEX_NAME}/search/position?key=${CONFIG.LOCATION.API_KEY}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Position: [lng, lat],
                    MaxResults: 1
                })
            });

            if (!response.ok) {
                throw new Error(`Reverse geocoding failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log("📍 Reverse geocoding result:", result);
            return result.Results && result.Results[0] || null;
        } catch (error) {
            console.error("❌ Reverse geocoding failed:", error);
            throw error;
        }
    },

    // Geocode address using API key
    geocodeAddress: async function(address, biasPosition = null) {
        try {
            console.log("🏠 Geocoding address:", address);

            const searchData = {
                text: address,
                maxResults: 1,
                indexName: CONFIG.LOCATION.PLACE_INDEX_NAME,
                key: CONFIG.LOCATION.API_KEY
            };

            if (biasPosition) {
                searchData.biasPosition = [biasPosition.lng, biasPosition.lat];
            }

            // Build URL with query parameters
            const baseUrl = `https://places.geo.${CONFIG.LOCATION.REGION}.amazonaws.com/places/v0/indexes/${CONFIG.LOCATION.PLACE_INDEX_NAME}/search/text`;
            const urlParams = new URLSearchParams(searchData);
            const searchUrl = `${baseUrl}?${urlParams.toString()}`;

            const response = await fetch(searchUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log("📍 Geocoding result:", result);
            return result.Results && result.Results[0] || null;
        } catch (error) {
            console.error("❌ Geocoding failed:", error);
            throw error;
        }
    },

    // Location picker for venue/event creation
    enableLocationPicker: function(callback) {
        console.log("📍 Enabling location picker mode");
        
        if (!this.isInitialized) {
            console.error("Map not initialized");
            return;
        }

        // Change cursor to crosshair
        this.map.getCanvas().style.cursor = 'crosshair';

        // Add click handler for location picking
        const pickLocationHandler = async (e) => {
            const { lng, lat } = e.lngLat;
            console.log("📍 Location picked:", { lng, lat });

            try {
                // Reverse geocode to get address
                const locationInfo = await this.reverseGeocode(lng, lat);
                
                const result = {
                    coordinates: [lng, lat],
                    address: locationInfo ? (locationInfo.Place?.Label || 'Unknown location') : 'Unknown location',
                    country: locationInfo ? locationInfo.Place?.Country : null,
                    region: locationInfo ? locationInfo.Place?.Region : null
                };

                // Add temporary marker
                const marker = new maplibregl.Marker({ color: '#ff6b6b' })
                    .setLngLat([lng, lat])
                    .addTo(this.map);

                // Remove click handler
                this.map.off('click', pickLocationHandler);
                this.map.getCanvas().style.cursor = '';

                console.log("✅ Location picker result:", result);
                callback(result, marker);

            } catch (error) {
                console.error("❌ Failed to get location info:", error);
                callback({
                    coordinates: [lng, lat],
                    address: 'Unknown location',
                    country: null,
                    region: null
                }, null);
            }
        };

        // Add the click handler
        this.map.on('click', pickLocationHandler);

        console.log("✅ Location picker enabled - click on map to select location");
    },

    // Disable location picker
    disableLocationPicker: function() {
        this.map.getCanvas().style.cursor = '';
        this.map.off('click'); // Remove all click handlers
        console.log("✅ Location picker disabled");
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
            this.displayMapError(`Failed to load venues: ${error.message}`);
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
    },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = MapService;
}