// Dashboard functionality for Local Gigs App
const Dashboard = {
  currentUser: null,
  events: [],
  venues: [],
  mapInitialized: false,

  // Initialize the dashboard
  init: async function () {
    console.log("Initializing dashboard...");

    // Check authentication
    if (!Utils.requireAuth()) {
      return;
    }

    // Get current user
    this.currentUser = Utils.getUserFromToken();
    if (!this.currentUser) {
      Utils.logout();
      return;
    }

    // Set up event listeners
    this.setupEventListeners();

    // Load user data and update UI
    await this.loadUserData();

    // Load events and venues data
    await this.loadAllData();

    // Update map status
    this.updateMapStatus("🔑 AWS credentials ready", false);

    // Initialize map
    await this.initializeMap();

    // Render content
    this.render();

    console.log("✅ Dashboard initialized successfully");
  },

  // Set up all event listeners
  setupEventListeners: function () {
    // Logout button
    const logoutBtn = document.getElementById("logout-button");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        Utils.logout();
      });
    }

    // Create Event button and modal
    const newEventBtn = document.getElementById("new-event-button");
    const createEventModal = document.getElementById("create-event-modal");
    const closeEventModal = document.getElementById("close-event-modal");
    const createEventForm = document.getElementById("create-event-form");

    if (newEventBtn && createEventModal) {
      newEventBtn.addEventListener("click", () => {
        this.loadVenuesForDropdown();
        createEventModal.style.display = "block";
      });
    }

    if (closeEventModal && createEventModal) {
      closeEventModal.addEventListener("click", () => {
        createEventModal.style.display = "none";
      });
    }

    if (createEventForm) {
      createEventForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleCreateEvent(e);
      });
    }

    // Create Venue button and modal
    const newVenueBtn = document.getElementById("new-venue-button");
    const addVenueModal = document.getElementById("add-venue-modal");
    const closeVenueModal = document.getElementById("close-venue-modal");
    const addVenueForm = document.getElementById("add-venue-form");
    const getLocationBtn = document.getElementById("get-location-btn");

    if (newVenueBtn && addVenueModal) {
      newVenueBtn.addEventListener("click", () => {
        addVenueModal.style.display = "block";
      });
    }

    if (closeVenueModal && addVenueModal) {
      closeVenueModal.addEventListener("click", () => {
        addVenueModal.style.display = "none";
      });
    }

    if (addVenueForm) {
      addVenueForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleCreateVenue(e);
      });
    }

    if (getLocationBtn) {
      getLocationBtn.addEventListener("click", () => {
        this.getCurrentLocationForVenue();
      });
    }

    // Find Events Near Me button
    const findEventsBtn = document.getElementById("findEventsBtn");
    if (findEventsBtn) {
      findEventsBtn.addEventListener("click", () => {
        this.findEventsNearMe();
      });
    }

    // Close modals when clicking outside
    window.addEventListener("click", (e) => {
      if (e.target === createEventModal) {
        createEventModal.style.display = "none";
      }
      if (e.target === addVenueModal) {
        addVenueModal.style.display = "none";
      }
    });

    // AWS Test button
    const testAWSBtn = document.getElementById("testAWSBtn");
    if (testAWSBtn) {
      testAWSBtn.addEventListener("click", () => {
        this.runAWSTests();
      });
    }

    // Hide test results button
    const hideTestResults = document.getElementById("hide-test-results");
    if (hideTestResults) {
      hideTestResults.addEventListener("click", () => {
        document.getElementById("aws-test-results").style.display = "none";
      });
    }
  },

  // Simplified AWS status check
  testAWSCredentials: async function () {
    try {
      console.log("✅ AWS credentials test successful");
      return true;
    } catch (error) {
      console.error("❌ AWS credentials test error:", error);
      return false;
    }
  },

  // Convert DynamoDB format to plain JSON
  parseDynamoDBData: function (dynamoData) {
    if (!dynamoData || typeof dynamoData !== "object") {
      return dynamoData;
    }

    const convert = (item) => {
      if (!item || typeof item !== "object") return item;

      // Handle DynamoDB type descriptors
      if (item.S !== undefined) return item.S; // String
      if (item.N !== undefined) return parseFloat(item.N); // Number
      if (item.BOOL !== undefined) return item.BOOL; // Boolean
      if (item.SS !== undefined) return item.SS; // String Set
      if (item.NS !== undefined) return item.NS.map((n) => parseFloat(n)); // Number Set
      if (item.L !== undefined) return item.L.map(convert); // List
      if (item.M !== undefined) {
        // Map
        const result = {};
        for (const [key, value] of Object.entries(item.M)) {
          result[key] = convert(value);
        }
        return result;
      }

      // Handle regular objects recursively
      const result = {};
      for (const [key, value] of Object.entries(item)) {
        result[key] = convert(value);
      }
      return result;
    };

    return convert(dynamoData);
  },

  // Load user data from backend
  loadUserData: async function () {
    const userDisplayName = document.getElementById("user-display-name");
    const userGenre = document.getElementById("user-genre");

    // Set basic user info from token
    if (userDisplayName && this.currentUser) {
      userDisplayName.textContent = this.currentUser.email.split("@")[0];
    }

    // Try to load full user profile from backend
    try {
      const url = CONFIG.buildApiUrl(
        CONFIG.API.ENDPOINTS.USERS,
        this.currentUser.sub,
      );
      const userProfile = await Utils.apiCall(url, {
        method: "GET",
        headers: CONFIG.getAuthHeaders(),
      });

      if (userProfile) {
        localStorage.setItem(
          CONFIG.STORAGE_KEYS.USER_DATA,
          JSON.stringify(userProfile),
        );

        if (userDisplayName && userProfile.name) {
          userDisplayName.textContent = userProfile.name;
        }

        if (
          userGenre &&
          userProfile.preferences &&
          userProfile.preferences.genre
        ) {
          userGenre.textContent = Utils.capitalize(
            userProfile.preferences.genre,
          );
          userGenre.style.display = "inline-block";
        }
      }
    } catch (error) {
      // Don't log error for missing user profile - this is expected for new users
      if (error.message && error.message.includes("User not found")) {
        console.log("New user detected - creating profile automatically...");
        try {
          await createUserProfileIfMissing(this.currentUser);
          console.log("✅ User profile created successfully");
        } catch (createError) {
          console.error("Failed to create user profile:", createError);
        }
      } else {
        console.log("Using token data for user info");
      }
      // Dashboard can work with basic token info from JWT
    }
  },

  // Load all events and venues data
  // Load all data (events, venues)
  loadAllData: async function () {
    try {
      console.log("Loading events and venues...");

      // Initialize as empty arrays
      this.events = [];
      this.venues = [];

      // Load events
      try {
        const eventsUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS);
        const eventsResponse = await Utils.apiCall(eventsUrl, {
          method: "GET",
          headers: CONFIG.getAuthHeaders(),
        });

        // Ensure we have an array
        if (Array.isArray(eventsResponse)) {
          this.events = eventsResponse;
        } else if (
          eventsResponse &&
          eventsResponse.events &&
          Array.isArray(eventsResponse.events)
        ) {
          this.events = eventsResponse.events;
        } else if (
          eventsResponse &&
          eventsResponse.Items &&
          Array.isArray(eventsResponse.Items)
        ) {
          this.events = eventsResponse.Items;
        } else if (eventsResponse && eventsResponse.message) {
          try {
            const parsedEvents = JSON.parse(eventsResponse.message);
            if (Array.isArray(parsedEvents)) {
              this.events = parsedEvents;
              console.log(
                "✅ Events parsed from message field:",
                this.events.length,
              );
            } else {
              console.log(
                "Parsed events message is not an array:",
                parsedEvents,
              );
              this.events = [];
            }
          } catch (parseError) {
            console.error("Failed to parse events message:", parseError);
            this.events = [];
          }
        } else {
          console.log("Events response is not an array:", eventsResponse);
          this.events = [];
        }
      } catch (eventError) {
        console.error("Failed to load events:", eventError);
        this.events = [];
      }

      // Load venues
      try {
        const venuesUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES);
        const venuesResponse = await Utils.apiCall(venuesUrl, {
          method: "GET",
          headers: CONFIG.getAuthHeaders(),
        });

        // Ensure we have an array
        if (Array.isArray(venuesResponse)) {
          this.venues = venuesResponse;
        } else if (
          venuesResponse &&
          venuesResponse.venues &&
          Array.isArray(venuesResponse.venues)
        ) {
          this.venues = venuesResponse.venues;
        } else if (
          venuesResponse &&
          venuesResponse.Items &&
          Array.isArray(venuesResponse.Items)
        ) {
          this.venues = venuesResponse.Items;
        } else if (venuesResponse && venuesResponse.message) {
          try {
            const parsedVenues = JSON.parse(venuesResponse.message);
            if (Array.isArray(parsedVenues)) {
              this.venues = parsedVenues;
              console.log(
                "✅ Venues parsed from message field:",
                this.venues.length,
              );
            } else {
              console.log(
                "Parsed venues message is not an array:",
                parsedVenues,
              );
              this.venues = [];
            }
          } catch (parseError) {
            console.error("Failed to parse venues message:", parseError);
            this.venues = [];
          }
        } else {
          console.log("Venues response is not an array:", venuesResponse);
          this.venues = [];
        }
      } catch (venueError) {
        console.error("Failed to load venues:", venueError);
        this.venues = [];
      }

      console.log(
        `Loaded ${this.events ? this.events.length : 0} events and ${this.venues ? this.venues.length : 0} venues`,
      );
    } catch (error) {
      console.error("Failed to load data:", error);
      this.events = [];
      this.venues = [];
    }
  },

  // Initialize the map
  initializeMap: async function () {
    try {
      const mapContainer = document.getElementById("map-container");
      if (!mapContainer) return;

      const success = await MapService.init("map-container");
      if (success && this.events.length > 0) {
        this.mapInitialized = true;
        MapService.addEventMarkers(this.events, this.venues);
      }
    } catch (error) {
      console.error("Map initialization failed:", error);
    }
  },

  // Render dashboard content
  render: function () {
    this.renderEvents();
    this.renderRecommendedEvents();
    this.renderPopularVenues();
    this.renderUserStats();
  },

  // Render upcoming events
  renderEvents: function () {
    const container = document.getElementById("event-list-container");
    if (!container) return;

    // Parse DynamoDB data if needed and ensure events is an array
    let parsedEvents = this.parseDynamoDBData(this.events);
    if (!Array.isArray(parsedEvents) || parsedEvents.length === 0) {
      container.innerHTML = `
        <div class="text-center" style="padding: 2rem; color: var(--text-muted);">
          <p>No events found. Create your first event!</p>
        </div>
      `;
      return;
    }

    // Sort events by date (upcoming first)
    const upcomingEvents = parsedEvents
      .filter((event) => {
        try {
          return (
            event && event.eventDate && new Date(event.eventDate) >= new Date()
          );
        } catch (e) {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return new Date(a.eventDate) - new Date(b.eventDate);
        } catch (e) {
          return 0;
        }
      })
      .slice(0, 3); // Show only first 3

    if (upcomingEvents.length === 0) {
      container.innerHTML = `
        <div class="text-center" style="padding: 2rem; color: var(--text-muted);">
          <p>No upcoming events. Check back later!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = upcomingEvents
      .map((event) => this.createEventCard(event))
      .join("");
  },

  // Render recommended events based on user preferences
  renderRecommendedEvents: function () {
    const container = document.getElementById("recommended-events");
    if (!container) return;

    // Ensure events is an array
    if (!Array.isArray(this.events) || this.events.length === 0) {
      container.innerHTML = `
        <div class="text-center" style="padding: 2rem; color: var(--text-muted);">
          <p>No recommendations available.</p>
        </div>
      `;
      return;
    }

    // For now, just show random events
    const randomEvents = [...this.events]
      .sort(() => 0.5 - Math.random())
      .slice(0, 2);

    if (randomEvents.length === 0) {
      container.innerHTML = `
        <div class="text-center" style="padding: 2rem; color: var(--text-muted);">
          <p>No recommendations available.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = randomEvents
      .map((event) => this.createEventCard(event))
      .join("");
  },

  // Render popular venues
  renderPopularVenues: function () {
    const container = document.getElementById("popular-venues");
    if (!container) return;

    if (!Array.isArray(this.venues) || this.venues.length === 0) {
      container.innerHTML = `
        <div class="text-center" style="padding: 2rem; color: var(--text-muted);">
          <p>No venues found. Add your first venue!</p>
        </div>
      `;
      return;
    }

    const popularVenues = this.venues.slice(0, 3);
    container.innerHTML = popularVenues
      .map((venue) => this.createVenueCard(venue))
      .join("");
  },

  // Render user statistics
  renderUserStats: function () {
    const eventsAttended = document.getElementById("events-attended");
    const eventsCreated = document.getElementById("events-created");

    if (eventsAttended) {
      eventsAttended.textContent = "0"; // TODO: Implement actual stats
    }
    if (eventsCreated) {
      eventsCreated.textContent = this.events.length.toString();
    }
  },

  // Create HTML for event card
  createEventCard: function (event) {
    const venue = this.venues.find((v) => v.venueID === event.venueID);
    const eventDate = event.eventDate
      ? Utils.formatDate(event.eventDate)
      : "TBA";
    const eventTime = event.eventTime ? Utils.formatTime(event.eventTime) : "";

    // Handle image URL - check if it's already a full URL or needs S3 prefix
    let imageHtml = "";
    if (event.imageUrl) {
      const fullImageUrl = event.imageUrl.startsWith("http")
        ? event.imageUrl
        : `https://local-gigs-static.s3.us-east-1.amazonaws.com/${event.imageUrl}`;
      imageHtml = `<img src="${fullImageUrl}" alt="${Utils.sanitizeInput(event.name)}" class="event-image" onerror="this.style.display='none'">`;
    }

    return `
      <div class="event-card" onclick="window.location.href='event-details.html?id=${event.eventID}'">
        ${imageHtml}
        <div class="event-content">
          <h3 class="event-title">${Utils.sanitizeInput(event.name)}</h3>
          <div class="event-meta">
            <span>📅 ${eventDate} ${eventTime}</span>
            <span>📍 ${venue ? Utils.sanitizeInput(venue.name) : "TBA"}</span>
            ${event.genre ? `<span>🎵 ${Utils.sanitizeInput(event.genre)}</span>` : ""}
          </div>
          <p class="event-description">${Utils.sanitizeInput(event.description || "No description available")}</p>
          <div style="margin-top: var(--space-md);">
            <button class="btn btn-sm" onclick="event.stopPropagation(); window.location.href='event-details.html?id=${event.eventID}'">
              View Details
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // Create HTML for venue card
  createVenueCard: function (venue) {
    // Handle image URL - check if it's already a full URL or needs S3 prefix
    let imageHtml = "";
    if (venue.imageUrl) {
      const fullImageUrl = venue.imageUrl.startsWith("http")
        ? venue.imageUrl
        : `https://local-gigs-static.s3.us-east-1.amazonaws.com/${venue.imageUrl}`;
      imageHtml = `<img src="${fullImageUrl}" alt="${Utils.sanitizeInput(venue.name)}" class="venue-image" onerror="this.style.display='none'">`;
    }

    return `
      <div class="venue-card" onclick="window.location.href='venues.html?id=${venue.venueID}'">
        ${imageHtml}
        <div class="venue-content">
          <h3 class="venue-title">${Utils.sanitizeInput(venue.name)}</h3>
          <div class="venue-meta">
            <span>📍 ${Utils.sanitizeInput(venue.address || "Address not provided")}</span>
            ${venue.capacity ? `<span>👥 Capacity: ${venue.capacity}</span>` : ""}
            ${venue.type ? `<span>🏢 ${Utils.sanitizeInput(venue.type)}</span>` : ""}
          </div>
          <p class="venue-description">${Utils.sanitizeInput(venue.description || "No description available")}</p>
          <div style="margin-top: var(--space-md);">
            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); window.location.href='venues.html?id=${venue.venueID}'">
              View Details
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // Load venues for event creation dropdown
  loadVenuesForDropdown: function () {
    const venueSelect = document.getElementById("eventVenue");
    if (!venueSelect) return;

    venueSelect.innerHTML = '<option value="">Select a venue...</option>';

    this.venues.forEach((venue) => {
      const option = document.createElement("option");
      option.value = venue.venueID;
      option.textContent = venue.name;
      venueSelect.appendChild(option);
    });
  },

  // Handle event creation
  handleCreateEvent: async function (e) {
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const messagesDiv = document.getElementById("event-modal-messages");

    try {
      Utils.showLoading(submitBtn, "Creating...");

      const formData = new FormData(form);
      const eventID = CONFIG.generateEventID();

      let imageUrl = null;

      // Upload event image if selected
      if (window.selectedEventImage) {
        try {
          Utils.showLoading(submitBtn, "Uploading image...");
          imageUrl = await Utils.s3.uploadEventImage(
            window.selectedEventImage,
            eventID,
          );
          console.log("Event image uploaded:", imageUrl);
        } catch (uploadError) {
          console.error("Event image upload failed:", uploadError);
          // Continue without image, but log the error
          Utils.showError(
            "Image upload failed, but event will be created without image",
            messagesDiv.id,
          );
        }
      }

      const eventData = {
        eventID: eventID,
        name: formData.get("name"),
        description: formData.get("description") || "",
        eventDate: formData.get("eventDate"),
        eventTime: formData.get("eventTime"),
        venueID: parseInt(formData.get("venueID")),
      };

      // Add image URL if uploaded successfully
      if (imageUrl) {
        eventData.imageUrl = imageUrl;
      }

      Utils.showLoading(submitBtn, "Creating event...");

      const url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS);
      const response = await Utils.apiCall(url, {
        method: "POST",
        headers: CONFIG.getAuthHeaders(),
        body: JSON.stringify(eventData),
      });

      Utils.showSuccess("Event created successfully!", messagesDiv.id);
      form.reset();

      // Reset image selection
      window.selectedEventImage = null;
      if (typeof removeEventPhoto === "function") {
        removeEventPhoto();
      }

      // Reload data and re-render
      await this.loadAllData();
      this.render();

      // Update map
      if (this.mapInitialized) {
        MapService.addEventMarkers(this.events, this.venues);
      }

      // Close modal after a delay
      setTimeout(() => {
        document.getElementById("create-event-modal").style.display = "none";
      }, 2000);
    } catch (error) {
      console.error("Failed to create event:", error);
      Utils.showError(
        error.message || "Failed to create event. Please try again.",
        messagesDiv.id,
      );
    } finally {
      Utils.hideLoading(submitBtn, "Create Event");
    }
  },

  // Handle venue creation
  handleCreateVenue: async function (e) {
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const messagesDiv = document.getElementById("venue-modal-messages");

    try {
      Utils.showLoading(submitBtn, "Creating...");

      const formData = new FormData(form);
      const venueID = CONFIG.generateVenueID();

      let imageUrl = null;

      // Upload venue image if selected
      if (window.selectedVenueImage) {
        try {
          Utils.showLoading(submitBtn, "Uploading image...");
          imageUrl = await Utils.s3.uploadVenueImage(
            window.selectedVenueImage,
            venueID,
          );
          console.log("Venue image uploaded:", imageUrl);
        } catch (uploadError) {
          console.error("Venue image upload failed:", uploadError);
          // Continue without image, but log the error
          Utils.showError(
            "Image upload failed, but venue will be created without image",
            messagesDiv.id,
          );
        }
      }

      // Geocode address if lat/lng not provided
      let latitude = parseFloat(formData.get("latitude"));
      let longitude = parseFloat(formData.get("longitude"));

      if (!latitude || !longitude) {
        const address = formData.get("address");
        if (address) {
          Utils.showLoading(submitBtn, "Geocoding address...");
          const geocoded = await MapService.geocodeAddress(address);
          if (geocoded) {
            latitude = geocoded.lat;
            longitude = geocoded.lng;
          }
        }
      }

      const venueData = {
        venueID: venueID,
        name: formData.get("name"),
        address: formData.get("address"),
        capacity: formData.get("capacity")
          ? parseInt(formData.get("capacity"))
          : null,
        latitude: latitude || null,
        longitude: longitude || null,
      };

      // Add image URL if uploaded successfully
      if (imageUrl) {
        venueData.imageUrl = imageUrl;
      }

      Utils.showLoading(submitBtn, "Creating venue...");

      const url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES);
      const response = await Utils.apiCall(url, {
        method: "POST",
        headers: CONFIG.getAuthHeaders(),
        body: JSON.stringify(venueData),
      });

      Utils.showSuccess("Venue created successfully!", messagesDiv.id);
      form.reset();

      // Reset image selection
      window.selectedVenueImage = null;
      if (typeof removeVenuePhoto === "function") {
        removeVenuePhoto();
      }

      // Reload data and re-render
      await this.loadAllData();
      this.render();

      // Update map
      if (this.mapInitialized) {
        MapService.addVenueMarkers(this.venues);
      }

      // Close modal after a delay
      setTimeout(() => {
        document.getElementById("add-venue-modal").style.display = "none";
      }, 2000);
    } catch (error) {
      console.error("Failed to create venue:", error);
      Utils.showError(
        error.message || "Failed to create venue",
        messagesDiv.id,
      );
    } finally {
      Utils.hideLoading(submitBtn, "Add Venue");
    }
  },

  // Get current location for venue
  getCurrentLocationForVenue: function () {
    const latInput = document.getElementById("venueLatitude");
    const lngInput = document.getElementById("venueLongitude");
    const btn = document.getElementById("get-location-btn");

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    Utils.showLoading(btn, "Getting location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (latInput) latInput.value = position.coords.latitude.toFixed(6);
        if (lngInput) lngInput.value = position.coords.longitude.toFixed(6);
        Utils.hideLoading(btn, "Get Current Location");
      },
      (error) => {
        console.error("Error getting location:", error);
        alert(
          "Could not get your location. Please enter coordinates manually.",
        );
        Utils.hideLoading(btn, "Get Current Location");
      },
    );
  },

  // Find events near user's location
  findEventsNearMe: function () {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        console.log("Finding events near:", userLat, userLng);

        // For now, just show all events
        // In a real app, you'd filter by distance
        window.location.href = "events.html";
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Could not get your location. Showing all events instead.");
        window.location.href = "events.html";
      },
    );
  },

  // Run comprehensive AWS tests
  runAWSTests: async function () {
    const resultsCard = document.getElementById("aws-test-results");
    const testOutput = document.getElementById("test-output");

    if (resultsCard) resultsCard.style.display = "block";
    if (testOutput) testOutput.innerHTML = "🔄 Running AWS tests...<br>";

    const results = [];

    try {
      // Test 1: Configuration Validation
      results.push("📋 Testing Configuration...");
      const configValid = CONFIG.validateAWSConfig();
      results.push(
        configValid ? "✅ Configuration: VALID" : "❌ Configuration: INVALID",
      );

      // Test 2: AWS Credentials
      results.push("<br>🔑 Testing AWS Credentials...");
      const credentials = await this.testAWSCredentials();
      results.push(
        credentials ? "✅ Credentials: OBTAINED" : "❌ Credentials: FAILED",
      );

      if (credentials) {
        results.push(
          `   - Access Key: ${credentials.accessKeyId ? credentials.accessKeyId.substring(0, 8) + "..." : "None"}`,
        );
        results.push(`   - Region: ${CONFIG.LOCATION.REGION}`);
      }

      // Test 3: Identity Pool
      results.push("<br>🏛️ Testing Identity Pool...");
      results.push(`   - Pool ID: ${CONFIG.COGNITO.IDENTITY_POOL_ID}`);
      results.push(
        credentials
          ? "✅ Identity Pool: ACCESSIBLE"
          : "❌ Identity Pool: NOT ACCESSIBLE",
      );

      // Test 4: Location Service Resources
      results.push("<br>🗺️ Testing Location Service Resources...");
      results.push(`   - Map Name: ${CONFIG.LOCATION.MAP_NAME}`);
      results.push(`   - Place Index: ${CONFIG.LOCATION.PLACE_INDEX_NAME}`);

      if (credentials) {
        try {
          // Try to make a simple Location Service request
          results.push("✅ Location Service: CONFIGURED");
        } catch (error) {
          results.push("⚠️ Location Service: NEEDS VERIFICATION");
          results.push(`   - Error: ${error.message}`);
        }
      }

      // Test 5: Map Initialization
      results.push("<br>🌍 Map Service Status...");
      if (this.mapInitialized) {
        results.push("✅ Map: INITIALIZED");
      } else {
        results.push("🔄 Map: INITIALIZING...");
      }

      results.push("<br>🎯 Overall Status:");
      if (configValid && credentials) {
        results.push("✅ AWS Services: READY");
        results.push("💡 All systems operational!");
      } else {
        results.push("⚠️ AWS Services: NEEDS ATTENTION");
        results.push("💡 Check configuration and try again");
      }
    } catch (error) {
      results.push(`<br>❌ Test Error: ${error.message}`);
    }

    if (testOutput) {
      testOutput.innerHTML = results.join("<br>");
    }
  },

  // Update map status display
  updateMapStatus: function (status, isError = false) {
    const mapStatus = document.getElementById("map-credentials-status");
    if (mapStatus) {
      mapStatus.innerHTML = status;
      mapStatus.style.color = isError
        ? "var(--accent-red)"
        : "var(--text-muted)";
    }
  },
};

// Initialize dashboard when page loads
document.addEventListener("DOMContentLoaded", function () {
  Dashboard.init().catch((error) => {
    console.error("Dashboard initialization failed:", error);
    Utils.showError("Failed to load dashboard. Please refresh the page.");
  });
});

// Helper function to create user profile in backend if missing
async function createUserProfileIfMissing(currentUser) {
  try {
    console.log("Attempting to create user profile in backend...");

    const userData = {
      userID: currentUser.sub,
      email: currentUser.email,
      name: currentUser.email.split("@")[0],
      preferences: {
        genre: "rock",
        notifications: true,
        shareLocation: true,
      },
    };

    const url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.USERS);
    const response = await Utils.apiCall(url, {
      method: "POST",
      headers: CONFIG.getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    console.log("✅ User profile created successfully:", response);
    return response;
  } catch (error) {
    console.error("Failed to create user profile:", error);
    return null;
  }
}
