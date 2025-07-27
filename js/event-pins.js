// Event Pins Service for displaying events on maps
const EventPinsService = {
    eventMarkers: [],
    map: null,

    // Initialize event pins on a map
    initEventPins: async function(mapInstance) {
        this.map = mapInstance;
        this.clearEventMarkers();
        
        try {
            console.log("🎯 Loading event pins...");
            
            // Load events and venues data
            const [events, venues] = await Promise.all([
                this.loadEvents(),
                this.loadVenues()
            ]);

            // Create venue lookup for faster access
            const venueMap = new Map();
            venues.forEach(venue => {
                venueMap.set(venue.venueID, venue);
            });

            // Filter events that have venues with coordinates
            const eventsWithLocation = events.filter(event => {
                const venue = venueMap.get(event.venueID);
                return venue && venue.latitude && venue.longitude;
            });

            console.log(`📍 Found ${eventsWithLocation.length} events with location data`);

            // Create markers for each event
            eventsWithLocation.forEach(event => {
                const venue = venueMap.get(event.venueID);
                this.createEventMarker(event, venue);
            });

            return this.eventMarkers.length;
        } catch (error) {
            console.error("❌ Failed to load event pins:", error);
            return 0;
        }
    },

    // Load events from API
    loadEvents: async function() {
        try {
            const eventsUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS);
            const response = await Utils.apiCall(eventsUrl, {
                method: "GET",
                headers: CONFIG.getAuthHeaders(),
            });

            // Handle different response formats
            if (Array.isArray(response)) {
                return response;
            } else if (response && response.events && Array.isArray(response.events)) {
                return response.events;
            } else if (response && response.Items && Array.isArray(response.Items)) {
                return response.Items;
            } else if (response && response.message) {
                try {
                    const parsedEvents = JSON.parse(response.message);
                    return Array.isArray(parsedEvents) ? parsedEvents : [];
                } catch (parseError) {
                    console.error("Failed to parse events from message:", parseError);
                    return [];
                }
            }
            return [];
        } catch (error) {
            console.error("Failed to load events:", error);
            return [];
        }
    },

    // Load venues from API
    loadVenues: async function() {
        try {
            const venuesUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES);
            const response = await Utils.apiCall(venuesUrl, {
                method: "GET",
                headers: CONFIG.getAuthHeaders(),
            });

            // Handle different response formats
            if (Array.isArray(response)) {
                return response;
            } else if (response && response.venues && Array.isArray(response.venues)) {
                return response.venues;
            } else if (response && response.Items && Array.isArray(response.Items)) {
                return response.Items;
            } else if (response && response.message) {
                try {
                    const parsedVenues = JSON.parse(response.message);
                    return Array.isArray(parsedVenues) ? parsedVenues : [];
                } catch (parseError) {
                    console.error("Failed to parse venues from message:", parseError);
                    return [];
                }
            }
            return [];
        } catch (error) {
            console.error("Failed to load venues:", error);
            return [];
        }
    },

    // Create a marker for an event
    createEventMarker: function(event, venue) {
        if (!this.map || !venue.latitude || !venue.longitude) return;

        const lng = parseFloat(venue.longitude);
        const lat = parseFloat(venue.latitude);

        // Create marker with event-specific styling
        const markerElement = document.createElement('div');
        markerElement.className = 'event-marker';
        markerElement.innerHTML = `
            <div class="event-marker-icon">
                🎵
            </div>
        `;

        // Style the marker
        markerElement.style.cssText = `
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        markerElement.querySelector('.event-marker-icon').style.cssText = `
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: transform 0.2s ease;
        `;

        // Create the marker
        const marker = new window.maplibregl.Marker({
            element: markerElement,
            anchor: 'bottom'
        })
        .setLngLat([lng, lat])
        .addTo(this.map);

        // Create popup for event details
        const popup = new window.maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: [0, -10]
        }).setHTML(this.createEventPopupContent(event, venue));

        // Add hover interactions
        markerElement.addEventListener('mouseenter', () => {
            // Scale up marker
            markerElement.querySelector('.event-marker-icon').style.transform = 'scale(1.1)';
            
            // Show popup
            popup.addTo(this.map).setLngLat([lng, lat]);
        });

        markerElement.addEventListener('mouseleave', () => {
            // Scale down marker
            markerElement.querySelector('.event-marker-icon').style.transform = 'scale(1)';
            
            // Hide popup
            popup.remove();
        });

        // Add click handler to view event details
        markerElement.addEventListener('click', () => {
            this.showEventDetails(event, venue);
        });

        // Store marker reference
        this.eventMarkers.push({
            marker: marker,
            popup: popup,
            event: event,
            venue: venue
        });

        console.log(`📍 Created marker for event: ${event.name} at ${venue.name}`);
    },

    // Create popup content for event
    createEventPopupContent: function(event, venue) {
        const eventDate = new Date(event.eventDate + 'T' + event.eventTime);
        const formattedDate = eventDate.toLocaleDateString('en-SG', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const formattedTime = eventDate.toLocaleTimeString('en-SG', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div style="
                min-width: 250px;
                max-width: 300px;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <div style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 16px;
                    margin: -10px -10px 10px -10px;
                    border-radius: 8px 8px 0 0;
                ">
                    <h3 style="
                        margin: 0 0 4px 0;
                        font-size: 16px;
                        font-weight: 600;
                    ">${Utils.sanitizeInput(event.name)}</h3>
                    <div style="
                        font-size: 12px;
                        opacity: 0.9;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    ">
                        📅 ${formattedDate} at ${formattedTime}
                    </div>
                </div>

                <div style="padding: 0 6px;">
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        margin-bottom: 8px;
                        font-size: 13px;
                        color: #666;
                    ">
                        📍 <strong>${Utils.sanitizeInput(venue.name)}</strong>
                    </div>

                    ${event.description ? `
                        <p style="
                            margin: 0 0 8px 0;
                            font-size: 13px;
                            color: #555;
                            line-height: 1.4;
                        ">${Utils.sanitizeInput(event.description)}</p>
                    ` : ''}

                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 11px;
                        color: #888;
                        margin-top: 8px;
                    ">
                        <span>👥 ${venue.capacity ? venue.capacity.toLocaleString() + ' capacity' : 'Venue info'}</span>
                        <span style="
                            color: #667eea;
                            font-weight: 600;
                            cursor: pointer;
                        ">Click for details →</span>
                    </div>
                </div>
            </div>
        `;
    },

    // Show event details (redirect to event details page or modal)
    showEventDetails: function(event, venue) {
        console.log("🎯 Opening event details:", event.name);
        
        // Check if we're on the events page and can show details directly
        if (typeof EventsPage !== 'undefined' && EventsPage.showEventDetails) {
            EventsPage.showEventDetails(event.eventID);
        } else {
            // Navigate to event details page
            window.location.href = `event-details.html?id=${event.eventID}`;
        }
    },

    // Clear all event markers
    clearEventMarkers: function() {
        this.eventMarkers.forEach(({ marker }) => {
            marker.remove();
        });
        this.eventMarkers = [];
    },

    // Filter event markers by criteria
    filterEventMarkers: function(filterFn) {
        this.eventMarkers.forEach(({ marker, event, venue }) => {
            const shouldShow = filterFn(event, venue);
            const element = marker.getElement();
            
            if (shouldShow) {
                element.style.display = 'flex';
            } else {
                element.style.display = 'none';
            }
        });
    },

    // Show all event markers
    showAllEventMarkers: function() {
        this.eventMarkers.forEach(({ marker }) => {
            marker.getElement().style.display = 'flex';
        });
    },

    // Get events count
    getEventMarkersCount: function() {
        return this.eventMarkers.length;
    },

    // Get visible events count
    getVisibleEventMarkersCount: function() {
        return this.eventMarkers.filter(({ marker }) => {
            return marker.getElement().style.display !== 'none';
        }).length;
    },

    // Update marker styles based on event status
    updateMarkerStyles: function() {
        const now = new Date();
        
        this.eventMarkers.forEach(({ marker, event }) => {
            const eventDateTime = new Date(event.eventDate + 'T' + event.eventTime);
            const element = marker.getElement();
            const icon = element.querySelector('.event-marker-icon');
            
            if (eventDateTime < now) {
                // Past event - gray out
                icon.style.background = 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
                icon.style.opacity = '0.6';
            } else if (eventDateTime - now < 24 * 60 * 60 * 1000) {
                // Event within 24 hours - special highlight
                icon.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)';
                icon.style.animation = 'pulse 2s infinite';
            } else {
                // Future event - normal styling
                icon.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                icon.style.opacity = '1';
                icon.style.animation = 'none';
            }
        });
    }
};

// Add CSS for marker animations
const eventPinStyles = document.createElement('style');
eventPinStyles.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    .event-marker:hover .event-marker-icon {
        transform: scale(1.1) !important;
    }
    
    .maplibregl-popup-content {
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        border: none;
    }
    
    .maplibregl-popup-tip {
        border-top-color: #667eea;
    }
`;
document.head.appendChild(eventPinStyles);

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = EventPinsService;
}
