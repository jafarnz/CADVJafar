// Event Details Page JavaScript
class EventDetailsPage {
    constructor() {
        this.eventData = null;
        this.venueData = null;
        this.eventID = null;
        this.map = null;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('🎯 Initializing Event Details Page...');
        
        // Get event ID from URL
        this.eventID = this.getEventIdFromUrl();
        
        if (!this.eventID) {
            this.showError('No event ID provided');
            return;
        }

        // Setup join button
        this.setupJoinButton();
        
        // Load event data
        this.loadEventDetails();
    }

    getEventIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    setupJoinButton() {
        const joinBtn = document.getElementById('joinEventBtn');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => this.handleJoinEvent());
        }
    }

    async loadEventDetails() {
        try {
            console.log(`📡 Loading event details for ID: ${this.eventID}`);
            
            // Show loading state
            this.showLoading();

            // Load event data
            const eventUrl = CONFIG.buildApiUrl(`events/${this.eventID}`);
            const eventResponse = await Utils.apiCall(eventUrl, {
                method: 'GET',
                headers: CONFIG.getAuthHeaders()
            });

            console.log('✅ Event data loaded:', eventResponse);

            // Parse event data
            if (eventResponse.event) {
                this.eventData = eventResponse.event;
            } else if (eventResponse.message) {
                this.eventData = typeof eventResponse.message === 'string' 
                    ? JSON.parse(eventResponse.message) 
                    : eventResponse.message;
            } else {
                this.eventData = eventResponse;
            }

            // Load venue data if venue ID is available
            if (this.eventData.venueID) {
                await this.loadVenueDetails(this.eventData.venueID);
            }

            // Render the event details
            this.renderEventDetails();
            
            // Initialize map
            this.initializeMap();

        } catch (error) {
            console.error('❌ Failed to load event details:', error);
            this.showError('Failed to load event details. Please try again.');
        }
    }

    async loadVenueDetails(venueID) {
        try {
            console.log(`📡 Loading venue details for ID: ${venueID}`);
            
            const venueUrl = CONFIG.buildApiUrl(`venues/${venueID}`);
            const venueResponse = await Utils.apiCall(venueUrl, {
                method: 'GET',
                headers: CONFIG.getAuthHeaders()
            });

            console.log('✅ Venue data loaded:', venueResponse);

            // Parse venue data
            if (venueResponse.venue) {
                this.venueData = venueResponse.venue;
            } else if (venueResponse.message) {
                this.venueData = typeof venueResponse.message === 'string' 
                    ? JSON.parse(venueResponse.message) 
                    : venueResponse.message;
            } else {
                this.venueData = venueResponse;
            }

        } catch (error) {
            console.error('❌ Failed to load venue details:', error);
            // Continue without venue data
        }
    }

    renderEventDetails() {
        try {
            console.log('🎨 Rendering event details...');

            // Hide loading and show content
            document.getElementById('loadingIndicator').style.display = 'none';
            document.getElementById('errorContainer').style.display = 'none';
            document.getElementById('eventDetailsContent').style.display = 'block';

            // Render event information
            this.renderEventInfo();
            this.renderVenueInfo();
            this.updateJoinButton();

        } catch (error) {
            console.error('❌ Failed to render event details:', error);
            this.showError('Failed to display event details');
        }
    }

    renderEventInfo() {
        // Event image
        const eventImage = document.getElementById('eventImage');
        if (this.eventData.imageUrl) {
            eventImage.src = this.eventData.imageUrl;
            eventImage.alt = this.eventData.name || 'Event Image';
        } else {
            eventImage.src = 'https://via.placeholder.com/800x400/667eea/ffffff?text=Event+Image';
            eventImage.alt = 'Default Event Image';
        }

        // Event title
        document.getElementById('eventTitle').textContent = this.eventData.name || 'Event Name';

        // Event meta information
        document.getElementById('eventDate').textContent = this.formatDate(this.eventData.eventDate);
        document.getElementById('eventTime').textContent = this.eventData.eventTime || 'Time TBA';
        document.getElementById('venueName').textContent = this.venueData?.name || 'Venue TBA';
        document.getElementById('eventCapacity').textContent = this.eventData.capacity 
            ? `${this.eventData.capacity} attendees` 
            : 'Capacity TBA';

        // Event description
        document.getElementById('eventDescription').textContent = 
            this.eventData.description || 'No description available';
    }

    renderVenueInfo() {
        if (!this.venueData) {
            document.querySelector('.venue-info').style.display = 'none';
            return;
        }

        // Venue details
        document.getElementById('venueAddress').textContent = 
            this.venueData.address || 'Address not available';
        document.getElementById('venuePhone').textContent = 
            this.venueData.phoneNumber || 'Phone not available';
        document.getElementById('venueEmail').textContent = 
            this.venueData.email || 'Email not available';
        
        const venueWebsite = document.getElementById('venueWebsite');
        if (this.venueData.website) {
            venueWebsite.href = this.venueData.website;
            venueWebsite.textContent = this.venueData.website;
        } else {
            venueWebsite.textContent = 'Website not available';
            venueWebsite.removeAttribute('href');
        }

        // Venue description
        document.getElementById('venueDescription').textContent = 
            this.venueData.description || 'No venue description available';
    }

    updateJoinButton() {
        const joinBtn = document.getElementById('joinEventBtn');
        const isJoined = Utils.isEventJoined(this.eventID);
        
        if (isJoined) {
            joinBtn.classList.add('joined');
            joinBtn.innerHTML = '<i class="fas fa-check"></i><span>Joined</span>';
            joinBtn.disabled = true;
        } else {
            joinBtn.classList.remove('joined');
            joinBtn.innerHTML = '<i class="fas fa-user-plus"></i><span>Join Event</span>';
            joinBtn.disabled = false;
        }
    }

    async handleJoinEvent() {
        if (!Utils.isAuthenticated()) {
            Utils.showNotification('Please login to join events', 'error');
            window.location.href = 'login.html';
            return;
        }

        if (Utils.isEventJoined(this.eventID)) {
            Utils.showNotification('You have already joined this event', 'info');
            return;
        }

        try {
            console.log('🎯 Joining event...');
            
            const joinBtn = document.getElementById('joinEventBtn');
            const originalContent = joinBtn.innerHTML;
            
            // Show loading state
            joinBtn.disabled = true;
            joinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Joining...</span>';

            // Join the event
            const success = await Utils.addJoinedEvent(this.eventData);
            
            if (success) {
                this.updateJoinButton();
                console.log('✅ Successfully joined event');
            } else {
                Utils.showNotification('Failed to join event. You may have already joined.', 'error');
                joinBtn.disabled = false;
                joinBtn.innerHTML = originalContent;
            }

        } catch (error) {
            console.error('❌ Failed to join event:', error);
            Utils.showNotification('Failed to join event. Please try again.', 'error');
            
            // Reset button
            const joinBtn = document.getElementById('joinEventBtn');
            joinBtn.disabled = false;
            joinBtn.innerHTML = '<i class="fas fa-user-plus"></i><span>Join Event</span>';
        }
    }

    initializeMap() {
        if (!this.venueData || !this.venueData.latitude || !this.venueData.longitude) {
            console.log('No venue coordinates available for map');
            document.querySelector('.map-container').style.display = 'none';
            return;
        }

        try {
            console.log('🗺️ Initializing event map...');
            
            const mapOptions = {
                center: {
                    lat: parseFloat(this.venueData.latitude),
                    lng: parseFloat(this.venueData.longitude)
                },
                zoom: 15,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };

            this.map = new google.maps.Map(document.getElementById('eventMap'), mapOptions);

            // Add marker for venue
            const marker = new google.maps.Marker({
                position: mapOptions.center,
                map: this.map,
                title: this.venueData.name || 'Event Venue',
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%23667eea"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
                    scaledSize: new google.maps.Size(32, 32)
                }
            });

            // Add info window
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 10px;">
                        <h3 style="margin: 0 0 5px 0; color: #667eea;">${this.venueData.name || 'Event Venue'}</h3>
                        <p style="margin: 0; color: #666;">${this.venueData.address || 'Venue Address'}</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold; color: #333;">${this.eventData.name}</p>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(this.map, marker);
            });

            console.log('✅ Map initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize map:', error);
            document.querySelector('.map-container').style.display = 'none';
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'Date TBA';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    showLoading() {
        document.getElementById('loadingIndicator').style.display = 'block';
        document.getElementById('errorContainer').style.display = 'none';
        document.getElementById('eventDetailsContent').style.display = 'none';
    }

    showError(message) {
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('errorContainer').style.display = 'block';
        document.getElementById('eventDetailsContent').style.display = 'none';
        document.getElementById('errorMessage').textContent = message;
    }
}

// Initialize when the page loads
new EventDetailsPage();

// Global initMap function for Google Maps callback
function initMap() {
    console.log('🗺️ Google Maps API loaded');
    // The map will be initialized by EventDetailsPage when needed
}