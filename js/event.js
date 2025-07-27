// Events page functionality for Local Gigs App
const EventsPage = {
  events: [],
  venues: [],
  filteredEvents: [],
  currentPage: 1,
  itemsPerPage: 12,
  isMapView: false,
  mapInitialized: false,

  // Initialize the events page
  init: async function () {
    console.log("Initializing events page...");

    // Check authentication
    if (!Utils.requireAuth()) {
      return;
    }

    // Set up event listeners
    this.setupEventListeners();

    // Load data
    await this.loadAllData();

    // Apply filters and render
    this.applyFilters();
    this.render();

    // Check if returning from venue creation
    this.checkReturnFromVenueCreation();

    console.log("Events page initialized successfully");
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

    // Search input
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener(
        "input",
        Utils.debounce(() => {
          this.currentPage = 1;
          this.applyFilters();
          this.render();
        }, 300),
      );
    }

    // Genre filter
    const genreFilter = document.getElementById("genre-filter");
    if (genreFilter) {
      genreFilter.addEventListener("change", () => {
        this.currentPage = 1;
        this.applyFilters();
        this.render();
      });
    }

    // Date filter
    const dateFilter = document.getElementById("date-filter");
    if (dateFilter) {
      dateFilter.addEventListener("change", () => {
        this.currentPage = 1;
        this.applyFilters();
        this.render();
      });
    }

    // Sort select
    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        this.applyFilters();
        this.render();
      });
    }

    // View toggle buttons
    const toggleViewBtn = document.getElementById("toggle-view-btn");
    const listViewBtn = document.getElementById("list-view-btn");

    if (toggleViewBtn) {
      toggleViewBtn.addEventListener("click", () => {
        this.toggleMapView();
      });
    }

    if (listViewBtn) {
      listViewBtn.addEventListener("click", () => {
        this.toggleListView();
      });
    }

    // Create event button and modal
    const createEventBtn = document.getElementById("create-event-btn");
    const createEventModal = document.getElementById("create-event-modal");
    const closeEventModal = document.getElementById("close-event-modal");
    const createEventForm = document.getElementById("create-event-form");

    if (createEventBtn && createEventModal) {
      createEventBtn.addEventListener("click", () => {
        this.openCreateEventModal();
      });
    }

    if (closeEventModal && createEventModal) {
      closeEventModal.addEventListener("click", () => {
        createEventModal.style.display = "none";
        this.clearEventForm();
      });
    }

    if (createEventForm) {
      createEventForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleCreateEvent(e);
      });
    }

    // Venue selection and creation
    const eventVenueSelect = document.getElementById("eventVenue");
    const createCustomVenueBtn = document.getElementById(
      "create-custom-venue-btn",
    );

    if (eventVenueSelect) {
      eventVenueSelect.addEventListener("change", () => {
        this.updateVenuePreview();
      });
    }

    if (createCustomVenueBtn) {
      createCustomVenueBtn.addEventListener("click", () => {
        this.handleCustomVenueCreation();
      });
    }

    // Event details modal
    const eventDetailsModal = document.getElementById("event-details-modal");
    const closeDetailsModal = document.getElementById("close-details-modal");

    if (closeDetailsModal && eventDetailsModal) {
      closeDetailsModal.addEventListener("click", () => {
        eventDetailsModal.style.display = "none";
      });
    }

    // Create venue modal (inline)
    const createVenueModal = document.getElementById("create-venue-modal");
    const closeCreateVenueModal = document.getElementById(
      "close-create-venue-modal",
    );
    const cancelCreateVenueBtn = document.getElementById(
      "cancel-create-venue-btn",
    );
    const createVenueForm = document.getElementById("create-venue-form");

    if (closeCreateVenueModal && createVenueModal) {
      closeCreateVenueModal.addEventListener("click", () => {
        createVenueModal.style.display = "none";
      });
    }

    if (cancelCreateVenueBtn && createVenueModal) {
      cancelCreateVenueBtn.addEventListener("click", () => {
        createVenueModal.style.display = "none";
      });
    }

    if (createVenueForm) {
      createVenueForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleInlineVenueCreation(e);
      });
    }

    // Pagination
    const prevPageBtn = document.getElementById("prev-page");
    const nextPageBtn = document.getElementById("next-page");

    if (prevPageBtn) {
      prevPageBtn.addEventListener("click", () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.render();
        }
      });
    }

    if (nextPageBtn) {
      nextPageBtn.addEventListener("click", () => {
        const totalPages = Math.ceil(
          this.filteredEvents.length / this.itemsPerPage,
        );
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.render();
        }
      });
    }

    // Close modals when clicking outside
    window.addEventListener("click", (e) => {
      if (e.target === createEventModal) {
        createEventModal.style.display = "none";
      }
      if (e.target === eventDetailsModal) {
        eventDetailsModal.style.display = "none";
      }
      if (e.target === createVenueModal) {
        createVenueModal.style.display = "none";
      }
    });
  },

  // Load all events and venues data
  loadAllData: async function () {
    try {
      console.log("Loading events and venues...");

      // Load events
      const eventsUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS);
      const eventsResponse = await Utils.apiCall(eventsUrl, {
        method: "GET",
        headers: CONFIG.getAuthHeaders(),
      });

      // Handle different response formats for events
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
            console.log("Parsed events message is not an array:", parsedEvents);
            this.events = [];
          }
        } catch (parseError) {
          console.error("Failed to parse events from message:", parseError);
          this.events = [];
        }
      } else {
        console.log("Unexpected events response format:", eventsResponse);
        this.events = [];
      }

      // Load venues
      const venuesUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES);
      const venuesResponse = await Utils.apiCall(venuesUrl, {
        method: "GET",
        headers: CONFIG.getAuthHeaders(),
      });

      // Handle different response formats for venues
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
            console.log("Parsed venues message is not an array:", parsedVenues);
            this.venues = [];
          }
        } catch (parseError) {
          console.error("Failed to parse venues from message:", parseError);
          this.venues = [];
        }
      } else {
        console.log("Unexpected venues response format:", venuesResponse);
        this.venues = [];
      }

      console.log(
        `Loaded ${this.events.length} events and ${this.venues.length} venues`,
      );
    } catch (error) {
      console.error("Failed to load data:", error);
      this.events = [];
      this.venues = [];
      Utils.showError(
        "Failed to load events and venues. Please try again later.",
      );
    }
  },

  // Apply search and filter criteria
  applyFilters: function () {
    // Ensure events is an array before proceeding
    if (!Array.isArray(this.events)) {
      console.warn(
        "Events is not an array, initializing as empty array:",
        this.events,
      );
      this.events = [];
    }

    const searchInput = document.getElementById("search-input");
    const genreFilterEl = document.getElementById("genre-filter");
    const dateFilterEl = document.getElementById("date-filter");
    const sortSelectEl = document.getElementById("sort-select");

    const searchTerm = (searchInput && searchInput.value.toLowerCase()) || "";
    const genreFilter = (genreFilterEl && genreFilterEl.value) || "";
    const dateFilter = (dateFilterEl && dateFilterEl.value) || "";
    const sortBy = (sortSelectEl && sortSelectEl.value) || "date-asc";

    let filtered = [...this.events];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.name.toLowerCase().includes(searchTerm) ||
          (event.description &&
            event.description.toLowerCase().includes(searchTerm)),
      );
    }

    // Apply genre filter
    if (genreFilter) {
      filtered = filtered.filter(
        (event) =>
          event.genre &&
          event.genre.toLowerCase() === genreFilter.toLowerCase(),
      );
    }

    // Apply date filter
    if (dateFilter) {
      filtered = filtered.filter((event) => event.eventDate === dateFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return new Date(a.eventDate) - new Date(b.eventDate);
        case "date-desc":
          return new Date(b.eventDate) - new Date(a.eventDate);
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return new Date(a.eventDate) - new Date(b.eventDate);
      }
    });

    this.filteredEvents = filtered;
  },

  // Render the events list or map
  render: function () {
    if (this.isMapView) {
      this.renderMapView();
    } else {
      this.renderListView();
    }
    this.updateEventsCount();
    this.updatePagination();
  },

  // Render list view
  renderListView: function () {
    const eventsGrid = document.getElementById("events-grid");
    if (!eventsGrid) return;

    if (this.filteredEvents.length === 0) {
      eventsGrid.innerHTML = `
        <div class="no-events">
          <h3>No events found</h3>
          <p>Try adjusting your filters or create a new event.</p>
          <button onclick="document.getElementById('create-event-btn').click()" class="btn">
            Create Event
          </button>
        </div>
      `;
      return;
    }

    // Calculate pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const eventsToShow = this.filteredEvents.slice(startIndex, endIndex);

    // Render events grid
    eventsGrid.innerHTML = `
      <div class="events-grid">
        ${eventsToShow.map((event) => this.createEventCard(event)).join("")}
      </div>
    `;

    // Add click listeners to event cards
    this.addEventCardListeners();
  },

  // Render map view
  renderMapView: async function () {
    if (!this.mapInitialized) {
      try {
        const success = await MapService.init("events-map");
        if (success) {
          this.mapInitialized = true;
        } else {
          Utils.showError("Failed to initialize map. Please try list view.");
          this.toggleListView();
          return;
        }
      } catch (error) {
        console.error("Map initialization failed:", error);
        Utils.showError("Map is not available. Please use list view.");
        this.toggleListView();
        return;
      }
    }

    // Show both venues and event pins on the map
    if (this.mapInitialized) {
      try {
        // Pass events data to the map service for rendering
        await this.renderEventsAndVenuesOnMap();
      } catch (error) {
        console.error("❌ Failed to load map data:", error);
        Utils.showError("Failed to load events on map. Please try refreshing.");
      }
    }
  },

  // Render events and venues on map with proper data passing
  renderEventsAndVenuesOnMap: async function () {
    try {
      console.log("🗺️ Loading venues and event pins...");

      // First load and show venue markers
      await MapService.loadVenues();
      MapService.addVenueMarkers();

      // Then add event pins with our events data
      let eventPinsCount = 0;
      const validEvents = this.filteredEvents.filter((event) => {
        const venue = this.venues.find((v) => v.venueID === event.venueID);
        return venue && venue.latitude && venue.longitude;
      });

      console.log(`📍 Adding ${validEvents.length} event pins to map...`);

      for (const event of validEvents) {
        const venue = this.venues.find((v) => v.venueID === event.venueID);
        if (venue && venue.latitude && venue.longitude) {
          // Create event marker
          const eventDate = new Date(event.eventDate);
          const isUpcoming = eventDate >= new Date();

          const marker = new window.maplibregl.Marker({
            color: isUpcoming ? "#ef4444" : "#6b7280",
            scale: 1.2,
          })
            .setLngLat([
              parseFloat(venue.longitude),
              parseFloat(venue.latitude),
            ])
            .setPopup(
              new window.maplibregl.Popup().setHTML(`
                            <div style="text-align: center; padding: 0.5rem; max-width: 250px;">
                                <h4 style="margin: 0 0 0.5rem 0; color: #333; font-size: 1rem;">${event.name}</h4>
                                <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">
                                    📅 ${Utils.formatDate(event.eventDate)} at ${Utils.formatTime(event.eventTime)}
                                </p>
                                <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">
                                    📍 ${venue.name}
                                </p>
                                ${event.genre ? `<p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">🎵 ${Utils.capitalize(event.genre)}</p>` : ""}
                                <button onclick="EventsPage.showEventDetails('${event.eventID}')"
                                        style="background: #3b82f6; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer; margin-top: 0.5rem;">
                                    View Details
                                </button>
                                <button onclick="EventsPage.openEventInGoogleMaps('${event.eventID}')"
                                        style="background: #4285f4; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer; margin-top: 0.5rem; margin-left: 0.5rem;">
                                    📍 Maps
                                </button>
                            </div>
                        `),
            )
            .addTo(MapService.map);

          eventPinsCount++;
        }
      }

      console.log(
        `✅ Events map loaded with ${MapService.venueMarkers.length} venues and ${eventPinsCount} event pins`,
      );

      // Update map info display if it exists
      const mapInfo = document.getElementById("events-map-info");
      if (mapInfo) {
        mapInfo.textContent = `Showing ${eventPinsCount} events and ${MapService.venueMarkers.length} venues`;
      }

      return { venues: MapService.venueMarkers.length, events: eventPinsCount };
    } catch (error) {
      console.error("❌ Failed to load venues and events:", error);
      return { venues: 0, events: 0 };
    }
  },

  // Create HTML for event card
  createEventCard: function (event) {
    const venue = this.venues.find((v) => v.venueID === event.venueID);
    const eventDate = new Date(event.eventDate);
    const isUpcoming = eventDate >= new Date();
    const imageUrl = event.imageUrl || "/api/placeholder/350/200";

    return `
      <div class="event-card" data-event-id="${event.eventID}">
        <div class="event-image">
          ${
            imageUrl && imageUrl !== "/api/placeholder/350/200"
              ? `<img src="${imageUrl}" alt="${Utils.sanitizeInput(event.name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;" onerror="this.style.display='none'; this.parentElement.innerHTML='🎵';">`
              : "🎵"
          }
        </div>

        <div class="event-title">${Utils.sanitizeInput(event.name)}</div>

        <div class="event-venue">
          📍 ${venue ? Utils.sanitizeInput(venue.name) : "Venue TBA"}
        </div>

        <div class="event-date">
          📅 ${Utils.formatDate(event.eventDate)} at ${Utils.formatTime(event.eventTime)}
        </div>

        ${event.genre ? `<div class="event-genre">${Utils.capitalize(event.genre)}</div>` : ""}

        ${event.description ? `<p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 1rem; line-height: 1.4;">${Utils.sanitizeInput(event.description)}</p>` : ""}

        <div class="event-actions">
          <button class="event-btn primary view-details-btn" data-event-id="${event.eventID}">
            👁️ Details
          </button>
          <button class="event-btn secondary edit-event-btn" data-event-id="${event.eventID}">
            ✏️ Edit
          </button>
          ${
            venue && venue.location
              ? `
          <button class="event-btn maps" onclick="EventsPage.openEventInGoogleMaps('${event.eventID}')" title="Open in Google Maps">
            🗺️ Maps
          </button>`
              : ""
          }
          ${this.renderJoinButton(event, isUpcoming)}
        </div>
      </div>
    `;
  },

  // Render join button based on event status and user join status
  renderJoinButton: function (event, isUpcoming) {
    if (!isUpcoming) {
      return `<button class="event-btn secondary" disabled>⏰ Past Event</button>`;
    }

    const isJoined = Utils.isEventJoined(event.eventID);

    if (isJoined) {
      return `<button class="event-btn success joined-btn" data-event-id="${event.eventID}" disabled>✅ Joined</button>`;
    } else {
      return `<button class="event-btn primary join-btn" data-event-id="${event.eventID}">🎟️ Join</button>`;
    }
  },

  // Add event listeners to event cards
  addEventCardListeners: function () {
    // View details buttons
    document.querySelectorAll(".view-details-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const eventId = btn.getAttribute("data-event-id");
        this.showEventDetails(eventId);
      });
    });

    // Edit event buttons
    document.querySelectorAll(".edit-event-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const eventId = btn.getAttribute("data-event-id");
        this.editEvent(eventId);
      });
    });

    // Join event buttons
    document.querySelectorAll(".join-btn:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const eventId = btn.getAttribute("data-event-id");
        this.joinEvent(eventId);
      });
    });

    // Event card click for details
    document.querySelectorAll(".event-card").forEach((card) => {
      card.addEventListener("click", () => {
        const eventId = card.getAttribute("data-event-id");
        this.showEventDetails(eventId);
      });
    });

    // Update button states based on joined status
    this.updateEventButtonStates();
  },

  // Show event details with venue map
  showEventDetails: function (eventId) {
    // Redirect to event details page
    window.location.href = `event-details.html?id=${eventId}`;
  },

  // Join an event
  joinEvent: async function (eventId) {
    const event = this.events.find(
      (e) => e.eventID.toString() === eventId.toString(),
    );
    if (!event) {
      Utils.showMessage("Event not found", "error");
      return;
    }

    // Check authentication
    if (!Utils.isAuthenticated()) {
      Utils.showMessage("Please login to join events", "error");
      window.location.href = "login.html";
      return;
    }

    // Check if already joined
    if (Utils.isEventJoined(eventId)) {
      Utils.showMessage(`You've already joined "${event.name}"`, "warning");
      return;
    }

    // Check if event is in the past
    const eventDateTime = new Date(`${event.eventDate}T${event.eventTime}`);
    const now = new Date();

    if (eventDateTime <= now) {
      Utils.showMessage("Cannot join events that have already passed", "error");
      return;
    }

    // Show loading state on join button
    const joinBtn = document.querySelector(`[onclick*="${eventId}"].join-btn`);
    const originalText = joinBtn ? joinBtn.textContent : "";
    if (joinBtn) {
      joinBtn.disabled = true;
      joinBtn.textContent = "Joining...";
    }

    try {
      // Use new Utils API to join event
      const success = await Utils.addJoinedEvent(event);

      if (success) {
        console.log("✅ Successfully joined event");
        // Update button states
        this.updateEventButtonStates();
      } else {
        Utils.showMessage(
          "Failed to join event. You may have already joined.",
          "error",
        );
      }
    } catch (error) {
      console.error("❌ Failed to join event:", error);
      Utils.showMessage("Failed to join event. Please try again.", "error");
    } finally {
      // Reset button state
      if (joinBtn) {
        joinBtn.disabled = false;
        joinBtn.textContent = originalText;
      }
    }
  },

  // Show join notification popup
  showJoinNotification: function (event) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = "join-notification";
    notification.innerHTML = `
      <div class="join-notification-content">
        <div class="join-notification-icon">🎉</div>
        <div class="join-notification-text">
          <h4>You've joined "${Utils.sanitizeInput(event.name)}"!</h4>
          <p>You'll receive updates about this event.</p>
        </div>
        <button class="join-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #28a745, #20c997);
      color: white;
      padding: 0;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(40, 167, 69, 0.3);
      z-index: 10000;
      max-width: 350px;
      animation: slideInRight 0.5s ease-out;
      backdrop-filter: blur(10px);
    `;

    const content = notification.querySelector(".join-notification-content");
    content.style.cssText = `
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
    `;

    const icon = notification.querySelector(".join-notification-icon");
    icon.style.cssText = `
      font-size: 2rem;
      animation: bounce 1s ease-in-out;
    `;

    const text = notification.querySelector(".join-notification-text");
    text.style.cssText = `
      flex: 1;
    `;

    const title = text.querySelector("h4");
    title.style.cssText = `
      margin: 0 0 0.25rem 0;
      font-size: 1.1rem;
      font-weight: 600;
    `;

    const desc = text.querySelector("p");
    desc.style.cssText = `
      margin: 0;
      font-size: 0.9rem;
      opacity: 0.9;
    `;

    const closeBtn = notification.querySelector(".join-notification-close");
    closeBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.3s ease;
    `;

    // Add animations
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
      }
      .join-notification-close:hover {
        background: rgba(255, 255, 255, 0.3) !important;
      }
    `;
    document.head.appendChild(style);

    // Add to page
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = "slideInRight 0.5s ease-in reverse";
        setTimeout(() => {
          if (notification.parentElement) {
            notification.remove();
          }
        }, 500);
      }
    }, 5000);
  },

  // Update event button states based on joined status
  updateEventButtonStates: function () {
    document.querySelectorAll(".join-btn").forEach((btn) => {
      const eventId = btn.getAttribute("data-event-id");
      if (Utils.isEventJoined(eventId)) {
        btn.textContent = "✅ Joined";
        btn.disabled = true;
        btn.classList.remove("primary");
        btn.classList.add("success");
      }
    });
  },

  // Leave an event
  leaveEvent: async function (eventId) {
    const event = this.events.find(
      (e) => e.eventID.toString() === eventId.toString(),
    );
    if (!event) {
      Utils.showError("Event not found");
      return;
    }

    if (!Utils.isEventJoined(eventId)) {
      Utils.showWarning("You have not joined this event");
      return;
    }

    if (confirm(`Are you sure you want to leave "${event.name}"?`)) {
      try {
        // Remove from API first
        const currentUser = Utils.getCurrentUser();
        if (currentUser && currentUser.user_id) {
          console.log("📡 Sending leave request to API...");

          const leaveUrl = CONFIG.buildApiUrl(
            `user-events/${currentUser.user_id}/${eventId}`,
          );
          await Utils.apiCall(leaveUrl, {
            method: "DELETE",
            headers: CONFIG.getAuthHeaders(),
          });

          console.log("✅ Successfully left event in API");
        }

        // Remove from local storage
        Utils.removeJoinedEvent(eventId);
        Utils.showSuccess(`You've left "${event.name}"`);
        this.updateEventButtonStates();
      } catch (error) {
        console.error("❌ Failed to leave event:", error);
        Utils.showError("Failed to leave event. Please try again.");
      }
    }
  },

  // Edit an event
  editEvent: function (eventId) {
    const event = this.events.find(
      (e) => e.eventID.toString() === eventId.toString(),
    );
    if (!event) {
      Utils.showError("Event not found");
      return;
    }

    // Redirect to edit event page
    window.location.href = `edit-event.html?id=${eventId}`;
  },

  // Open event location in Google Maps
  openEventInGoogleMaps: function (eventId) {
    const event = this.events.find(
      (e) => e.eventID.toString() === eventId.toString(),
    );
    if (!event) {
      alert("Event not found");
      return;
    }

    const venue = this.venues.find((v) => v.venueID === event.venueID);
    if (!venue) {
      alert("Venue information not available for this event");
      return;
    }

    const lat = venue.latitude;
    const lng = venue.longitude;
    const eventName = event.name || "Event";
    const venueName = venue.name || "Venue";
    const address = venue.address || "";

    if (lat && lng) {
      // Use coordinates for precise location
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(eventName + " at " + venueName)}`;
      window.open(googleMapsUrl, "_blank");
    } else if (address) {
      // Fallback to address search
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ", Singapore")}`;
      window.open(googleMapsUrl, "_blank");
    } else {
      alert("Location information not available for this event");
    }
  },

  // Toggle to map view
  toggleMapView: function () {
    this.isMapView = true;
    document.getElementById("map-container-wrapper").style.display = "block";
    document.getElementById("events-list-wrapper").style.display = "none";

    // Trigger map resize after container is visible
    setTimeout(() => {
      if (MapService.map) {
        MapService.map.resize();
      }
    }, 100);

    this.render();
  },

  // Toggle to list view
  toggleListView: function () {
    this.isMapView = false;
    document.getElementById("map-container-wrapper").style.display = "none";
    document.getElementById("events-list-wrapper").style.display = "block";
    this.render();
  },

  // Update events count display
  updateEventsCount: function () {
    const countElement = document.getElementById("events-count");
    if (countElement) {
      countElement.textContent = this.filteredEvents.length;
    }
  },

  // Update pagination controls
  updatePagination: function () {
    const totalPages = Math.ceil(
      this.filteredEvents.length / this.itemsPerPage,
    );
    const paginationDiv = document.getElementById("pagination");
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");
    const pageInfo = document.getElementById("page-info");

    if (!paginationDiv || totalPages <= 1) {
      if (paginationDiv) paginationDiv.style.display = "none";
      return;
    }

    paginationDiv.style.display = "block";

    if (prevBtn) {
      prevBtn.disabled = this.currentPage <= 1;
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= totalPages;
    }

    if (pageInfo) {
      pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
    }
  },

  // Load venues for dropdown
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

    // Check if this is edit mode
    const isEditMode = form.getAttribute("data-edit-mode") === "true";
    const eventId = form.getAttribute("data-event-id");

    try {
      Utils.showLoading(submitBtn, isEditMode ? "Updating..." : "Creating...");

      const formData = new FormData(form);
      let imageUrl = null;

      // Handle image upload if present
      const imageFile = formData.get("image");
      if (imageFile && imageFile.size > 0) {
        try {
          imageUrl = await Utils.uploadImage(imageFile, "events");
        } catch (error) {
          console.error("Image upload failed:", error);
          Utils.showError(
            `Image upload failed, but event will be ${isEditMode ? "updated" : "created"} without image.`,
            messagesDiv.id,
          );
        }
      }

      const eventData = {
        name: formData.get("name"),
        description: formData.get("description") || "",
        genre: formData.get("genre") || null,
        eventDate: formData.get("eventDate"),
        eventTime: formData.get("eventTime"),
        venueID: parseInt(formData.get("venueID")),
      };

      // Add imageUrl only if provided
      if (imageUrl) {
        eventData.imageUrl = imageUrl;
      }

      let url, method;
      if (isEditMode && eventId) {
        // Update existing event
        eventData.eventID = eventId;
        url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS + "/" + eventId);
        method = "PUT";
      } else {
        // Create new event
        eventData.eventID = CONFIG.generateEventID();
        url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS);
        method = "POST";
      }

      const response = await Utils.apiCall(url, {
        method: method,
        headers: CONFIG.getAuthHeaders(),
        body: JSON.stringify(eventData),
      });

      Utils.showSuccess(
        `Event ${isEditMode ? "updated" : "created"} successfully!`,
        messagesDiv.id,
      );
      form.reset();

      // Reload data and re-render
      await this.loadAllData();
      this.applyFilters();
      this.render();

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

  // Enhanced venue management for events
  openCreateEventModal: async function () {
    // Redirect to dedicated create event page instead of opening modal
    window.location.href = "create-event.html";
  },

  clearEventForm: function () {
    const form = document.getElementById("create-event-form");
    if (form) {
      form.reset();

      // Clear edit mode attributes
      form.removeAttribute("data-edit-mode");
      form.removeAttribute("data-event-id");
    }

    // Reset modal title
    const modal = document.getElementById("create-event-modal");
    if (modal) {
      const modalTitle = modal.querySelector("h2");
      if (modalTitle) {
        modalTitle.textContent = "Create New Event";
      }
    }

    // Clear venue preview
    const venuePreview = document.getElementById("selected-venue-preview");
    if (venuePreview) {
      venuePreview.style.display = "none";
    }
  },

  loadVenuesForDropdown: async function () {
    const venueSelect = document.getElementById("eventVenue");
    if (!venueSelect) return;

    try {
      console.log("🏛️ Loading venues for dropdown...");
      venueSelect.innerHTML = '<option value="">Loading venues...</option>';

      // Load venues from API
      const response = await Utils.apiCall(
        CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES),
        {
          method: "GET",
          headers: CONFIG.getAuthHeaders(),
        },
      );

      console.log("✅ Venues loaded:", response);

      // Handle wrapped response
      const venues =
        response.venues ||
        response.message?.venues ||
        response.Items ||
        response;

      if (Array.isArray(venues)) {
        this.venues = venues;

        // Populate dropdown
        venueSelect.innerHTML = '<option value="">Select a venue...</option>';

        venues.forEach((venue) => {
          const option = document.createElement("option");
          option.value = venue.venueID || venue.id;
          option.textContent = `${venue.name} - ${venue.address || "Address not specified"}`;
          option.dataset.venue = JSON.stringify(venue);
          venueSelect.appendChild(option);
        });

        console.log(`✅ Added ${venues.length} venues to dropdown`);
      } else {
        console.warn("⚠️ Venues response not in expected format:", response);
        venueSelect.innerHTML = '<option value="">No venues available</option>';
      }
    } catch (error) {
      console.error("❌ Failed to load venues:", error);
      venueSelect.innerHTML = '<option value="">Failed to load venues</option>';
    }
  },

  updateVenuePreview: function () {
    const venueSelect = document.getElementById("eventVenue");
    const venuePreview = document.getElementById("selected-venue-preview");
    const venueName = document.getElementById("venue-preview-name");
    const venueAddress = document.getElementById("venue-preview-address");
    const venueDetails = document.getElementById("venue-preview-details");

    if (!venueSelect || !venuePreview) return;

    const selectedOption = venueSelect.selectedOptions[0];

    if (
      selectedOption &&
      selectedOption.value &&
      selectedOption.dataset.venue
    ) {
      try {
        const venue = JSON.parse(selectedOption.dataset.venue);

        if (venueName) venueName.textContent = venue.name || "Unknown Venue";
        if (venueAddress)
          venueAddress.textContent = venue.address || "Address not specified";
        if (venueDetails) {
          const details = [];
          if (venue.type) details.push(`Type: ${venue.type}`);
          if (venue.capacity) details.push(`Capacity: ${venue.capacity}`);
          venueDetails.textContent = details.join(" • ");
        }

        venuePreview.style.display = "block";
        console.log("✅ Venue preview updated:", venue.name);
      } catch (error) {
        console.error("❌ Failed to parse venue data:", error);
        venuePreview.style.display = "none";
      }
    } else {
      venuePreview.style.display = "none";
    }
  },

  handleCustomVenueCreation: function () {
    // Instead of redirecting, open the inline venue creation modal
    const createVenueModal = document.getElementById("create-venue-modal");
    if (createVenueModal) {
      // Store current event form data
      const eventFormData = this.getEventFormData();
      sessionStorage.setItem("pendingEventData", JSON.stringify(eventFormData));

      // Open the venue creation modal
      createVenueModal.style.display = "block";

      // Initialize the venue location map with proper delay
      setTimeout(() => {
        this.initializeCreateVenueLocationMap();
      }, 1000); // Increased delay to ensure MapService is ready
    } else {
      // Fallback to redirect if modal not found
      const eventFormData = this.getEventFormData();
      sessionStorage.setItem("pendingEventData", JSON.stringify(eventFormData));
      window.location.href = "venues.html?action=create&returnTo=events";
    }
  },

  getEventFormData: function () {
    const form = document.getElementById("create-event-form");
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }

    return data;
  },

  restoreEventFormData: function () {
    const pendingData = sessionStorage.getItem("pendingEventData");
    if (!pendingData) return;

    try {
      const data = JSON.parse(pendingData);
      const form = document.getElementById("create-event-form");

      if (form) {
        Object.keys(data).forEach((key) => {
          const field = form.querySelector(`[name="${key}"]`);
          if (field && data[key]) {
            field.value = data[key];
          }
        });
      }

      // Clear stored data
      sessionStorage.removeItem("pendingEventData");
      console.log("✅ Event form data restored");
    } catch (error) {
      console.error("❌ Failed to restore event form data:", error);
    }
  },

  // Check if returning from venue creation
  checkReturnFromVenueCreation: function () {
    const urlParams = new URLSearchParams(window.location.search);
    const returnFrom = urlParams.get("returnFrom");
    const newVenueId = urlParams.get("venueId");

    if (returnFrom === "venues" && newVenueId) {
      // Open event modal and pre-select the new venue
      setTimeout(() => {
        this.openCreateEventModal().then(() => {
          this.restoreEventFormData();

          // Pre-select the new venue
          const venueSelect = document.getElementById("eventVenue");
          if (venueSelect) {
            venueSelect.value = newVenueId;
            this.updateVenuePreview();
          }
        });
      }, 500);

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  },

  // Handle inline venue creation from events page
  handleInlineVenueCreation: async function (e) {
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const messagesDiv = document.getElementById("create-venue-modal-messages");

    try {
      // Show loading state
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating venue...";

      const formData = new FormData(form);

      // Validate required fields
      const name = formData.get("name");
      const address = formData.get("address");
      const latitude = formData.get("latitude");
      const longitude = formData.get("longitude");

      if (!name || !address) {
        throw new Error("Please fill in venue name and address");
      }

      if (!latitude || !longitude) {
        throw new Error("Please select a location on the map");
      }

      // Create venue data object
      const venueData = {
        id: "venue_" + Date.now(),
        name: name,
        address: address,
        description: formData.get("description") || "",
        capacity: formData.get("capacity")
          ? parseInt(formData.get("capacity"))
          : null,
        type: formData.get("type") || "",
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        location: {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
        },
      };

      // Handle image upload if present
      const imageFile = formData.get("image");
      if (imageFile && imageFile.size > 0) {
        try {
          // Simulate image upload - in real app would upload to S3
          venueData.imageUrl = URL.createObjectURL(imageFile);
        } catch (error) {
          console.warn("Image upload failed:", error);
        }
      }

      // Save venue to localStorage (in real app would be API call)
      const existingVenues = JSON.parse(localStorage.getItem("venues") || "[]");
      existingVenues.push(venueData);
      localStorage.setItem("venues", JSON.stringify(existingVenues));

      // Show success message
      if (messagesDiv) {
        messagesDiv.innerHTML = `
          <div style="padding: 1rem; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; color: #155724; margin-bottom: 1rem;">
            ✅ Venue "${venueData.name}" created successfully!
          </div>
        `;
      }

      // Close venue modal after a delay
      setTimeout(() => {
        document.getElementById("create-venue-modal").style.display = "none";

        // Refresh venues in event form and auto-select the new one
        this.loadVenuesForDropdown().then(() => {
          this.restoreEventFormData();

          // Auto-select the newly created venue
          const venueSelect = document.getElementById("eventVenue");
          if (venueSelect) {
            // Find the new venue option
            for (let option of venueSelect.options) {
              if (option.dataset.venue) {
                try {
                  const venue = JSON.parse(option.dataset.venue);
                  if (
                    venue.id === venueData.id ||
                    venue.name === venueData.name
                  ) {
                    venueSelect.value = option.value;
                    this.updateVenuePreview();
                    break;
                  }
                } catch (e) {
                  // Continue searching
                }
              }
            }
          }
        });
      }, 2000);
    } catch (error) {
      console.error("Failed to create venue:", error);
      if (messagesDiv) {
        messagesDiv.innerHTML = `
          <div style="padding: 1rem; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; color: #721c24; margin-bottom: 1rem;">
            ❌ ${error.message || "Failed to create venue"}
          </div>
        `;
      }
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.textContent = "✅ Create Venue & Return to Event";
    }
  },

  // Initialize inline venue location map
  initializeCreateVenueLocationMap: async function () {
    try {
      console.log("🗺️ Initializing inline venue location map...");

      // Enhanced availability check with retry logic
      let retryCount = 0;
      const maxRetries = 15;
      const retryInterval = 300;

      const checkMapServiceAvailability = () => {
        return new Promise((resolve, reject) => {
          const attemptCheck = () => {
            if (window.MapService && typeof maplibregl !== "undefined") {
              console.log(
                "✅ MapService and MapLibre GL available for inline venue creation",
              );
              resolve();
            } else if (retryCount < maxRetries) {
              retryCount++;
              console.log(
                `🔄 Inline MapService check attempt ${retryCount}/${maxRetries}...`,
              );
              setTimeout(attemptCheck, retryInterval);
            } else {
              reject(
                new Error(
                  "MapService or MapLibre GL not available for inline venue creation",
                ),
              );
            }
          };
          attemptCheck();
        });
      };

      // Wait for MapService availability
      await checkMapServiceAvailability();

      if (!window.MapService) {
        throw new Error("MapService not available after availability check");
      }

      // Initialize map
      const map = await window.MapService.initializeMap(
        "create-venue-location-map",
        {
          center: [103.8198, 1.3521], // Singapore default
          zoom: 11,
        },
      );

      if (map) {
        let currentMarker = null;

        // Enable location picker
        const enablePickerBtn = document.getElementById(
          "create-enable-location-picker-btn",
        );
        if (enablePickerBtn) {
          enablePickerBtn.addEventListener("click", () => {
            console.log("📍 Location picker enabled");
            map.getCanvas().style.cursor = "crosshair";

            // Add visual feedback
            enablePickerBtn.innerHTML = "🎯 Click Map to Place Pin";
            enablePickerBtn.style.background =
              "linear-gradient(135deg, #10b981 0%, #059669 100%)";

            // Add click listener to map
            map.on("click", (e) => {
              const { lng, lat } = e.lngLat;

              // Remove existing marker
              if (currentMarker) {
                currentMarker.remove();
              }

              // Add new marker
              currentMarker = window.MapService.addMarker(map, {
                lng: lng,
                lat: lat,
                popup: `
                  <div style="text-align: center; padding: 0.5rem;">
                    <strong>Selected Location</strong><br>
                    ${lat}, ${lng}
                  </div>
                `,
              });

              // Update form fields
              document.getElementById("createVenueLatitude").value = lat;
              document.getElementById("createVenueLongitude").value = lng;

              // Show location info
              const locationInfo = document.getElementById(
                "create-selected-location-info",
              );
              const locationText = document.getElementById(
                "create-selected-location-text",
              );
              if (locationInfo && locationText) {
                locationText.textContent = `${lat}, ${lng}`;
                locationInfo.style.display = "block";
              }

              // Reset cursor
              map.getCanvas().style.cursor = "";

              console.log("📍 Location selected:", { lat, lng });
            });
          });
        }

        // Current location button
        const currentLocationBtn = document.getElementById(
          "create-get-current-location-btn",
        );
        if (currentLocationBtn) {
          currentLocationBtn.addEventListener("click", () => {
            if (navigator.geolocation) {
              currentLocationBtn.textContent = "📡 Getting location...";
              currentLocationBtn.disabled = true;

              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const lat = position.coords.latitude;
                  const lng = position.coords.longitude;

                  // Center map on user location
                  map.setCenter([lng, lat]);
                  map.setZoom(15);

                  // Remove existing marker
                  if (currentMarker) {
                    currentMarker.remove();
                  }

                  // Add marker at current location
                  currentMarker = window.MapService.addMarker(map, {
                    lng: lng,
                    lat: lat,
                    popup: `
                      <div style="text-align: center; padding: 0.5rem;">
                        <strong>Your Current Location</strong><br>
                        ${lat}, ${lng}
                      </div>
                    `,
                  });

                  // Update form fields
                  document.getElementById("createVenueLatitude").value = lat;
                  document.getElementById("createVenueLongitude").value = lng;

                  // Show location info
                  const locationInfo = document.getElementById(
                    "create-selected-location-info",
                  );
                  const locationText = document.getElementById(
                    "create-selected-location-text",
                  );
                  if (locationInfo && locationText) {
                    locationText.textContent = `${lat}, ${lng} (Current Location)`;
                    locationInfo.style.display = "block";
                  }

                  currentLocationBtn.textContent = "📱 Use My Location";
                  currentLocationBtn.disabled = false;

                  console.log("📱 Current location set:", { lat, lng });
                },
                (error) => {
                  console.error("Geolocation error:", error);
                  alert(
                    "Unable to get your current location. Please select manually on the map.",
                  );
                  currentLocationBtn.textContent = "📱 Use My Location";
                  currentLocationBtn.disabled = false;
                },
              );
            } else {
              alert("Geolocation is not supported by this browser.");
            }
          });
        }

        // Search functionality
        const searchBtn = document.getElementById("create-search-location-btn");
        const searchInput = document.getElementById("create-location-search");

        if (searchBtn && searchInput) {
          const performSearch = async () => {
            const query = searchInput.value.trim();
            if (!query) return;

            try {
              searchBtn.textContent = "🔍 Searching...";
              searchBtn.disabled = true;

              // Simple geocoding simulation - in real app would use AWS Location Service
              console.log("🔍 Searching for:", query);

              // For demo, center on Singapore if searching
              const lat = 1.3521 + (Math.random() - 0.5) * 0.1;
              const lng = 103.8198 + (Math.random() - 0.5) * 0.1;

              map.setCenter([lng, lat]);
              map.setZoom(15);

              // Remove existing marker
              if (currentMarker) {
                currentMarker.remove();
              }

              // Add marker at search result
              currentMarker = window.MapService.addMarker(map, {
                lng: lng,
                lat: lat,
                popup: `
                  <div style="text-align: center; padding: 0.5rem;">
                    <strong>Search Result</strong><br>
                    ${query}<br>
                    ${lat}, ${lng}
                  </div>
                `,
              });

              // Update form fields
              document.getElementById("createVenueLatitude").value = lat;
              document.getElementById("createVenueLongitude").value = lng;
              document.getElementById("createVenueAddress").value = query;

              // Show location info
              const locationInfo = document.getElementById(
                "create-selected-location-info",
              );
              const locationText = document.getElementById(
                "create-selected-location-text",
              );
              if (locationInfo && locationText) {
                locationText.textContent = `${lat}, ${lng} (${query})`;
                locationInfo.style.display = "block";
              }
            } catch (error) {
              console.error("Search error:", error);
              alert(
                "Search failed. Please try again or select manually on the map.",
              );
            } finally {
              searchBtn.textContent = "🔍 Search";
              searchBtn.disabled = false;
            }
          };

          searchBtn.addEventListener("click", performSearch);
          searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              performSearch();
            }
          });
        }

        console.log("✅ Inline venue location map initialized successfully");
      } else {
        throw new Error("Failed to initialize map");
      }
    } catch (error) {
      console.error(
        "❌ Failed to initialize inline venue location map:",
        error,
      );
      this.showCreateVenueMapError("Failed to load map. Please try again.");
    }
  },

  // Show map error for create venue modal
  showCreateVenueMapError: function (message) {
    const mapContainer = document.getElementById("create-venue-location-map");
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #dc3545;
          background: linear-gradient(135deg, #fdf2f2 0%, #fef2f2 100%);
          border: 2px solid #f87171;
          border-radius: 12px;
        ">
          <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.8;">❌</div>
            <p style="margin: 0 0 1rem 0; font-weight: 600; color: #991b1b; font-size: 1.1rem;">${message}</p>
            <button
              onclick="EventsPage.initializeCreateVenueLocationMap()"
              style="
                padding: 12px 20px;
                background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s ease;
              "
              onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(220,38,38,0.4)'"
              onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
            >
              🔄 Retry Loading Map
            </button>
          </div>
        </div>
      `;
    }
  },
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  EventsPage.init();
});
