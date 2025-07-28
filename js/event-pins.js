
const EventPinsService = {
    eventMarkers: [],
    map: null,

    
    initEventPins: async function(mapInstance) {
        this.map = mapInstance;
        this.clearEventMarkers();
        
        try {
            console.log("Loading event pins...");
            
            
            const [events, venues] = await Promise.all([
                this.loadEvents(),
                this.loadVenues()
            ]);

            
            const venueMap = new Map();
            venues.forEach(venue => {
                venueMap.set(venue.venueID, venue);
            });

            
            const eventsWithLocation = events.filter(event => {
                const venue = venueMap.get(event.venueID);
                return venue && venue.latitude && venue.longitude;
            });

            console.log(` Found ${eventsWithLocation.length} events with location data`);

           
            eventsWithLocation.forEach(event => {
                const venue = venueMap.get(event.venueID);
                this.createEventMarker(event, venue);
            });

            return this.eventMarkers.length;
        } catch (error) {
            console.error(" Failed to load event pins:", error);
            return 0;
        }
    },

 
    loadEvents: async function() {
        try {
            const eventsUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS);
            const response = await Utils.apiCall(eventsUrl, {
                method: "GET",
                headers: CONFIG.getAuthHeaders(),
            });


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



    loadVenues: async function() {
        try {
            const venuesUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES);
            const response = await Utils.apiCall(venuesUrl, {
                method: "GET",
                headers: CONFIG.getAuthHeaders(),
            });

            
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

    
    createEventMarker: function(event, venue) {
        if (!this.map || !venue.latitude || !venue.longitude) return;

        const lng = parseFloat(venue.longitude);
        const lat = parseFloat(venue.latitude);

        
        const markerElement = document.createElement('div');
        markerElement.className = 'event-marker';
        markerElement.innerHTML = `
            <div class="event-marker-icon">
                🎵
            </div>
        `;

        
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

        
        const marker = new window.maplibregl.Marker({
            element: markerElement,
            anchor: 'bottom'
        })
        .setLngLat([lng, lat])
        .addTo(this.map);

        
        const popup = new window.maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: [0, -10]
        }).setHTML(this.createEventPopupContent(event, venue));

        
        markerElement.addEventListener('mouseenter', () => {
            
            markerElement.querySelector('.event-marker-icon').style.transform = 'scale(1.1)';
            
            
            popup.addTo(this.map).setLngLat([lng, lat]);
        });

        markerElement.addEventListener('mouseleave', () => {
            
            markerElement.querySelector('.event-marker-icon').style.transform = 'scale(1)';
            
            
            popup.remove();
        });


        markerElement.addEventListener('click', () => {
            this.showEventDetails(event, venue);
        });

        
        this.eventMarkers.push({
            marker: marker,
            popup: popup,
            event: event,
            venue: venue
        });

        console.log(`Created marker for event: ${event.name} at ${venue.name}`);
    },

    
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

    
    showEventDetails: function(event, venue) {
        console.log("Opening event details:", event.name);
        
        
        if (typeof EventsPage !== 'undefined' && EventsPage.showEventDetails) {
            EventsPage.showEventDetails(event.eventID);
        } else {
            
            window.location.href = `event-details.html?id=${event.eventID}`;
        }
    },

    
    clearEventMarkers: function() {
        this.eventMarkers.forEach(({ marker }) => {
            marker.remove();
        });
        this.eventMarkers = [];
    },

    
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

    
    showAllEventMarkers: function() {
        this.eventMarkers.forEach(({ marker }) => {
            marker.getElement().style.display = 'flex';
        });
    },

    
    getEventMarkersCount: function() {
        return this.eventMarkers.length;
    },

    
    getVisibleEventMarkersCount: function() {
        return this.eventMarkers.filter(({ marker }) => {
            return marker.getElement().style.display !== 'none';
        }).length;
    },

            
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
