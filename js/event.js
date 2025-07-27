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
        init: async function() {
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
        setupEventListeners: function() {
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
            const createCustomVenueBtn = document.getElementById("create-custom-venue-btn");
            
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
            const closeCreateVenueModal = document.getElementById("close-create-venue-modal");
            const cancelCreateVenueBtn = document.getElementById("cancel-create-venue-btn");
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
        loadAllData: async function() {
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
                } else if (eventsResponse && eventsResponse.events && Array.isArray(eventsResponse.events)) {
                    this.events = eventsResponse.events;
                } else if (eventsResponse && eventsResponse.Items && Array.isArray(eventsResponse.Items)) {
                    this.events = eventsResponse.Items;
                } else if (eventsResponse && eventsResponse.message) {
                    try {
                        const parsedEvents = JSON.parse(eventsResponse.message);
                        if (Array.isArray(parsedEvents)) {
                            this.events = parsedEvents;
                            console.log("✅ Events parsed from message field:", this.events.length);
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
                } else if (venuesResponse && venuesResponse.venues && Array.isArray(venuesResponse.venues)) {
                    this.venues = venuesResponse.venues;
                } else if (venuesResponse && venuesResponse.Items && Array.isArray(venuesResponse.Items)) {
                    this.venues = venuesResponse.Items;
                } else if (venuesResponse && venuesResponse.message) {
                    try {
                        const parsedVenues = JSON.parse(venuesResponse.message);
                        if (Array.isArray(parsedVenues)) {
                            this.venues = parsedVenues;
                            console.log("✅ Venues parsed from message field:", this.venues.length);
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
        applyFilters: function() {
            const searchInput = document.getElementById("search-input");
            const genreFilterEl = document.getElementById("genre-filter");
            const dateFilterEl = document.getElementById("date-filter");
            const sortSelectEl = document.getElementById("sort-select");

            const searchTerm = searchInput && searchInput.value.toLowerCase() || "";
            const genreFilter = genreFilterEl && genreFilterEl.value || "";
            const dateFilter = dateFilterEl && dateFilterEl.value || "";
            const sortBy = sortSelectEl && sortSelectEl.value || "date-asc";

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
        render: function() {
            if (this.isMapView) {
                this.renderMapView();
            } else {
                this.renderListView();
            }
            this.updateEventsCount();
            this.updatePagination();
        },

        // Render list view
        renderListView: function() {
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
        renderMapView: async function() {
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
        renderEventsAndVenuesOnMap: async function() {
            try {
                console.log("🗺️ Loading venues and event pins...");
                
                // First load and show venue markers
                await MapService.loadVenues();
                MapService.addVenueMarkers();
                
                // Then add event pins with our events data
                let eventPinsCount = 0;
                const validEvents = this.filteredEvents.filter(event => {
                    const venue = this.venues.find(v => v.venueID === event.venueID);
                    return venue && venue.latitude && venue.longitude;
                });

                console.log(`📍 Adding ${validEvents.length} event pins to map...`);

                for (const event of validEvents) {
                    const venue = this.venues.find(v => v.venueID === event.venueID);
                    if (venue && venue.latitude && venue.longitude) {
                        // Create event marker
                        const eventDate = new Date(event.eventDate);
                        const isUpcoming = eventDate >= new Date();
                        
                        const marker = new window.maplibregl.Marker({
                            color: isUpcoming ? '#ef4444' : '#6b7280',
                            scale: 1.2
                        })
                        .setLngLat([parseFloat(venue.longitude), parseFloat(venue.latitude)])
                        .setPopup(new window.maplibregl.Popup().setHTML(`
                            <div style="text-align: center; padding: 0.5rem; max-width: 250px;">
                                <h4 style="margin: 0 0 0.5rem 0; color: #333; font-size: 1rem;">${event.name}</h4>
                                <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">
                                    📅 ${Utils.formatDate(event.eventDate)} at ${Utils.formatTime(event.eventTime)}
                                </p>
                                <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">
                                    📍 ${venue.name}
                                </p>
                                ${event.genre ? `<p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">🎵 ${Utils.capitalize(event.genre)}</p>` : ''}
                                <button onclick="EventsPage.showEventDetails('${event.eventID}')" 
                                        style="background: #3b82f6; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer; margin-top: 0.5rem;">
                                    View Details
                                </button>
                                <button onclick="EventsPage.openEventInGoogleMaps('${event.eventID}')" 
                                        style="background: #4285f4; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer; margin-top: 0.5rem; margin-left: 0.5rem;">
                                    📍 Maps
                                </button>
                            </div>
                        `))
                        .addTo(MapService.map);
                        
                        eventPinsCount++;
                    }
                }
                
                console.log(`✅ Events map loaded with ${MapService.venueMarkers.length} venues and ${eventPinsCount} event pins`);
                
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
        createEventCard: function(event) {
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
              <button class="btn edit-event-btn" data-event-id="${event.eventID}" 
                      style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">
                ✏️ Edit
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
  },

  // Show event details with venue map
  showEventDetails: function (eventId) {
    const event = this.events.find(
      (e) => e.eventID.toString() === eventId.toString(),
    );
    if (!event) return;

    const venue = this.venues.find((v) => v.venueID === event.venueID || v.venueId === event.venueID);
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

      ${venue ? `
        <!-- Venue Map -->
        <div style="margin-bottom: 1.5rem;">
          <h4 style="margin: 0 0 1rem 0; color: #333; display: flex; align-items: center; gap: 0.5rem;">
            🗺️ Venue Location
          </h4>
          <div id="event-venue-map" style="
            height: 300px; 
            width: 100%; 
            border: 2px solid #e2e8f0; 
            border-radius: 12px; 
            background: #f8fafc;
          ">
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #64748b;">
              <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 0.5rem;">🗺️</div>
                <p style="margin: 0; font-weight: 600;">Loading venue map...</p>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

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
          <button class="btn btn-secondary" disabled style="padding: 0.75rem 2rem;">
            Event Ended
          </button>
        `
        }
        <button onclick="document.getElementById('event-details-modal').style.display='none'" class="btn btn-secondary" style="padding: 0.75rem 2rem;">
          Close
        </button>
      </div>
    `;

    modal.style.display = "block";

    // Initialize venue map if venue has coordinates
    if (venue && (venue.coordinates || (venue.latitude && venue.longitude))) {
      setTimeout(async () => {
        try {
          await this.initializeEventVenueMap(venue);
        } catch (error) {
          console.error("❌ Failed to initialize venue map:", error);
        }
      }, 100);
    }
  },
  
  // Initialize map for event venue
  initializeEventVenueMap: async function(venue) {
    try {
      console.log("🗺️ Initializing event venue map for:", venue.name);
      
      // Get coordinates
      let coordinates;
      if (venue.coordinates && Array.isArray(venue.coordinates)) {
        coordinates = venue.coordinates; // [lng, lat]
      } else if (venue.latitude && venue.longitude) {
        coordinates = [parseFloat(venue.longitude), parseFloat(venue.latitude)];
      } else {
        throw new Error("No valid coordinates found for venue");
      }
      
      // Initialize map
      const map = await MapService.initializeVenueMap('event-venue-map', {
        center: coordinates,
        zoom: 15
      });
      
      // Add venue marker with popup
      const popupContent = `
        <div style="text-align: center; padding: 8px;">
          <h4 style="margin: 0 0 8px 0; color: #1e293b;">${venue.name}</h4>
          ${venue.address ? `<p style="margin: 0; color: #64748b; font-size: 0.9rem;">${venue.address}</p>` : ''}
        </div>
      `;
      
      MapService.addMarker(map, {
        lng: coordinates[0],
        lat: coordinates[1],
        popup: popupContent
      });
      
      console.log("✅ Event venue map initialized successfully");
      
    } catch (error) {
      console.error("❌ Failed to initialize event venue map:", error);
      
      // Show error in map container
      const mapContainer = document.getElementById('event-venue-map');
      if (mapContainer) {
        mapContainer.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border-radius: 10px;
            color: #991b1b;
          ">
            <div style="text-align: center;">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">🗺️</div>
              <p style="margin: 0; font-weight: 600;">Map Unavailable</p>
              <p style="margin: 0; font-size: 0.8rem; opacity: 0.8;">Venue location could not be displayed</p>
            </div>
          </div>
        `;
      }
    }
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

  // Edit an event
  editEvent: function (eventId) {
    const event = this.events.find(
      (e) => e.eventID.toString() === eventId.toString(),
    );
    if (!event) {
      Utils.showError('Event not found');
      return;
    }

    // Pre-populate the create event form with existing data
    this.populateEditForm(event);
    
    // Show the create event modal (which will now be in edit mode)
    const modal = document.getElementById("create-event-modal");
    if (modal) {
      const modalTitle = modal.querySelector("h2");
      if (modalTitle) {
        modalTitle.textContent = "Edit Event";
      }
      
      // Add edit mode flag and event ID to form
      const form = document.getElementById("create-event-form");
      if (form) {
        form.setAttribute("data-edit-mode", "true");
        form.setAttribute("data-event-id", eventId);
      }
      
      modal.style.display = "block";
    }
  },

  // Populate form with event data for editing
  populateEditForm: function(event) {
    const form = document.getElementById("create-event-form");
    if (!form) return;

    // Populate form fields
    const eventNameField = form.querySelector("#event-name");
    if (eventNameField) eventNameField.value = event.name || '';

    const eventDateField = form.querySelector("#event-date");
    if (eventDateField) eventDateField.value = event.eventDate || '';

    const eventTimeField = form.querySelector("#event-time");
    if (eventTimeField) eventTimeField.value = event.eventTime || '';

    const eventGenreField = form.querySelector("#event-genre");
    if (eventGenreField) eventGenreField.value = event.genre || '';

    const eventDescriptionField = form.querySelector("#event-description");
    if (eventDescriptionField) eventDescriptionField.value = event.description || '';

    const venueSelectField = form.querySelector("#venue-select");
    if (venueSelectField) venueSelectField.value = event.venueID || '';
  },

  // Open event location in Google Maps
  openEventInGoogleMaps: function(eventId) {
    const event = this.events.find(e => e.eventID.toString() === eventId.toString());
    if (!event) {
      alert('Event not found');
      return;
    }
    
    const venue = this.venues.find(v => v.venueID === event.venueID);
    if (!venue) {
      alert('Venue information not available for this event');
      return;
    }
    
    const lat = venue.latitude;
    const lng = venue.longitude;
    const eventName = event.name || 'Event';
    const venueName = venue.name || 'Venue';
    const address = venue.address || '';
    
    if (lat && lng) {
      // Use coordinates for precise location
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(eventName + ' at ' + venueName)}`;
      window.open(googleMapsUrl, '_blank');
    } else if (address) {
      // Fallback to address search
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', Singapore')}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      alert('Location information not available for this event');
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
            `Image upload failed, but event will be ${isEditMode ? 'updated' : 'created'} without image.`,
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
        url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS + '/' + eventId);
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
        `Event ${isEditMode ? 'updated' : 'created'} successfully!`, 
        messagesDiv.id
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
  openCreateEventModal: async function() {
    const modal = document.getElementById("create-event-modal");
    this.clearEventForm();
    await this.loadVenuesForDropdown();
    modal.style.display = "block";
  },

  clearEventForm: function() {
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

  loadVenuesForDropdown: async function() {
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
        }
      );

      console.log("✅ Venues loaded:", response);

      // Handle wrapped response
      const venues = response.venues || response.message?.venues || response.Items || response;
      
      if (Array.isArray(venues)) {
        this.venues = venues;
        
        // Populate dropdown
        venueSelect.innerHTML = '<option value="">Select a venue...</option>';
        
        venues.forEach(venue => {
          const option = document.createElement("option");
          option.value = venue.venueID || venue.id;
          option.textContent = `${venue.name} - ${venue.address || 'Address not specified'}`;
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

  updateVenuePreview: function() {
    const venueSelect = document.getElementById("eventVenue");
    const venuePreview = document.getElementById("selected-venue-preview");
    const venueName = document.getElementById("venue-preview-name");
    const venueAddress = document.getElementById("venue-preview-address");
    const venueDetails = document.getElementById("venue-preview-details");

    if (!venueSelect || !venuePreview) return;

    const selectedOption = venueSelect.selectedOptions[0];
    
    if (selectedOption && selectedOption.value && selectedOption.dataset.venue) {
      try {
        const venue = JSON.parse(selectedOption.dataset.venue);
        
        if (venueName) venueName.textContent = venue.name || 'Unknown Venue';
        if (venueAddress) venueAddress.textContent = venue.address || 'Address not specified';
        if (venueDetails) {
          const details = [];
          if (venue.type) details.push(`Type: ${venue.type}`);
          if (venue.capacity) details.push(`Capacity: ${venue.capacity}`);
          venueDetails.textContent = details.join(' • ');
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

  handleCustomVenueCreation: function() {
    // Instead of redirecting, open the inline venue creation modal
    const createVenueModal = document.getElementById("create-venue-modal");
    if (createVenueModal) {
      // Store current event form data
      const eventFormData = this.getEventFormData();
      sessionStorage.setItem('pendingEventData', JSON.stringify(eventFormData));
      
      // Open the venue creation modal
      createVenueModal.style.display = "block";
      
      // Initialize the venue location map with proper delay
      setTimeout(() => {
        this.initializeCreateVenueLocationMap();
      }, 1000); // Increased delay to ensure MapService is ready
    } else {
      // Fallback to redirect if modal not found
      const eventFormData = this.getEventFormData();
      sessionStorage.setItem('pendingEventData', JSON.stringify(eventFormData));
      window.location.href = "venues.html?action=create&returnTo=events";
    }
  },

  getEventFormData: function() {
    const form = document.getElementById("create-event-form");
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    return data;
  },

  restoreEventFormData: function() {
    const pendingData = sessionStorage.getItem('pendingEventData');
    if (!pendingData) return;

    try {
      const data = JSON.parse(pendingData);
      const form = document.getElementById("create-event-form");
      
      if (form) {
        Object.keys(data).forEach(key => {
          const field = form.querySelector(`[name="${key}"]`);
          if (field && data[key]) {
            field.value = data[key];
          }
        });
      }
      
      // Clear stored data
      sessionStorage.removeItem('pendingEventData');
      console.log("✅ Event form data restored");
    } catch (error) {
      console.error("❌ Failed to restore event form data:", error);
    }
  },

  // Check if returning from venue creation
  checkReturnFromVenueCreation: function() {
    const urlParams = new URLSearchParams(window.location.search);
    const returnFrom = urlParams.get('returnFrom');
    const newVenueId = urlParams.get('venueId');
    
    if (returnFrom === 'venues' && newVenueId) {
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
  handleInlineVenueCreation: async function(e) {
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
        id: 'venue_' + Date.now(),
        name: name,
        address: address,
        description: formData.get("description") || "",
        capacity: formData.get("capacity") ? parseInt(formData.get("capacity")) : null,
        type: formData.get("type") || "",
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        location: {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude)
        }
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
      const existingVenues = JSON.parse(localStorage.getItem('venues') || '[]');
      existingVenues.push(venueData);
      localStorage.setItem('venues', JSON.stringify(existingVenues));

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
                  if (venue.id === venueData.id || venue.name === venueData.name) {
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
  initializeCreateVenueLocationMap: async function() {
    try {
      console.log("🗺️ Initializing inline venue location map...");
      
      // Enhanced availability check with retry logic
      let retryCount = 0;
      const maxRetries = 15;
      const retryInterval = 300;

      const checkMapServiceAvailability = () => {
        return new Promise((resolve, reject) => {
          const attemptCheck = () => {
            if (window.MapService && typeof maplibregl !== 'undefined') {
              console.log("✅ MapService and MapLibre GL available for inline venue creation");
              resolve();
            } else if (retryCount < maxRetries) {
              retryCount++;
              console.log(`🔄 Inline MapService check attempt ${retryCount}/${maxRetries}...`);
              setTimeout(attemptCheck, retryInterval);
            } else {
              reject(new Error("MapService or MapLibre GL not available for inline venue creation"));
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
      const map = await window.MapService.initializeMap('create-venue-location-map', {
        center: [103.8198, 1.3521], // Singapore default
        zoom: 11
      });

      if (map) {
        let currentMarker = null;
        
        // Enable location picker
        const enablePickerBtn = document.getElementById("create-enable-location-picker-btn");
        if (enablePickerBtn) {
          enablePickerBtn.addEventListener("click", () => {
            console.log("📍 Location picker enabled");
            map.getCanvas().style.cursor = 'crosshair';
            
            // Add visual feedback
            enablePickerBtn.innerHTML = '🎯 Click Map to Place Pin';
            enablePickerBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            
            // Add click listener to map
            map.on('click', (e) => {
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
                    ${lat.toFixed(6)}, ${lng.toFixed(6)}
                  </div>
                `
              });
              
              // Update form fields
              document.getElementById("createVenueLatitude").value = lat.toFixed(6);
              document.getElementById("createVenueLongitude").value = lng.toFixed(6);
              
              // Show location info
              const locationInfo = document.getElementById("create-selected-location-info");
              const locationText = document.getElementById("create-selected-location-text");
              if (locationInfo && locationText) {
                locationText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                locationInfo.style.display = 'block';
              }
              
              // Reset cursor
              map.getCanvas().style.cursor = '';
              
              console.log("📍 Location selected:", { lat, lng });
            });
          });
        }

        // Current location button
        const currentLocationBtn = document.getElementById("create-get-current-location-btn");
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
                        ${lat.toFixed(6)}, ${lng.toFixed(6)}
                      </div>
                    `
                  });
                  
                  // Update form fields
                  document.getElementById("createVenueLatitude").value = lat.toFixed(6);
                  document.getElementById("createVenueLongitude").value = lng.toFixed(6);
                  
                  // Show location info
                  const locationInfo = document.getElementById("create-selected-location-info");
                  const locationText = document.getElementById("create-selected-location-text");
                  if (locationInfo && locationText) {
                    locationText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)} (Current Location)`;
                    locationInfo.style.display = 'block';
                  }
                  
                  currentLocationBtn.textContent = "📱 Use My Location";
                  currentLocationBtn.disabled = false;
                  
                  console.log("📱 Current location set:", { lat, lng });
                },
                (error) => {
                  console.error("Geolocation error:", error);
                  alert("Unable to get your current location. Please select manually on the map.");
                  currentLocationBtn.textContent = "📱 Use My Location";
                  currentLocationBtn.disabled = false;
                }
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
                    ${lat.toFixed(6)}, ${lng.toFixed(6)}
                  </div>
                `
              });
              
              // Update form fields
              document.getElementById("createVenueLatitude").value = lat.toFixed(6);
              document.getElementById("createVenueLongitude").value = lng.toFixed(6);
              document.getElementById("createVenueAddress").value = query;
              
              // Show location info
              const locationInfo = document.getElementById("create-selected-location-info");
              const locationText = document.getElementById("create-selected-location-text");
              if (locationInfo && locationText) {
                locationText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)} (${query})`;
                locationInfo.style.display = 'block';
              }
              
            } catch (error) {
              console.error("Search error:", error);
              alert("Search failed. Please try again or select manually on the map.");
            } finally {
              searchBtn.textContent = "🔍 Search";
              searchBtn.disabled = false;
            }
          };
          
          searchBtn.addEventListener("click", performSearch);
          searchInput.addEventListener("keypress", (e) => {
            if (e.key === 'Enter') {
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
      console.error("❌ Failed to initialize inline venue location map:", error);
      this.showCreateVenueMapError("Failed to load map. Please try again.");
    }
  },

  // Show map error for create venue modal
  showCreateVenueMapError: function(message) {
    const mapContainer = document.getElementById('create-venue-location-map');
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