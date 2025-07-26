// Event Details page functionality for Local Gigs App
const EventDetailsPage = {
        eventId: null,
        event: null,
        venue: null,
        mapInitialized: false,
        similarEvents: [],

        // Initialize the event details page
        init: async function() {
            console.log("Initializing event details page...");

            // Check authentication
            if (!Utils.requireAuth()) {
                return;
            }

            // Get event ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            this.eventId = urlParams.get('id');

            if (!this.eventId) {
                this.showError();
                return;
            }

            // Set up event listeners
            this.setupEventListeners();

            // Load event data
            await this.loadEventData();

            console.log("Event details page initialized successfully");
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

            // Join Event Modal
            const joinEventModal = document.getElementById("join-event-modal");
            const closeJoinModal = document.getElementById("close-join-modal");

            if (closeJoinModal && joinEventModal) {
                closeJoinModal.addEventListener("click", () => {
                    joinEventModal.style.display = "none";
                });
            }

            // Share Event Modal
            const shareEventModal = document.getElementById("share-event-modal");
            const closeShareModal = document.getElementById("close-share-modal");
            const copyLinkBtn = document.getElementById("copy-link-btn");

            if (closeShareModal && shareEventModal) {
                closeShareModal.addEventListener("click", () => {
                    shareEventModal.style.display = "none";
                });
            }

            if (copyLinkBtn) {
                copyLinkBtn.addEventListener("click", () => {
                    this.copyEventLink();
                });
            }

            // Social sharing buttons
            const shareFacebookBtn = document.getElementById("share-facebook-btn");
            const shareTwitterBtn = document.getElementById("share-twitter-btn");
            const shareWhatsappBtn = document.getElementById("share-whatsapp-btn");
            const shareEmailBtn = document.getElementById("share-email-btn");

            if (shareFacebookBtn) {
                shareFacebookBtn.addEventListener("click", () => {
                    this.shareOnFacebook();
                });
            }

            if (shareTwitterBtn) {
                shareTwitterBtn.addEventListener("click", () => {
                    this.shareOnTwitter();
                });
            }

            if (shareWhatsappBtn) {
                shareWhatsappBtn.addEventListener("click", () => {
                    this.shareOnWhatsApp();
                });
            }

            if (shareEmailBtn) {
                shareEmailBtn.addEventListener("click", () => {
                    this.shareViaEmail();
                });
            }

            // Close modals when clicking outside
            window.addEventListener("click", (e) => {
                if (e.target === joinEventModal) {
                    joinEventModal.style.display = "none";
                }
                if (e.target === shareEventModal) {
                    shareEventModal.style.display = "none";
                }
            });
        },

        // Load event data and related information
        loadEventData: async function() {
            try {
                // Load event details
                const eventUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS, this.eventId);
                this.event = await Utils.apiCall(eventUrl, {
                    method: "GET",
                    headers: CONFIG.getAuthHeaders(),
                });

                // Load venue details if event has a venue
                if (this.event.venueID) {
                    await this.loadVenueData();
                }

                // Load similar events
                await this.loadSimilarEvents();

                // Render the event details
                this.renderEventDetails();

                // Initialize map if venue has coordinates
                if (this.venue && this.venue.latitude && this.venue.longitude) {
                    await this.initializeMap();
                }

            } catch (error) {
                console.error("Failed to load event data:", error);
                this.showError();
            }
        },

        // Load venue data for the event
        loadVenueData: async function() {
            try {
                const venueUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES, this.event.venueID);
                this.venue = await Utils.apiCall(venueUrl, {
                    method: "GET",
                    headers: CONFIG.getAuthHeaders(),
                });
            } catch (error) {
                console.error("Failed to load venue data:", error);
                this.venue = null;
            }
        },

        // Load similar events (same genre or nearby)
        loadSimilarEvents: async function() {
            try {
                const eventsUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS);
                const eventsResponse = await Utils.apiCall(eventsUrl, {
                    method: "GET",
                    headers: CONFIG.getAuthHeaders(),
                });

                let allEvents = [];

                // Handle different response formats
                if (Array.isArray(eventsResponse)) {
                    allEvents = eventsResponse;
                } else if (eventsResponse && eventsResponse.events && Array.isArray(eventsResponse.events)) {
                    allEvents = eventsResponse.events;
                } else if (eventsResponse && eventsResponse.Items && Array.isArray(eventsResponse.Items)) {
                    allEvents = eventsResponse.Items;
                } else if (eventsResponse && eventsResponse.message) {
                    try {
                        const parsedEvents = JSON.parse(eventsResponse.message);
                        if (Array.isArray(parsedEvents)) {
                            allEvents = parsedEvents;
                        }
                    } catch (parseError) {
                        console.error("Failed to parse events from message:", parseError);
                    }
                }

                // Ensure allEvents is an array before filtering
                if (!Array.isArray(allEvents)) {
                    console.warn("Events data is not an array:", allEvents);
                    allEvents = [];
                }

                // Filter out current event and find similar ones
                this.similarEvents = allEvents
                    .filter(event =>
                        event.eventID !== this.event.eventID &&
                        (event.genre === this.event.genre || event.venueID === this.event.venueID)
                    )
                    .slice(0, 3); // Show up to 3 similar events

            } catch (error) {
                console.error("Failed to load similar events:", error);
                this.similarEvents = [];
            }
        },

        // Render event details
        renderEventDetails: function() {
            this.hideLoading();
            this.showContent();

            // Render event header
            this.renderEventHeader();

            // Render event details section
            this.renderEventDetailsSection();

            // Render venue section
            this.renderVenueSection();

            // Render actions section
            this.renderActionsSection();

            // Render similar events
            this.renderSimilarEvents();

            // Set up share URL
            this.setupShareUrl();
        },

        // Render event header
        renderEventHeader: function() {
                const eventHeader = document.getElementById("event-header");
                if (!eventHeader) return;

                const eventDate = new Date(this.event.eventDate);
                const today = new Date();
                const isToday = eventDate.toDateString() === today.toDateString();
                const isPassed = eventDate < today;

                let statusClass = "upcoming";
                let statusText = "Upcoming Event";

                if (isToday) {
                    statusClass = "today";
                    statusText = "Today";
                } else if (isPassed) {
                    statusClass = "passed";
                    statusText = "Event Passed";
                }

                const imageUrl = this.event.imageUrl || "/api/placeholder/800/300";

                eventHeader.innerHTML = `
      ${this.event.imageUrl ? `
        <img src="${imageUrl}" alt="${Utils.sanitizeInput(this.event.name)}"
             class="event-header-image" onerror="this.style.display='none'">
      ` : ''}

      <div class="event-status ${statusClass}">${statusText}</div>

      <h1 class="event-title">${Utils.sanitizeInput(this.event.name)}</h1>

      ${this.event.description ? `
        <p class="event-subtitle">${Utils.sanitizeInput(this.event.description)}</p>
      ` : ''}

      ${this.event.genre ? `
        <div style="margin-top: 1rem;">
          <span class="genre-badge">${Utils.capitalize(this.event.genre)}</span>
        </div>
      ` : ''}
    `;
  },

  // Render event details section
  renderEventDetailsSection: function () {
    const eventDetails = document.getElementById("event-details");
    if (!eventDetails) return;

    const eventDate = new Date(this.event.eventDate);
    const dayOfWeek = eventDate.toLocaleDateString('en-US', { weekday: 'long' });

    eventDetails.innerHTML = `
      <div class="detail-item">
        <div class="detail-icon">📅</div>
        <div class="detail-content">
          <div class="detail-label">Date & Time</div>
          <div class="detail-value">
            ${dayOfWeek}, ${Utils.formatDate(this.event.eventDate)}<br>
            ${Utils.formatTime(this.event.eventTime)}
          </div>
        </div>
      </div>

      ${this.event.genre ? `
        <div class="detail-item">
          <div class="detail-icon">🎵</div>
          <div class="detail-content">
            <div class="detail-label">Genre</div>
            <div class="detail-value">${Utils.capitalize(this.event.genre)}</div>
          </div>
        </div>
      ` : ''}

      <div class="detail-item">
        <div class="detail-icon">🎫</div>
        <div class="detail-content">
          <div class="detail-label">Event ID</div>
          <div class="detail-value">#${this.event.eventID}</div>
        </div>
      </div>

      ${this.event.description ? `
        <div class="detail-item">
          <div class="detail-icon">📝</div>
          <div class="detail-content">
            <div class="detail-label">Description</div>
            <div class="detail-value">${Utils.sanitizeInput(this.event.description)}</div>
          </div>
        </div>
      ` : ''}
    `;
  },

  // Render venue section
  renderVenueSection: function () {
    const venueDetails = document.getElementById("venue-details");
    if (!venueDetails) return;

    if (!this.venue) {
      venueDetails.innerHTML = `
        <div class="detail-item">
          <div class="detail-icon">📍</div>
          <div class="detail-content">
            <div class="detail-label">Venue</div>
            <div class="detail-value">Venue information not available</div>
          </div>
        </div>
      `;
      return;
    }

    venueDetails.innerHTML = `
      <div class="detail-item">
        <div class="detail-icon">🏢</div>
        <div class="detail-content">
          <div class="detail-label">Venue Name</div>
          <div class="detail-value">${Utils.sanitizeInput(this.venue.name)}</div>
        </div>
      </div>

      <div class="detail-item">
        <div class="detail-icon">📍</div>
        <div class="detail-content">
          <div class="detail-label">Address</div>
          <div class="detail-value">${Utils.sanitizeInput(this.venue.address)}</div>
        </div>
      </div>

      ${this.venue.capacity ? `
        <div class="detail-item">
          <div class="detail-icon">👥</div>
          <div class="detail-content">
            <div class="detail-label">Capacity</div>
            <div class="detail-value">${this.venue.capacity.toLocaleString()} people</div>
          </div>
        </div>
      ` : ''}

      ${this.venue.type ? `
        <div class="detail-item">
          <div class="detail-icon">🏛️</div>
          <div class="detail-content">
            <div class="detail-label">Venue Type</div>
            <div class="detail-value">${Utils.capitalize(this.venue.type.replace('-', ' '))}</div>
          </div>
        </div>
      ` : ''}
    `;
  },

  // Render actions section
  renderActionsSection: function () {
    const eventActions = document.getElementById("event-actions");
    if (!eventActions) return;

    const eventDate = new Date(this.event.eventDate);
    const isPassed = eventDate < new Date();

    eventActions.innerHTML = `
      <button class="action-btn primary" onclick="EventDetailsPage.joinEvent()" ${isPassed ? 'disabled' : ''}>
        ${isPassed ? 'Event Has Passed' : 'Join This Event'}
      </button>

      <button class="action-btn secondary" onclick="EventDetailsPage.shareEvent()">
        📤 Share Event
      </button>

      ${this.venue && this.venue.latitude && this.venue.longitude ? `
        <button class="action-btn secondary" onclick="EventDetailsPage.getDirections()">
          🗺️ Get Directions
        </button>
      ` : ''}

      <button class="action-btn secondary" onclick="EventDetailsPage.addToCalendar()">
        📅 Add to Calendar
      </button>

      <button class="action-btn secondary" onclick="window.location.href='venues.html?venue=${this.event.venueID}'">
        🏢 View Venue Details
      </button>
    `;
  },

  // Render similar events
  renderSimilarEvents: function () {
    const similarEventsDiv = document.getElementById("similar-events");
    if (!similarEventsDiv) return;

    if (this.similarEvents.length === 0) {
      similarEventsDiv.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #666;">
          <p>No similar events found.</p>
          <button onclick="window.location.href='events.html'" class="btn btn-secondary">
            Browse All Events
          </button>
        </div>
      `;
      return;
    }

    similarEventsDiv.innerHTML = `
      <div class="similar-events-grid">
        ${this.similarEvents.map(event => `
          <div class="similar-event-card" onclick="window.location.href='event-details.html?id=${event.eventID}'">
            <div class="similar-event-title">${Utils.sanitizeInput(event.name)}</div>
            <div class="similar-event-meta">
              ${Utils.formatDate(event.eventDate)} at ${Utils.formatTime(event.eventTime)}
              ${event.genre ? `• ${Utils.capitalize(event.genre)}` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // Initialize map
  initializeMap: async function () {
    try {
      const success = await MapService.init("event-map");
      if (success) {
        this.mapInitialized = true;

        // Add marker for the venue
        MapService.addMarker(
          parseFloat(this.venue.latitude),
          parseFloat(this.venue.longitude),
          `
            <div style="text-align: center;">
              <h4>${Utils.sanitizeInput(this.venue.name)}</h4>
              <p>${Utils.sanitizeInput(this.event.name)}</p>
              <small>${Utils.formatDate(this.event.eventDate)} at ${Utils.formatTime(this.event.eventTime)}</small>
            </div>
          `,
          "#007bff"
        );

        // Center map on venue
        MapService.centerOn(
          parseFloat(this.venue.latitude),
          parseFloat(this.venue.longitude),
          15
        );
      }
    } catch (error) {
      console.error("Failed to initialize map:", error);
      document.getElementById("event-map").innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #666;">
          <p>Map not available</p>
        </div>
      `;
    }
  },

  // Join event functionality
  joinEvent: function () {
    const modal = document.getElementById("join-event-modal");
    const content = document.getElementById("join-event-content");

    content.innerHTML = `
      <div style="text-align: center; padding: 1rem 0;">
        <h3>Join "${Utils.sanitizeInput(this.event.name)}"</h3>
        <p style="color: #666; margin: 1rem 0;">
          Are you sure you want to join this event? You'll receive updates and reminders about the event.
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button onclick="EventDetailsPage.confirmJoinEvent()" class="btn">
            Yes, Join Event
          </button>
          <button onclick="document.getElementById('join-event-modal').style.display='none'" class="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    `;

    modal.style.display = "block";
  },

  // Confirm join event
  confirmJoinEvent: function () {
    // In a real app, this would make an API call to join the event
    Utils.showSuccess(`You've successfully joined "${this.event.name}"! You'll receive updates about this event.`);
    document.getElementById("join-event-modal").style.display = "none";

    // TODO: Implement actual join event API call
    // const joinUrl = CONFIG.buildApiUrl(`/events/${this.eventId}/join`);
    // await Utils.apiCall(joinUrl, { method: 'POST', headers: CONFIG.getAuthHeaders() });
  },

  // Share event functionality
  shareEvent: function () {
    document.getElementById("share-event-modal").style.display = "block";
  },

  // Setup share URL
  setupShareUrl: function () {
    const shareUrlInput = document.getElementById("event-share-url");
    if (shareUrlInput) {
      shareUrlInput.value = window.location.href;
    }
  },

  // Copy event link
  copyEventLink: function () {
    const shareUrlInput = document.getElementById("event-share-url");
    if (shareUrlInput) {
      shareUrlInput.select();
      document.execCommand('copy');
      Utils.showSuccess("Event link copied to clipboard!");
    }
  },

  // Social sharing functions
  shareOnFacebook: function () {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out this event: ${this.event.name}`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
  },

  shareOnTwitter: function () {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out this event: ${this.event.name} on ${Utils.formatDate(this.event.eventDate)}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  },

  shareOnWhatsApp: function () {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out this event: ${this.event.name} on ${Utils.formatDate(this.event.eventDate)} ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  },

  shareViaEmail: function () {
    const subject = encodeURIComponent(`Event: ${this.event.name}`);
    const body = encodeURIComponent(`Hi!\n\nI wanted to share this event with you:\n\n${this.event.name}\nDate: ${Utils.formatDate(this.event.eventDate)} at ${Utils.formatTime(this.event.eventTime)}\n${this.venue ? `Venue: ${this.venue.name}` : ''}\n\nCheck it out: ${window.location.href}\n\nSee you there!`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  },

  // Get directions to venue
  getDirections: function () {
    if (this.venue && this.venue.latitude && this.venue.longitude) {
      MapService.showDirections(
        parseFloat(this.venue.latitude),
        parseFloat(this.venue.longitude),
        this.venue.name
      );
    }
  },

  // Add event to calendar
  addToCalendar: function () {
    const startDate = new Date(`${this.event.eventDate}T${this.event.eventTime}`);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours

    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const title = encodeURIComponent(this.event.name);
    const description = encodeURIComponent(this.event.description || '');
    const location = encodeURIComponent(this.venue ? this.venue.address : '');
    const startTime = formatDate(startDate);
    const endTime = formatDate(endDate);

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${description}&location=${location}`;

    window.open(googleCalendarUrl, '_blank');
  },

  // Show loading state
  showLoading: function () {
    document.getElementById("loading-state").style.display = "block";
    document.getElementById("error-state").style.display = "none";
    document.getElementById("event-content").style.display = "none";
  },

  // Hide loading state
  hideLoading: function () {
    document.getElementById("loading-state").style.display = "none";
  },

  // Show error state
  showError: function () {
    document.getElementById("loading-state").style.display = "none";
    document.getElementById("error-state").style.display = "block";
    document.getElementById("event-content").style.display = "none";
  },

  // Show content
  showContent: function () {
    document.getElementById("loading-state").style.display = "none";
    document.getElementById("error-state").style.display = "none";
    document.getElementById("event-content").style.display = "block";
  },
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  EventDetailsPage.init();
});