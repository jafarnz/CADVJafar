// Dashboard functionality for Local Gigs App
const Dashboard = {
  currentUser: null,
  events: [],
  venues: [],
  userStats: {
    eventsAttended: 0,
    eventsCreated: 0,
  },

  // Initialize dashboard
  init: function () {
    // Check authentication
    if (!Utils.requireAuth()) {
      return;
    }

    this.currentUser = Utils.getUserFromToken();
    if (!this.currentUser) {
      Utils.logout();
      return;
    }

    this.setupEventListeners();
    this.loadUserData();
    this.loadDashboardData();
    this.initializeMap();
  },

  // Setup event listeners
  setupEventListeners: function () {
    // Quick action buttons
    const createEventBtn = document.getElementById("createEventBtn");
    if (createEventBtn) {
      createEventBtn.addEventListener(
        "click",
        this.showCreateEventModal.bind(this),
      );
    }

    const addVenueBtn = document.getElementById("addVenueBtn");
    if (addVenueBtn) {
      addVenueBtn.addEventListener("click", this.showAddVenueModal.bind(this));
    }

    const findEventsBtn = document.getElementById("findEventsBtn");
    if (findEventsBtn) {
      findEventsBtn.addEventListener("click", this.findNearbyEvents.bind(this));
    }

    // Modal close buttons
    const closeEventModal = document.getElementById("closeEventModal");
    if (closeEventModal) {
      closeEventModal.addEventListener(
        "click",
        this.hideCreateEventModal.bind(this),
      );
    }

    const closeVenueModal = document.getElementById("closeVenueModal");
    if (closeVenueModal) {
      closeVenueModal.addEventListener(
        "click",
        this.hideAddVenueModal.bind(this),
      );
    }

    // Form submissions
    const createEventForm = document.getElementById("createEventForm");
    if (createEventForm) {
      createEventForm.addEventListener(
        "submit",
        this.handleCreateEvent.bind(this),
      );
    }

    const addVenueForm = document.getElementById("addVenueForm");
    if (addVenueForm) {
      addVenueForm.addEventListener("submit", this.handleAddVenue.bind(this));
    }

    // Get location button
    const getLocationBtn = document.getElementById("getLocationBtn");
    if (getLocationBtn) {
      getLocationBtn.addEventListener(
        "click",
        this.getCurrentLocationForVenue.bind(this),
      );
    }

    // Close modals when clicking outside
    window.addEventListener("click", (event) => {
      const eventModal = document.getElementById("createEventModal");
      const venueModal = document.getElementById("addVenueModal");

      if (event.target === eventModal) {
        this.hideCreateEventModal();
      }
      if (event.target === venueModal) {
        this.hideAddVenueModal();
      }
    });
  },

  // Load user data and display
  loadUserData: async function () {
    try {
      // Display user name
      const userDisplayName = document.getElementById("userDisplayName");
      if (userDisplayName && this.currentUser) {
        userDisplayName.textContent =
          this.currentUser.preferredUsername ||
          this.currentUser.username ||
          "Music Lover";
      }

      // Load user preferences and show genre tag
      const userPreferences = JSON.parse(
        localStorage.getItem(CONFIG.STORAGE_KEYS.PREFERENCES) || "{}",
      );
      const userGenreElement = document.getElementById("userGenre");
      if (userGenreElement && userPreferences.genre) {
        userGenreElement.textContent =
          userPreferences.genre.charAt(0).toUpperCase() +
          userPreferences.genre.slice(1);
      }

      // Try to load user profile data from backend
      try {
        const response = await Utils.apiCall(
          CONFIG.buildApiUrl(
            CONFIG.API.ENDPOINTS.USER_BY_ID,
            this.currentUser.sub,
          ),
          { method: "GET" },
        );

        if (response) {
          localStorage.setItem(
            CONFIG.STORAGE_KEYS.USER_DATA,
            JSON.stringify(response),
          );

          // Update display with fresh data
          if (response.name && userDisplayName) {
            userDisplayName.textContent = response.name;
          }
          if (
            response.preferences &&
            userGenreElement &&
            response.preferences.genre
          ) {
            userGenreElement.textContent =
              response.preferences.genre.charAt(0).toUpperCase() +
              response.preferences.genre.slice(1);
          }
        }
      } catch (error) {
        console.log("User profile not found in backend, using token data");
        // This is fine - user might not have completed profile setup
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  },

  // Load dashboard data
  loadDashboardData: async function () {
    try {
      await Promise.all([
        this.loadEvents(),
        this.loadVenues(),
        this.loadUserStats(),
      ]);

      this.displayUpcomingEvents();
      this.displayRecommendedEvents();
      this.displayPopularVenues();
      this.displayUserStats();
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      Utils.showError(
        "Failed to load dashboard data. Please refresh the page.",
      );
    }
  },

  // Load events from API
  loadEvents: async function () {
    try {
      const response = await Utils.apiCall(
        CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS),
        { method: "GET" },
      );

      this.events = Array.isArray(response) ? response : response.events || [];
      console.log("Loaded events:", this.events.length);
    } catch (error) {
      console.error("Error loading events:", error);
      this.events = [];
    }
  },

  // Load venues from API
  loadVenues: async function () {
    try {
      const response = await Utils.apiCall(
        CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES),
        { method: "GET" },
      );

      this.venues = Array.isArray(response) ? response : response.venues || [];
      console.log("Loaded venues:", this.venues.length);
    } catch (error) {
      console.error("Error loading venues:", error);
      this.venues = [];
    }
  },

  // Load user statistics
  loadUserStats: async function () {
    try {
      // For now, use mock data - you can implement actual stats tracking later
      this.userStats = {
        eventsAttended: Math.floor(Math.random() * 20),
        eventsCreated: this.events.filter(
          (event) => event.createdBy === this.currentUser.sub,
        ).length,
      };
    } catch (error) {
      console.error("Error loading user stats:", error);
    }
  },

  // Display upcoming events
  displayUpcomingEvents: function () {
    const container = document.getElementById("upcomingEvents");
    if (!container) return;

    const now = new Date();
    const upcomingEvents = this.events
      .filter((event) => new Date(event.eventDate) >= now)
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
      .slice(0, 3);

    if (upcomingEvents.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #666;">No upcoming events found.</p>';
      return;
    }

    container.innerHTML = upcomingEvents
      .map((event) => {
        const venue = this.venues.find((v) => v.venueID === event.venueID);
        return `
                <div class="event-item" onclick="window.location.href='event-details.html?id=${event.eventID}'">
                    <h4>${Utils.sanitizeInput(event.name)}</h4>
                    <div class="event-meta">
                        <p><strong>Date:</strong> ${Utils.formatDate(event.eventDate)}</p>
                        <p><strong>Time:</strong> ${Utils.formatTime(event.eventTime)}</p>
                        <p><strong>Venue:</strong> ${venue ? Utils.sanitizeInput(venue.name) : "Unknown Venue"}</p>
                    </div>
                </div>
            `;
      })
      .join("");
  },

  // Display recommended events based on user preferences
  displayRecommendedEvents: function () {
    const container = document.getElementById("recommendedEvents");
    if (!container) return;

    const userPreferences = JSON.parse(
      localStorage.getItem(CONFIG.STORAGE_KEYS.PREFERENCES) || "{}",
    );
    const preferredGenre = userPreferences.genre;

    // For now, show random events since we don't have genre data in events
    // You can modify this to filter by genre when that data is available
    const recommendedEvents = this.events
      .filter((event) => new Date(event.eventDate) >= new Date())
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    if (recommendedEvents.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #666;">No recommendations available.</p>';
      return;
    }

    container.innerHTML = recommendedEvents
      .map((event) => {
        const venue = this.venues.find((v) => v.venueID === event.venueID);
        return `
                <div class="event-item" onclick="window.location.href='event-details.html?id=${event.eventID}'">
                    <h4>${Utils.sanitizeInput(event.name)}</h4>
                    <div class="event-meta">
                        <p><strong>Date:</strong> ${Utils.formatDate(event.eventDate)}</p>
                        <p><strong>Time:</strong> ${Utils.formatTime(event.eventTime)}</p>
                        <p><strong>Venue:</strong> ${venue ? Utils.sanitizeInput(venue.name) : "Unknown Venue"}</p>
                    </div>
                </div>
            `;
      })
      .join("");
  },

  // Display popular venues
  displayPopularVenues: function () {
    const container = document.getElementById("popularVenues");
    if (!container) return;

    const popularVenues = this.venues
      .sort((a, b) => (b.capacity || 0) - (a.capacity || 0))
      .slice(0, 3);

    if (popularVenues.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #666;">No venues available.</p>';
      return;
    }

    container.innerHTML = popularVenues
      .map(
        (venue) => `
            <div class="venue-item" onclick="window.location.href='venue-details.html?id=${venue.venueID}'">
                <h4>${Utils.sanitizeInput(venue.name)}</h4>
                <div class="venue-meta">
                    <p>${Utils.sanitizeInput(venue.address)}</p>
                    <p><strong>Capacity:</strong> ${venue.capacity || "Not specified"}</p>
                </div>
            </div>
        `,
      )
      .join("");
  },

  // Display user statistics
  displayUserStats: function () {
    const eventsAttendedElement = document.getElementById("eventsAttended");
    const eventsCreatedElement = document.getElementById("eventsCreated");

    if (eventsAttendedElement) {
      eventsAttendedElement.textContent = this.userStats.eventsAttended;
    }
    if (eventsCreatedElement) {
      eventsCreatedElement.textContent = this.userStats.eventsCreated;
    }
  },

  // Initialize map with events and venues
  initializeMap: async function () {
    try {
      const mapInitialized = await MapService.init("map");
      if (mapInitialized && this.events.length > 0) {
        MapService.addEventMarkers(this.events, this.venues);
      }
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  },

  // Show create event modal
  showCreateEventModal: function () {
    this.loadVenuesForModal();
    Utils.show("createEventModal");

    // Set minimum date to today
    const eventDateInput = document.getElementById("eventDate");
    if (eventDateInput) {
      eventDateInput.min = Utils.formatDateTimeForInput(new Date());
    }
  },

  // Hide create event modal
  hideCreateEventModal: function () {
    Utils.hide("createEventModal");
    document.getElementById("createEventForm").reset();
    document.getElementById("eventModalMessages").innerHTML = "";
  },

  // Show add venue modal
  showAddVenueModal: function () {
    Utils.show("addVenueModal");
  },

  // Hide add venue modal
  hideAddVenueModal: function () {
    Utils.hide("addVenueModal");
    document.getElementById("addVenueForm").reset();
    document.getElementById("venueModalMessages").innerHTML = "";
  },

  // Load venues for event creation modal
  loadVenuesForModal: function () {
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

  // Handle create event form submission
  handleCreateEvent: async function (event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const submitBtn = event.target.querySelector('button[type="submit"]');

    const eventData = {
      eventID: CONFIG.generateEventID(),
      name: formData.get("name").trim(),
      description: formData.get("description").trim(),
      eventDate: formData.get("eventDate"),
      eventTime: formData.get("eventTime"),
      venueID: parseInt(formData.get("venueID")),
    };

    // Validation
    if (
      !eventData.name ||
      !eventData.eventDate ||
      !eventData.eventTime ||
      !eventData.venueID
    ) {
      Utils.showError(
        "Please fill in all required fields",
        "eventModalMessages",
      );
      return;
    }

    try {
      Utils.showLoading(submitBtn, "Creating event...");

      const response = await fetch(
        CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS),
        {
          method: "POST",
          headers: CONFIG.getAuthHeaders(),
          body: JSON.stringify(eventData),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create event");
      }

      Utils.showSuccess("Event created successfully!", "eventModalMessages");

      // Refresh events data
      await this.loadEvents();
      this.displayUpcomingEvents();
      this.displayRecommendedEvents();

      // Update map
      if (MapService.isInitialized) {
        MapService.addEventMarkers(this.events, this.venues);
      }

      setTimeout(() => {
        this.hideCreateEventModal();
      }, 2000);
    } catch (error) {
      console.error("Error creating event:", error);
      Utils.showError(
        error.message || "Failed to create event",
        "eventModalMessages",
      );
    } finally {
      Utils.hideLoading(submitBtn, "Create Event");
    }
  },

  // Handle add venue form submission
  handleAddVenue: async function (event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const submitBtn = event.target.querySelector('button[type="submit"]');

    const venueData = {
      venueID: CONFIG.generateVenueID(),
      name: formData.get("name").trim(),
      address: formData.get("address").trim(),
      capacity: formData.get("capacity")
        ? parseInt(formData.get("capacity"))
        : null,
      latitude: formData.get("latitude")
        ? parseFloat(formData.get("latitude"))
        : null,
      longitude: formData.get("longitude")
        ? parseFloat(formData.get("longitude"))
        : null,
    };

    // Validation
    if (!venueData.name || !venueData.address) {
      Utils.showError(
        "Please fill in venue name and address",
        "venueModalMessages",
      );
      return;
    }

    try {
      Utils.showLoading(submitBtn, "Adding venue...");

      const response = await fetch(
        CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES),
        {
          method: "POST",
          headers: CONFIG.getAuthHeaders(),
          body: JSON.stringify(venueData),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add venue");
      }

      Utils.showSuccess("Venue added successfully!", "venueModalMessages");

      // Refresh venues data
      await this.loadVenues();
      this.displayPopularVenues();

      // Update map
      if (MapService.isInitialized) {
        MapService.addVenueMarkers(this.venues);
      }

      setTimeout(() => {
        this.hideAddVenueModal();
      }, 2000);
    } catch (error) {
      console.error("Error adding venue:", error);
      Utils.showError(
        error.message || "Failed to add venue",
        "venueModalMessages",
      );
    } finally {
      Utils.hideLoading(submitBtn, "Add Venue");
    }
  },

  // Get current location for venue form
  getCurrentLocationForVenue: async function () {
    const getLocationBtn = document.getElementById("getLocationBtn");
    const latitudeInput = document.getElementById("venueLatitude");
    const longitudeInput = document.getElementById("venueLongitude");

    try {
      Utils.showLoading(getLocationBtn, "Getting location...");

      const location = await Utils.getCurrentLocation();

      latitudeInput.value = location.lat.toFixed(6);
      longitudeInput.value = location.lng.toFixed(6);

      Utils.showSuccess("Location updated!", "venueModalMessages");
    } catch (error) {
      console.error("Error getting location:", error);
      Utils.showError(
        "Could not get your location. Please enter coordinates manually.",
        "venueModalMessages",
      );
    } finally {
      Utils.hideLoading(getLocationBtn, "Get My Current Location");
    }
  },

  // Find nearby events
  findNearbyEvents: async function () {
    try {
      const location = await Utils.getCurrentLocation();

      // Filter events by nearby venues (within reasonable distance)
      const nearbyEvents = this.events.filter((event) => {
        const venue = this.venues.find((v) => v.venueID === event.venueID);
        if (!venue || !venue.latitude || !venue.longitude) return false;

        const distance = Utils.calculateDistance(
          location.lat,
          location.lng,
          parseFloat(venue.latitude),
          parseFloat(venue.longitude),
        );

        return distance <= 20; // Within 20km
      });

      if (nearbyEvents.length === 0) {
        Utils.showError("No events found within 20km of your location.");
        return;
      }

      // Update map to show only nearby events
      if (MapService.isInitialized) {
        MapService.addEventMarkers(nearbyEvents, this.venues);
        MapService.centerOn(location.lat, location.lng, 12);
      }

      Utils.showSuccess(`Found ${nearbyEvents.length} events near you!`);
    } catch (error) {
      console.error("Error finding nearby events:", error);
      Utils.showError("Could not access your location to find nearby events.");
    }
  },
};

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  Dashboard.init();
});

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Dashboard;
}
