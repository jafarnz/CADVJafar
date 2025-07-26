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

    // Create venue from event modal
    const createVenueBtn = document.getElementById("create-venue-btn");
    if (createVenueBtn) {
      createVenueBtn.addEventListener("click", () => {
        window.location.href = "venues.html?action=create";
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
    });
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
        "Failed to load events and venues. Please try again later.",
      );
    }
  },

  // Apply search and filter criteria
  applyFilters: function () {
    const searchTerm =
      document.getElementById("search-input")?.value.toLowerCase() || "";
    const genreFilter = document.getElementById("genre-filter")?.value || "";
    const dateFilter = document.getElementById("date-filter")?.value || "";
    const sortBy = document.getElementById("sort-select")?.value || "date-asc";

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

    // Add event markers to map
    if (this.mapInitialized && this.filteredEvents.length > 0) {
      MapService.addEventMarkers(this.filteredEvents, this.venues);
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
        <img src="${imageUrl}" alt="${Utils.sanitizeInput(event.name)}" class="event-card-image"
             onerror="this.src='/api/placeholder/350/200'">
        <div class="event-card-content">
          <h3 class="event-card-title">${Utils.sanitizeInput(event.name)}</h3>
          <div class="event-card-meta">
            <span><strong>📅</strong> ${Utils.formatDate(event.eventDate)} at ${Utils.formatTime(event.eventTime)}</span>
            <span><strong>📍</strong> ${venue ? Utils.sanitizeInput(venue.name) : "Venue TBA"}</span>
            ${event.genre ? `<span><strong>🎵</strong> ${Utils.capitalize(event.genre)}</span>` : ""}
          </div>
          ${event.description ? `<p class="event-card-description">${Utils.sanitizeInput(event.description)}</p>` : ""}
          <div class="event-card-actions">
            <div>
              ${event.genre ? `<span class="genre-badge">${Utils.capitalize(event.genre)}</span>` : ""}
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary view-details-btn" data-event-id="${event.eventID}">
                View Details
              </button>
              ${isUpcoming ? `<button class="join-btn" data-event-id="${event.eventID}">Join Event</button>` : `<button class="join-btn" disabled>Event Passed</button>`}
            </div>
          </div>
        </div>
      </div>
    `;
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
  },

  // Show event details in modal
  showEventDetails: function (eventId) {
    const event = this.events.find(
      (e) => e.eventID.toString() === eventId.toString(),
    );
    if (!event) return;

    const venue = this.venues.find((v) => v.venueID === event.venueID);
    const modal = document.getElementById("event-details-modal");
    const content = document.getElementById("event-details-content");

    if (!modal || !content) return;

    const eventDate = new Date(event.eventDate);
    const isUpcoming = eventDate >= new Date();
    const imageUrl = event.imageUrl || "/api/placeholder/600/300";

    content.innerHTML = `
      <div style="text-align: center; margin-bottom: 2rem;">
        <img src="${imageUrl}" alt="${Utils.sanitizeInput(event.name)}"
             style="width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px;"
             onerror="this.style.display='none'">
        <h2 style="margin: 1rem 0 0.5rem 0;">${Utils.sanitizeInput(event.name)}</h2>
        ${event.genre ? `<span class="genre-badge" style="font-size: 1rem; padding: 0.5rem 1rem;">${Utils.capitalize(event.genre)}</span>` : ""}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <h4 style="margin: 0 0 0.5rem 0; color: #333;">📅 Date & Time</h4>
          <p style="margin: 0; color: #666;">${Utils.formatDate(event.eventDate)}<br>${Utils.formatTime(event.eventTime)}</p>
        </div>
        <div>
          <h4 style="margin: 0 0 0.5rem 0; color: #333;">📍 Venue</h4>
          <p style="margin: 0; color: #666;">
            ${venue ? `${Utils.sanitizeInput(venue.name)}<br><small>${Utils.sanitizeInput(venue.address)}</small>` : "Venue TBA"}
          </p>
        </div>
      </div>

      ${
        event.description
          ? `
        <div style="margin-bottom: 1.5rem;">
          <h4 style="margin: 0 0 0.5rem 0; color: #333;">About This Event</h4>
          <p style="margin: 0; color: #666; line-height: 1.6;">${Utils.sanitizeInput(event.description)}</p>
        </div>
      `
          : ""
      }

      <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
        ${
          isUpcoming
            ? `
          <button onclick="EventsPage.joinEvent('${event.eventID}')" class="join-btn" style="padding: 0.75rem 2rem;">
            Join This Event
          </button>
        `
            : `
          <button class="btn btn-secondary" disabled>Event Has Passed</button>
        `
        }
        ${
          venue && venue.latitude && venue.longitude
            ? `
          <button onclick="MapService.showDirections(${venue.latitude}, ${venue.longitude}, '${Utils.sanitizeInput(venue.name).replace(/'/g, "\\'")}')" class="btn btn-secondary">
            Get Directions
          </button>
        `
            : ""
        }
        <button onclick="Utils.copyToClipboard(window.location.href + '?event=${event.eventID}')" class="btn btn-secondary">
          Share Event
        </button>
      </div>
    `;

    modal.style.display = "block";
  },

  // Join an event
  joinEvent: function (eventId) {
    const event = this.events.find(
      (e) => e.eventID.toString() === eventId.toString(),
    );
    if (!event) return;

    // For now, just show a success message
    // In a real app, this would make an API call to join the event
    Utils.showSuccess(
      `You've successfully joined "${event.name}"! You'll receive updates about this event.`,
    );

    // TODO: Implement actual join event API call
    // const joinUrl = CONFIG.buildApiUrl(`/events/${eventId}/join`);
    // await Utils.apiCall(joinUrl, { method: 'POST', headers: CONFIG.getAuthHeaders() });
  },

  // Toggle to map view
  toggleMapView: function () {
    this.isMapView = true;
    document.getElementById("map-container-wrapper").style.display = "block";
    document.getElementById("events-list-wrapper").style.display = "none";
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

    try {
      Utils.showLoading(submitBtn, "Creating...");

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
            "Image upload failed, but event will be created without image.",
            messagesDiv.id,
          );
        }
      }

      const eventData = {
        eventID: CONFIG.generateEventID(),
        name: formData.get("name"),
        description: formData.get("description") || "",
        genre: formData.get("genre") || null,
        eventDate: formData.get("eventDate"),
        eventTime: formData.get("eventTime"),
        venueID: parseInt(formData.get("venueID")),
        imageUrl: imageUrl,
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
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  EventsPage.init();
});
