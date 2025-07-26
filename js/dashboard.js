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

    // Initialize map
    await this.initializeMap();

    // Render content
    this.render();

    console.log("Dashboard initialized successfully");
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
      console.log("User profile not found in backend, using token data");
      // This is not critical - dashboard can work with basic token info
    }
  },

  // Load all events and venues data
  loadAllData: async function () {
    try {
      console.log("Loading events and venues...");

      // Load events
      const eventsUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS);
      this.events = await Utils.apiCall(eventsUrl, {
        method: "GET",
        headers: CONFIG.getAuthHeaders(),
      });

      // Load venues
      const venuesUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES);
      this.venues = await Utils.apiCall(venuesUrl, {
        method: "GET",
        headers: CONFIG.getAuthHeaders(),
      });

      console.log(
        `Loaded ${this.events.length} events and ${this.venues.length} venues`,
      );
    } catch (error) {
      console.error("Failed to load data:", error);
      this.events = [];
      this.venues = [];
      Utils.showError(
        "Could not load events and venues. Please try again later.",
      );
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

    if (!this.events || this.events.length === 0) {
      container.innerHTML = `
        <div class="text-center" style="padding: 2rem; color: #666;">
          <p>No events found. Create your first event!</p>
        </div>
      `;
      return;
    }

    // Sort events by date (upcoming first)
    const upcomingEvents = this.events
      .filter((event) => new Date(event.eventDate) >= new Date())
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
      .slice(0, 3); // Show only first 3

    if (upcomingEvents.length === 0) {
      container.innerHTML = `
        <div class="text-center" style="padding: 2rem; color: #666;">
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

    // For now, just show random events
    const randomEvents = [...this.events]
      .sort(() => 0.5 - Math.random())
      .slice(0, 2);

    if (randomEvents.length === 0) {
      container.innerHTML = `
        <div class="text-center" style="padding: 2rem; color: #666;">
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

    if (!this.venues || this.venues.length === 0) {
      container.innerHTML = `
        <div class="text-center" style="padding: 2rem; color: #666;">
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

    return `
      <div class="event-item">
        <h4>${Utils.sanitizeInput(event.name)}</h4>
        <div class="event-meta">
          <span><strong>Date:</strong> ${Utils.formatDate(event.eventDate)} at ${Utils.formatTime(event.eventTime)}</span><br>
          <span><strong>Venue:</strong> ${venue ? Utils.sanitizeInput(venue.name) : "TBA"}</span>
        </div>
        <p style="margin-top: 0.5rem; color: #666;">${Utils.sanitizeInput(event.description || "No description available")}</p>
        <div style="margin-top: 1rem;">
          <button onclick="window.location.href='event-details.html?id=${event.eventID}'" class="btn btn-secondary" style="font-size: 0.9rem;">
            View Details
          </button>
        </div>
      </div>
    `;
  },

  // Create HTML for venue card
  createVenueCard: function (venue) {
    return `
      <div class="venue-item">
        <h4>${Utils.sanitizeInput(venue.name)}</h4>
        <div class="venue-meta">
          <span>${Utils.sanitizeInput(venue.address)}</span><br>
          ${venue.capacity ? `<span><strong>Capacity:</strong> ${venue.capacity}</span>` : ""}
        </div>
        <div style="margin-top: 1rem;">
          <button onclick="window.location.href='venue-details.html?id=${venue.venueID}'" class="btn btn-secondary" style="font-size: 0.9rem;">
            View Details
          </button>
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
      const eventData = {
        eventID: CONFIG.generateEventID(),
        name: formData.get("name"),
        description: formData.get("description") || "",
        eventDate: formData.get("eventDate"),
        eventTime: formData.get("eventTime"),
        venueID: parseInt(formData.get("venueID")),
      };

      const url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS);
      const response = await Utils.apiCall(url, {
        method: "POST",
        headers: CONFIG.getAuthHeaders(),
        body: JSON.stringify(eventData),
      });

      Utils.showSuccess("Event created successfully!", messagesDiv.id);
      form.reset();

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
        error.message || "Failed to create event",
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

      // Geocode address if lat/lng not provided
      let latitude = parseFloat(formData.get("latitude"));
      let longitude = parseFloat(formData.get("longitude"));

      if (!latitude || !longitude) {
        const address = formData.get("address");
        if (address) {
          const geocoded = await MapService.geocodeAddress(address);
          if (geocoded) {
            latitude = geocoded.lat;
            longitude = geocoded.lng;
          }
        }
      }

      const venueData = {
        venueID: CONFIG.generateVenueID(),
        name: formData.get("name"),
        address: formData.get("address"),
        capacity: formData.get("capacity")
          ? parseInt(formData.get("capacity"))
          : null,
        latitude: latitude || null,
        longitude: longitude || null,
      };

      const url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES);
      const response = await Utils.apiCall(url, {
        method: "POST",
        headers: CONFIG.getAuthHeaders(),
        body: JSON.stringify(venueData),
      });

      Utils.showSuccess("Venue created successfully!", messagesDiv.id);
      form.reset();

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
  getCurrentLocationForVenue: async function () {
    const latInput = document.getElementById("venueLatitude");
    const lngInput = document.getElementById("venueLongitude");
    const btn = document.getElementById("get-location-btn");

    try {
      Utils.showLoading(btn, "Getting location...");

      const location = await Utils.getCurrentLocation();

      if (latInput) latInput.value = location.lat.toFixed(6);
      if (lngInput) lngInput.value = location.lng.toFixed(6);

      Utils.showSuccess("Location retrieved successfully!");
    } catch (error) {
      console.error("Failed to get location:", error);
      Utils.showError(
        "Could not get your location. Please enter coordinates manually.",
      );
    } finally {
      Utils.hideLoading(btn, "Get My Current Location");
    }
  },

  // Find events near user's location
  findEventsNearMe: async function () {
    try {
      const location = await Utils.getCurrentLocation();

      if (this.mapInitialized) {
        MapService.centerOn(location.lat, location.lng, 14);
        Utils.showSuccess("Map centered on your location!");
      }
    } catch (error) {
      console.error("Failed to get location:", error);
      Utils.showError("Could not get your location.");
    }
  },
};

// Initialize dashboard when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  Dashboard.init();
});
