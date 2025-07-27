// AWS Location Service Map integration following official AWS guide
const MapService = {
    map: null,
    markers: [],
    venues: [],
    venueMarkers: [],
    userLocationMarker: null,
    isInitialized: false,

    // Initialize the map using AWS standard styles
    init: async function(containerId = "map") {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error("Map container not found:", containerId);
                return false;
            }

            console.log("🗺️ Starting map initialization with AWS standard styles...");

            // Initialize AWS SDK
            CONFIG.initializeAWS();

            // Check API key configuration
            if (!CONFIG.LOCATION.API_KEY || CONFIG.LOCATION.API_KEY === 'YOUR_API_KEY_HERE') {
                throw new Error("API Key not configured. Please set CONFIG.LOCATION.API_KEY");
            }

            // Load required libraries
            await this.loadMapLibreGL();

            // Initialize with AWS standard map style
            await this.initializeWithAWSStyles(containerId);

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
                console.log("✅ MapLibre GL already loaded");
                resolve();
                return;
            }

            // If not loaded via CDN, try to load it dynamically
            console.log("🔄 Loading MapLibre GL library...");
            
            // Load CSS first
            if (!document.querySelector('link[href*="maplibre-gl"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
                document.head.appendChild(link);
            }

            // Load JS
            if (!document.querySelector('script[src*="maplibre-gl"]')) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js';
                script.onload = () => {
                    console.log("✅ MapLibre GL loaded successfully");
                    resolve();
                };
                script.onerror = () => {
                    reject(new Error("Failed to load MapLibre GL library"));
                };
                document.head.appendChild(script);
            } else {
                // Script tag exists, wait a bit for it to load
                let attempts = 0;
                const checkLoad = () => {
                    if (window.maplibregl) {
                        console.log("✅ MapLibre GL loaded successfully");
                        resolve();
                    } else if (attempts < 50) { // 5 seconds max
                        attempts++;
                        setTimeout(checkLoad, 100);
                    } else {
                        reject(new Error("MapLibre GL failed to load after 5 seconds"));
                    }
                };
                checkLoad();
            }
        });
    },

    // Initialize map with AWS standard styles (following AWS guide exactly)
    initializeWithAWSStyles: async function(containerId) {
        try {
            console.log("🔐 Initializing with AWS standard styles...");

            // Use AWS standard style following the official guide exactly
            const apiKey = CONFIG.LOCATION.API_KEY;
            const region = CONFIG.LOCATION.REGION;
            const style = "Standard";  // AWS provided style
            const colorScheme = "Light";  // Light or Dark

            // Create style URL following AWS guide format
            const styleUrl = `https://maps.geo.${region}.amazonaws.com/v2/styles/${style}/descriptor?key=${apiKey}&color-scheme=${colorScheme}`;

            console.log("🗺️ Creating map with AWS standard style...");
            console.log("🔗 Style URL:", styleUrl);

            // Create map exactly as shown in AWS guide
            const mapConfig = {
                container: containerId,
                style: styleUrl,
                center: [
                    CONFIG.APP.DEFAULT_COORDINATES.LNG,
                    CONFIG.APP.DEFAULT_COORDINATES.LAT,
                ],
                zoom: CONFIG.APP.MAP_ZOOM
            };

            console.log("📍 Map configuration:", {
                region: region,
                style: style,
                colorScheme: colorScheme,
                center: mapConfig.center,
                zoom: mapConfig.zoom
            });

            // Create map instance
            this.map = new maplibregl.Map(mapConfig);

            // Add navigation controls as shown in AWS guide
            this.map.addControl(new maplibregl.NavigationControl(), "top-left");

            // Add geolocation control
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
            console.log("✅ Map fully initialized with AWS standard style");
        } catch (error) {
            console.error("❌ Failed to initialize map with AWS styles:", error);
            throw error;
        }
    },

    // AWS-only map initialization for venue creation
    initializeVenueMap: async function(containerId, options = {}) {
        try {
            console.log(`🗺️ Initializing AWS venue map for container: ${containerId}`);

            // Check if MapLibre GL is available
            if (!window.maplibregl) {
                await this.loadMapLibreGL();
            }

            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Map container '${containerId}' not found`);
            }

            // Validate AWS configuration
            if (!CONFIG.LOCATION.API_KEY || CONFIG.LOCATION.API_KEY === 'YOUR_API_KEY_HERE') {
                throw new Error("AWS Location Service API Key not configured");
            }

            // Default options
            const defaultOptions = {
                center: [103.8198, 1.3521], // Singapore default
                zoom: 11
            };

            // Merge options
            const mapOptions = { ...defaultOptions, ...options };

            // AWS Location Service style ONLY
            const apiKey = CONFIG.LOCATION.API_KEY;
            const region = CONFIG.LOCATION.REGION;
            const mapStyle = `https://maps.geo.${region}.amazonaws.com/v2/styles/Standard/descriptor?key=${apiKey}&color-scheme=Light`;
            
            console.log("🔐 Using AWS Location Service style ONLY");

            // Create the map
            const map = new window.maplibregl.Map({
                container: containerId,
                style: mapStyle,
                center: mapOptions.center,
                zoom: mapOptions.zoom
            });

            // Add navigation controls
            map.addControl(new window.maplibregl.NavigationControl(), 'top-left');
            
            // Add search control for location finding
            map.addControl(new window.maplibregl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: true
            }), 'top-left');

            // Wait for map to load
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("AWS Map load timeout after 15 seconds"));
                }, 15000);

                map.on('load', () => {
                    clearTimeout(timeout);
                    console.log("✅ AWS Map loaded successfully");
                    resolve();
                });

                map.on('error', (error) => {
                    clearTimeout(timeout);
                    console.error("❌ AWS Map error:", error);
                    reject(error);
                });
            });

            return map;

        } catch (error) {
            console.error("❌ Failed to initialize AWS venue map:", error);
            this.showMapError(containerId, `AWS Location Service Error: ${error.message}`);
            throw error;
        }
    },

    // Location search using your Lambda geocoding service (like Postman)
    searchLocation: async function(query, biasPosition = null) {
        try {
            console.log("🔍 Searching location via Lambda geocoding service:", query);

            if (!query || query.trim().length < 3) {
                return [];
            }

            // Use your existing /geocode endpoint (this one exists)
            const searchEndpoint = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.GEOCODE);
            
            const requestBody = {
                address: query.trim() + ", Singapore",  // Lambda expects 'address', not 'Text'
                maxResults: 10,
                biasPosition: biasPosition ? [biasPosition.lng, biasPosition.lat] : [103.8198, 1.3521]
            };

            console.log("🔍 Lambda geocode search request:", { url: searchEndpoint, body: requestBody });

            const response = await Utils.apiCall(searchEndpoint, {
                method: 'POST',
                headers: {
                    ...CONFIG.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log("🎯 Lambda geocode search results:", response);
            
            // Handle wrapped JSON response format
            let searchResults = [];
            
            if (response.message) {
                try {
                    // Parse the wrapped JSON message
                    const parsed = JSON.parse(response.message);
                    if (parsed.latitude && parsed.longitude) {
                        searchResults = [{
                            label: parsed.formatted || parsed.address || query + ", Singapore",
                            coordinates: [parsed.longitude, parsed.latitude],
                            country: parsed.country || 'Singapore',
                            region: parsed.region || 'Singapore',
                            address: parsed.formatted || parsed.address || query + ", Singapore"
                        }];
                    }
                } catch (parseError) {
                    console.error("Failed to parse wrapped JSON response:", parseError);
                }
            } else if (response.latitude && response.longitude) {
                // Direct response format
                searchResults = [{
                    label: response.formatted || response.address,
                    coordinates: [response.longitude, response.latitude],
                    country: response.country || 'Singapore',
                    region: response.region,
                    address: response.formatted || response.address
                }];
            }
            
            if (searchResults.length > 0) {
                console.log("📍 Parsed search results:", searchResults);
                return searchResults;
            }
        } catch (error) {
            console.error("❌ Location search via Lambda failed:", error);
            
            // Use simplified fallback as last resort
            console.warn("🔄 Using simplified search fallback");
            return [{
                label: query + ", Singapore",
                coordinates: [103.8198, 1.3521],
                country: "Singapore", 
                region: "Singapore",
                address: query + ", Singapore"
            }];
        }
    },

    // Enable location picker for venue creation
    enableVenueLocationPicker: function(map, callback) {
        console.log("📍 Enabling venue location picker");
        
        // Change cursor to crosshair
        map.getCanvas().style.cursor = 'crosshair';

        // Add click handler for location picking
        const pickLocationHandler = async (e) => {
            // Get precise coordinates from the click event
            const { lng, lat } = e.lngLat;
            
            // Log the exact click coordinates for debugging
            console.log("📍 Raw click coordinates:", { lng, lat });
            console.log("📍 Click event details:", {
                originalEvent: e.originalEvent,
                lngLat: e.lngLat,
                point: e.point
            });

            try {
                // Reverse geocode to get address
                const locationInfo = await this.reverseGeocode(lng, lat);
                
                const result = {
                    coordinates: [lng, lat],
                    lat: lat,
                    lng: lng,
                    address: locationInfo ? (locationInfo.Place?.Label || 'Unknown location') : 'Unknown location',
                    country: locationInfo ? locationInfo.Place?.Country : null,
                    region: locationInfo ? locationInfo.Place?.Region : null
                };

                // Add venue marker at exact coordinates
                const marker = new window.maplibregl.Marker({ 
                    color: '#ff6b6b',
                    scale: 1.2
                })
                .setLngLat([lng, lat])
                .addTo(map);

                // Remove click handler and reset cursor
                map.off('click', pickLocationHandler);
                map.getCanvas().style.cursor = '';

                console.log("✅ Venue location selected with precise coordinates:", result);
                callback(result, marker);

            } catch (error) {
                console.error("❌ Failed to get venue location info:", error);
                callback({
                    coordinates: [lng, lat],
                    lat: lat,
                    lng: lng,
                    address: 'Unknown location',
                    country: null,
                    region: null
                }, null);
            }
        };

        // Add the click handler
        map.on('click', pickLocationHandler);

        console.log("✅ Venue location picker enabled - click on map to select location");
    },

    // Add marker to map with modern styling
    addMarker: function(map, options) {
        if (!map || !window.maplibregl) return null;

        try {
            const marker = new window.maplibregl.Marker()
                .setLngLat([options.lng, options.lat]);

            if (options.popup) {
                const popup = new window.maplibregl.Popup({ 
                    offset: 25,
                    className: 'modern-popup'
                }).setHTML(options.popup);
                marker.setPopup(popup);
            }

            marker.addTo(map);
            return marker;
        } catch (error) {
            console.error("❌ Failed to add marker:", error);
            return null;
        }
    },

    // Show modern error message in map container
    showMapError: function(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                border: 2px solid #fecaca;
                border-radius: 16px;
                padding: 32px;
                text-align: center;
                color: #991b1b;
                min-height: 300px;
            ">
                <div style="font-size: 4rem; margin-bottom: 16px; opacity: 0.8;">🗺️</div>
                <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 1.2rem;">Map Unavailable</h3>
                <p style="margin: 0 0 24px 0; color: #7f1d1d; max-width: 400px; line-height: 1.5;">
                    ${message}
                </p>
                <button 
                    onclick="location.reload()" 
                    style="
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    "
                    onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(220,38,38,0.4)'"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                >
                    🔄 Retry
                </button>
            </div>
        `;
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

    // Search for places using your Lambda places search service
    searchPlaces: async function(query, biasPosition = null) {
        try {
            console.log("🔍 Searching for places via Lambda service:", query);

            // Use your existing /geocode endpoint (this one exists)
            const placesEndpoint = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.GEOCODE);
            
            const requestBody = {
                address: query + ", Singapore",  // Lambda expects 'address', not 'Text'
                maxResults: 10,
                biasPosition: biasPosition ? [biasPosition.lng, biasPosition.lat] : [103.8198, 1.3521]
            };

            console.log("🔍 Lambda places search request:", { url: placesEndpoint, body: requestBody });

            const response = await Utils.apiCall(placesEndpoint, {
                method: 'POST',
                headers: {
                    ...CONFIG.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log("🎯 Lambda places search results:", response);
            
            // Transform response to expected format (Lambda returns different structure)
            if (response.latitude && response.longitude) {
                return [{
                    Place: {
                        Label: response.formatted || response.address,
                        Geometry: {
                            Point: [response.longitude, response.latitude]
                        },
                        Country: response.country || "Singapore",
                        Region: response.region || "Singapore",
                        Municipality: response.municipality || "Singapore"
                    },
                    Relevance: response.confidence || 0.8
                }];
            } else {
                // Handle array results if any
                const results = response.results || response.data || [];
                return results.map(place => ({
                    Place: {
                        Label: place.label || place.formatted,
                        Geometry: {
                            Point: [place.longitude, place.latitude]
                        },
                        Country: place.country || "Singapore",
                        Region: place.region || "Singapore",
                        Municipality: place.municipality || "Singapore"
                    },
                    Relevance: place.confidence || 0.8
                }));
            }
        } catch (error) {
            console.error("❌ Places search via Lambda failed:", error);
            
            // Fallback to simple result
            console.warn("🔄 Using simplified places search fallback");
            return [{
                Place: {
                    Label: query + ", Singapore",
                    Geometry: {
                        Point: [103.8198, 1.3521]
                    },
                    Country: "Singapore",
                    Region: "Singapore",
                    Municipality: "Singapore"
                },
                Relevance: 0.8
            }];
        }
    },

    // Reverse geocoding using AWS Location Services
    reverseGeocode: async function(lng, lat) {
        try {
            console.log("🔄 Reverse geocoding:", { lng, lat });

            const url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.REVERSE_GEOCODE);
            const response = await Utils.apiCall(url, {
                method: "POST",
                headers: CONFIG.getAuthHeaders(),
                body: JSON.stringify({
                    longitude: lng,
                    latitude: lat
                })
            });

            if (response && response.address) {
                console.log("📍 Reverse geocoding result:", response.address);
                return {
                    Place: {
                        Label: response.address
                    },
                    address: response.address
                };
            }

            throw new Error("No address found");

        } catch (error) {
            console.warn("🚨 Reverse geocoding failed:", error);
            
            // Simple fallback - just return coordinates
            const locationName = `${lat}, ${lng}`;
            
            console.log("📍 Reverse geocoding result (coordinate fallback):", locationName);
            
            return {
                Place: {
                    Label: locationName
                },
                address: locationName
            };
        }
    },

    // Geocode address using your Lambda geocoding service
    geocodeAddress: async function(address, biasPosition = null) {
        try {
            console.log("🏠 Geocoding address via Lambda service:", address);

            // Use your existing /geocode endpoint (this one exists)
            const geocodeEndpoint = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.GEOCODE);
            
            const requestBody = {
                address: address + ", Singapore",  // Lambda expects 'address', not 'Text'
                maxResults: 1,
                biasPosition: biasPosition ? [biasPosition.lng, biasPosition.lat] : [103.8198, 1.3521]
            };

            console.log("🏠 Lambda geocode request:", { url: geocodeEndpoint, body: requestBody });

            const response = await Utils.apiCall(geocodeEndpoint, {
                method: 'POST',
                headers: {
                    ...CONFIG.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log("📍 Lambda geocoding result:", response);
            
            // Handle wrapped JSON response format
            let coordinates = null;
            
            if (response.message) {
                try {
                    // Parse the wrapped JSON message
                    const parsed = JSON.parse(response.message);
                    if (parsed.latitude && parsed.longitude) {
                        coordinates = {
                            lat: parsed.latitude,
                            lng: parsed.longitude,
                            formatted: parsed.formatted || address + ", Singapore"
                        };
                    }
                } catch (parseError) {
                    console.error("Failed to parse wrapped JSON response:", parseError);
                }
            } else if (response.latitude && response.longitude) {
                // Direct response format
                coordinates = {
                    lat: response.latitude,
                    lng: response.longitude,
                    formatted: response.formatted || response.address || address + ", Singapore"
                };
            }
            
            if (coordinates) {
                console.log("📍 Parsed coordinates:", coordinates);
                return coordinates;
            }
            
            // If no results, fall back to default coordinates
            throw new Error("No geocoding results");
            
        } catch (error) {
            console.error("❌ Geocoding via Lambda failed:", error);
            
            // Fallback to default Singapore coordinates
            const lat = 1.3521;
            const lng = 103.8198;
            
            console.log("📍 Geocoding result (fallback):", { lat, lng, address });
            
            return {
                lat: lat,
                lng: lng,
                formatted: address + ", Singapore"
            };
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
            // Get precise coordinates from the click event
            const { lng, lat } = e.lngLat;
            
            // Log the exact click coordinates for debugging
            console.log("📍 Raw click coordinates:", { lng, lat });
            console.log("📍 Click event details:", {
                originalEvent: e.originalEvent,
                lngLat: e.lngLat,
                point: e.point
            });

            try {
                // Reverse geocode to get address
                const locationInfo = await this.reverseGeocode(lng, lat);
                
                const result = {
                    coordinates: [lng, lat],
                    lat: lat,
                    lng: lng,
                    address: locationInfo ? (locationInfo.Place?.Label || 'Unknown location') : 'Unknown location',
                    country: locationInfo ? locationInfo.Place?.Country : null,
                    region: locationInfo ? locationInfo.Place?.Region : null
                };

                // Add temporary marker at exact coordinates
                const marker = new maplibregl.Marker({ color: '#ff6b6b' })
                    .setLngLat([lng, lat])
                    .addTo(this.map);

                // Remove click handler and reset cursor
                this.map.off('click', pickLocationHandler);
                this.map.getCanvas().style.cursor = '';

                console.log("✅ Location picker result with precise coordinates:", result);
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

    // Event Pins Functionality
    // Add event pins to map showing events at their venue locations
    addEventPins: async function() {
        if (!this.map) {
            console.warn("Map not initialized for event pins");
            return 0;
        }

        try {
            console.log("🎯 Adding event pins to map...");
            
            // Load event pins using the EventPinsService
            if (typeof EventPinsService !== 'undefined') {
                const pinsCount = await EventPinsService.initEventPins(this.map);
                console.log(`✅ Added ${pinsCount} event pins to map`);
                return pinsCount;
            } else {
                console.warn("EventPinsService not available - make sure event-pins.js is loaded");
                return 0;
            }
        } catch (error) {
            console.error("❌ Failed to add event pins:", error);
            return 0;
        }
    },

    // Clear event pins from map
    clearEventPins: function() {
        if (typeof EventPinsService !== 'undefined') {
            EventPinsService.clearEventMarkers();
            console.log("🧹 Cleared event pins from map");
        }
    },

    // Update event pins (refresh data)
    updateEventPins: async function() {
        console.log("🔄 Updating event pins...");
        this.clearEventPins();
        return await this.addEventPins();
    },

    // Show both venue markers and event pins
    showVenuesAndEvents: async function() {
        try {
            console.log("🗺️ Loading venues and event pins...");
            
            // Load venues first
            await this.loadVenues();
            this.addVenueMarkers();
            
            // Then add event pins
            const pinsCount = await this.addEventPins();
            
            console.log(`✅ Map loaded with ${this.venueMarkers.length} venues and ${pinsCount} event pins`);
            return { venues: this.venueMarkers.length, events: pinsCount };
        } catch (error) {
            console.error("❌ Failed to load venues and events:", error);
            return { venues: 0, events: 0 };
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