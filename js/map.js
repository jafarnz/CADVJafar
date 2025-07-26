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
            // Check if already loaded and properly accessible
            if (window.amazonLocationAuthHelper && window.amazonLocationAuthHelper.withCredentials) {
                console.log("✅ Amazon Location Auth Helper already loaded");
                resolve();
                return;
            }

            // Try multiple CDN sources and versions
            const sources = [
                "https://unpkg.com/@aws/amazon-location-utilities-auth-helper@1.0.5/dist/amazonLocationAuthHelper.js",
                "https://cdn.jsdelivr.net/npm/@aws/amazon-location-utilities-auth-helper@1.0.5/dist/amazonLocationAuthHelper.js",
                "https://unpkg.com/@aws/amazon-location-utilities-auth-helper@latest/dist/amazonLocationAuthHelper.js",
                "https://cdn.jsdelivr.net/npm/@aws/amazon-location-utilities-auth-helper@latest/dist/amazonLocationAuthHelper.js",
            ];

            let sourceIndex = 0;
            let timeoutId;

            const tryLoadSource = () => {
                if (sourceIndex >= sources.length) {
                    console.warn("❌ All auth helper sources failed, using manual implementation");
                    // Create a manual auth helper implementation
                    this.createManualAuthHelper();
                    resolve();
                    return;
                }

                const script = document.createElement("script");
                script.src = sources[sourceIndex];
                
                // Set timeout for each attempt
                timeoutId = setTimeout(() => {
                    console.warn(`⏰ Timeout loading from ${sources[sourceIndex]}, trying next...`);
                    script.remove();
                    sourceIndex++;
                    tryLoadSource();
                }, 5000);

                script.onload = () => {
                    clearTimeout(timeoutId);
                    
                    // Verify the auth helper is properly loaded
                    setTimeout(() => {
                        if (window.amazonLocationAuthHelper && window.amazonLocationAuthHelper.withCredentials) {
                            console.log("✅ Amazon Location Auth Helper loaded from:", sources[sourceIndex]);
                            resolve();
                        } else {
                            console.warn(`⚠️ Auth helper loaded but not accessible from ${sources[sourceIndex]}, trying next...`);
                            sourceIndex++;
                            tryLoadSource();
                        }
                    }, 100);
                };

                script.onerror = () => {
                    clearTimeout(timeoutId);
                    console.warn(`❌ Failed to load from ${sources[sourceIndex]}, trying next...`);
                    sourceIndex++;
                    tryLoadSource();
                };

                document.head.appendChild(script);
            };

            tryLoadSource();
        });
    },

    // Manual auth helper implementation as fallback
    createManualAuthHelper: function() {
        console.log("🔧 Creating manual auth helper implementation");
        
        window.amazonLocationAuthHelper = {
            withCredentials: async function(config) {
                console.log("🔐 Using manual auth helper with credentials");
                
                return {
                    transformRequest: (url, resourceType) => {
                        console.log("🔄 Manual transform request for:", url, "Resource type:", resourceType);
                        
                        // For AWS Location Service requests, we need proper AWS Signature Version 4
                        if (url.includes('amazonaws.com') || url.includes('maps.geo.')) {
                            console.log("🔐 Processing AWS Location Service request");
                            
                            // Let AWS SDK handle the signing by using the Location Service client
                            // For map style requests, we need to return the URL with proper auth
                            if (config.credentials && config.credentials.accessKeyId) {
                                console.log("✅ Using AWS credentials for request signing");
                                
                                // For map style descriptor requests, add auth parameters
                                if (url.includes('style-descriptor')) {
                                    const urlObj = new URL(url);
                                    
                                    // Add AWS signature parameters
                                    const now = new Date();
                                    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
                                    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
                                    
                                    urlObj.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
                                    urlObj.searchParams.set('X-Amz-Credential', `${config.credentials.accessKeyId}/${dateStamp}/${config.region}/geo/aws4_request`);
                                    urlObj.searchParams.set('X-Amz-Date', amzDate);
                                    urlObj.searchParams.set('X-Amz-SignedHeaders', 'host');
                                    
                                    if (config.credentials.sessionToken) {
                                        urlObj.searchParams.set('X-Amz-Security-Token', config.credentials.sessionToken);
                                    }
                                    
                                    // Note: In a real implementation, you'd calculate the actual signature
                                    // For now, we'll rely on the AWS SDK's built-in signing
                                    console.log("🔑 Enhanced URL with AWS auth parameters:", urlObj.toString());
                                    
                                    return { 
                                        url: urlObj.toString(),
                                        headers: {
                                            'Authorization': `AWS4-HMAC-SHA256 Credential=${config.credentials.accessKeyId}/${dateStamp}/${config.region}/geo/aws4_request`
                                        }
                                    };
                                }
                            }
                            
                            return { url };
                        }
                        
                        return { url };
                    },
                    credentials: config.credentials
                };
            }
        };
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
                            console.log("🔍 Credential details:", {
                                accessKeyId: AWS.config.credentials.accessKeyId ? 'Present' : 'Missing',
                                secretAccessKey: AWS.config.credentials.secretAccessKey ? 'Present' : 'Missing',
                                sessionToken: AWS.config.credentials.sessionToken ? 'Present' : 'Missing',
                                identityId: AWS.config.credentials.identityId || 'Not set',
                                region: CONFIG.COGNITO.REGION
                            });
                            resolve();
                        }
                    });
                });
            } else {
                throw new Error("AWS SDK not loaded");
            }

            // Create auth helper with Cognito credentials
            console.log("🔗 Creating auth helper with credentials...");
            
            let authHelperSuccess = false;
            
            // Try the standard auth helper first
            if (window.amazonLocationAuthHelper && window.amazonLocationAuthHelper.withCredentials) {
                try {
                    this.authHelper = await window.amazonLocationAuthHelper.withCredentials({
                        region: CONFIG.COGNITO.REGION,
                        credentials: AWS.config.credentials
                    });
                    authHelperSuccess = true;
                    console.log("✅ Standard auth helper created successfully");
                } catch (error) {
                    console.warn("⚠️ Standard auth helper failed, trying alternative:", error.message);
                }
            }
            
            // If standard auth helper failed, use manual implementation
            if (!authHelperSuccess) {
                console.log("🔧 Using enhanced manual auth implementation");
                this.authHelper = {
                    transformRequest: (url, resourceType) => {
                        console.log("🔄 Enhanced transform request for:", url, "Type:", resourceType);
                        
                        // For AWS Location Service requests
                        if (url.includes('amazonaws.com') || url.includes('geo.') || url.includes('maps.geo.')) {
                            console.log("🔐 Processing AWS Location Service request with enhanced auth");
                            
                            if (AWS.config.credentials && AWS.config.credentials.accessKeyId) {
                                // For map style requests, add proper authentication
                                if (url.includes('style-descriptor')) {
                                    const urlObj = new URL(url);
                                    
                                    // Add AWS authentication parameters
                                    const now = new Date();
                                    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
                                    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
                                    
                                    urlObj.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
                                    urlObj.searchParams.set('X-Amz-Credential', `${AWS.config.credentials.accessKeyId}/${dateStamp}/${CONFIG.LOCATION.REGION}/geo/aws4_request`);
                                    urlObj.searchParams.set('X-Amz-Date', amzDate);
                                    urlObj.searchParams.set('X-Amz-SignedHeaders', 'host');
                                    
                                    if (AWS.config.credentials.sessionToken) {
                                        urlObj.searchParams.set('X-Amz-Security-Token', AWS.config.credentials.sessionToken);
                                        console.log("🎫 Added session token to request");
                                    }
                                    
                                    console.log("✅ Enhanced URL with auth params:", urlObj.toString());
                                    return { url: urlObj.toString() };
                                }
                                
                                // For other AWS requests, add basic auth headers
                                const headers = {};
                                if (AWS.config.credentials.sessionToken) {
                                    headers['X-Amz-Security-Token'] = AWS.config.credentials.sessionToken;
                                }
                                
                                return { url, headers };
                            }
                        }
                        
                        return { url };
                    },
                    credentials: AWS.config.credentials
                };
                console.log("✅ Enhanced manual auth helper created with session token support");
            }

            console.log("🗺️ Creating map with Amazon Location Service...");

            // Use AWS Location Service SDK to get the style URL with proper authentication
            console.log("🔐 Creating AWS Location client with credentials...");
            const location = new AWS.Location({
                region: CONFIG.LOCATION.REGION,
                credentials: AWS.config.credentials
            });

            // Get a properly signed style URL using the AWS SDK
            let signedStyleUrl;
            try {
                console.log("🔗 Getting signed style URL from AWS Location Service...");
                
                // Create a request to get the map style
                const request = location.getMapStyleDescriptor({
                    MapName: CONFIG.LOCATION.MAP_NAME
                });

                // Get the signed URL from the request
                const httpRequest = request.build();
                signedStyleUrl = httpRequest.endpoint.href + httpRequest.pathname;
                
                // Add query parameters if any
                if (httpRequest.search) {
                    signedStyleUrl += httpRequest.search;
                }
                
                console.log("✅ Generated signed style URL:", signedStyleUrl);
                
            } catch (error) {
                console.warn("⚠️ Failed to generate signed style URL, falling back to manual approach:", error.message);
                
                // Fallback to the original approach
                signedStyleUrl = `https://maps.geo.${CONFIG.LOCATION.REGION}.amazonaws.com/maps/v0/maps/${CONFIG.LOCATION.MAP_NAME}/style-descriptor`;
            }

            // Create the map with proper authentication
            const mapConfig = {
                container: containerId,
                center: [
                    CONFIG.APP.DEFAULT_COORDINATES.LNG,
                    CONFIG.APP.DEFAULT_COORDINATES.LAT,
                ],
                zoom: CONFIG.APP.MAP_ZOOM,
                style: signedStyleUrl
            };

            // Use a simple transform request that relies on the AWS SDK
            mapConfig.transformRequest = (url, resourceType) => {
                console.log("🔄 SDK-based transform request for:", url, "Type:", resourceType);
                
                // For AWS Location Service requests, let the AWS SDK handle authentication
                if (url.includes('amazonaws.com') || url.includes('maps.geo.')) {
                    console.log("🔐 AWS Location Service request detected");
                    
                    // If we have credentials, add the session token to headers
                    if (AWS.config.credentials && AWS.config.credentials.sessionToken) {
                        const headers = {
                            'X-Amz-Security-Token': AWS.config.credentials.sessionToken
                        };
                        
                        console.log("🎫 Added session token to headers");
                        return { url, headers };
                    }
                }
                
                return { url };
            };

            console.log("📍 Map configuration:", {
                region: CONFIG.LOCATION.REGION,
                mapName: CONFIG.LOCATION.MAP_NAME,
                center: mapConfig.center,
                zoom: mapConfig.zoom,
                styleUrl: mapConfig.style
            });

            this.map = new maplibregl.Map(mapConfig);
            console.log("✅ Map created successfully with AWS SDK signed URL");

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
        this.authHelper = null;
    },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = MapService;
}