document.addEventListener('DOMContentLoaded', function() {
    // Get event ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    
    if (!eventId) {
        console.error('No event ID provided');
        alert('No event ID provided');
        window.location.href = 'events.html';
        return;
    }
    
    // Initialize map
    let map = null;
    let venueMarker = null;
    
    // Load event details
    loadEventDetails(eventId);
    
    async function loadEventDetails(eventId) {
        try {
            const events = JSON.parse(localStorage.getItem('events') || '[]');
            const venues = JSON.parse(localStorage.getItem('venues') || '[]');
            const event = events.find(e => e.id === eventId);
            
            if (!event) {
                console.error('Event not found');
                alert('Event not found');
                window.location.href = 'events.html';
                return;
            }
            
            // Display event details
            displayEventDetails(event);
            
            // Load venue details if venue is selected
            if (event.venueId) {
                const venue = venues.find(v => v.id === event.venueId);
                if (venue) {
                    displayVenueDetails(venue);
                    await initializeEventMap(venue);
                } else {
                    displayVenueNotFound();
                }
            } else {
                displayNoVenueMessage();
            }
            
            // Load event actions
            displayEventActions(event);
            
        } catch (error) {
            console.error('Error loading event details:', error);
            alert('Error loading event details');
        }
    }
    
    function displayEventDetails(event) {
        const eventDetailsContainer = document.getElementById('event-details');
        if (!eventDetailsContainer) return;
        
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        eventDetailsContainer.innerHTML = `
            <div style="display: grid; gap: 1rem;">
                <div>
                    <h3 style="margin: 0 0 0.5rem 0; color: #333;">${event.title}</h3>
                    <p style="margin: 0; color: #666; line-height: 1.6;">${event.description || 'No description provided.'}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="font-size: 1.2rem;">📅</span>
                            <strong style="color: #333;">Date</strong>
                        </div>
                        <div style="color: #666;">${formattedDate}</div>
                    </div>
                    
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="font-size: 1.2rem;">⏰</span>
                            <strong style="color: #333;">Time</strong>
                        </div>
                        <div style="color: #666;">${event.time || 'Time not specified'}</div>
                    </div>
                    
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="font-size: 1.2rem;">🎫</span>
                            <strong style="color: #333;">Type</strong>
                        </div>
                        <div style="color: #666;">${event.type || 'Event'}</div>
                    </div>
                    
                    ${event.price ? `
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="font-size: 1.2rem;">💰</span>
                            <strong style="color: #333;">Price</strong>
                        </div>
                        <div style="color: #666;">$${event.price}</div>
                    </div>
                    ` : ''}
                </div>
                
                ${event.imageUrl ? `
                <div style="text-align: center; margin-top: 1rem;">
                    <img src="${event.imageUrl}" alt="${event.title}" 
                         style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                </div>
                ` : ''}
            </div>
        `;
    }
    
    function displayVenueDetails(venue) {
        const venueDetailsContainer = document.getElementById('venue-details');
        if (!venueDetailsContainer) return;
        
        venueDetailsContainer.innerHTML = `
            <div style="display: grid; gap: 1rem;">
                <div>
                    <h3 style="margin: 0 0 0.5rem 0; color: #333; display: flex; align-items: center; gap: 0.5rem;">
                        <span>🏢</span>
                        ${venue.name}
                    </h3>
                    <p style="margin: 0; color: #666; line-height: 1.6;">${venue.description || 'No description provided.'}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    ${venue.capacity ? `
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="font-size: 1.2rem;">👥</span>
                            <strong style="color: #333;">Capacity</strong>
                        </div>
                        <div style="color: #666;">${venue.capacity} people</div>
                    </div>
                    ` : ''}
                    
                    ${venue.facilities && venue.facilities.length > 0 ? `
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="font-size: 1.2rem;">🛠️</span>
                            <strong style="color: #333;">Facilities</strong>
                        </div>
                        <div style="color: #666;">${venue.facilities.join(', ')}</div>
                    </div>
                    ` : ''}
                    
                    ${venue.contact ? `
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="font-size: 1.2rem;">📞</span>
                            <strong style="color: #333;">Contact</strong>
                        </div>
                        <div style="color: #666;">${venue.contact}</div>
                    </div>
                    ` : ''}
                </div>
                
                ${venue.imageUrl ? `
                <div style="text-align: center; margin-top: 1rem;">
                    <img src="${venue.imageUrl}" alt="${venue.name}" 
                         style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                </div>
                ` : ''}
            </div>
        `;
        
        // Show venue location info
        if (venue.location) {
            const locationInfo = document.getElementById('venue-location-info');
            const addressElement = document.getElementById('venue-location-address');
            const coordsElement = document.getElementById('venue-location-coords');
            
            if (locationInfo && addressElement && coordsElement) {
                addressElement.textContent = venue.address || 'Address not provided';
                coordsElement.textContent = `${venue.location.lat.toFixed(6)}, ${venue.location.lng.toFixed(6)}`;
                locationInfo.style.display = 'block';
                
                // Setup Google Maps buttons
                setupGoogleMapsButtons(venue);
            }
        }
    }
    
    function displayVenueNotFound() {
        const venueDetailsContainer = document.getElementById('venue-details');
        if (!venueDetailsContainer) return;
        
        venueDetailsContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                <p>Venue information not found.</p>
            </div>
        `;
        
        // Hide map section
        const mapContainer = document.querySelector('.map-container').parentElement;
        if (mapContainer) {
            mapContainer.style.display = 'none';
        }
    }
    
    function displayNoVenueMessage() {
        const venueDetailsContainer = document.getElementById('venue-details');
        if (!venueDetailsContainer) return;
        
        venueDetailsContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <div style="font-size: 2rem; margin-bottom: 1rem;">🏢</div>
                <p>No venue selected for this event.</p>
            </div>
        `;
        
        // Hide map section
        const mapContainer = document.querySelector('.map-container').parentElement;
        if (mapContainer) {
            mapContainer.style.display = 'none';
        }
    }
    
    function setupGoogleMapsButtons(venue) {
        const googleMapsBtn = document.getElementById('open-in-google-maps');
        const directionsBtn = document.getElementById('get-directions');
        
        if (googleMapsBtn && venue.location) {
            googleMapsBtn.style.display = 'block';
            googleMapsBtn.onclick = () => {
                const url = `https://www.google.com/maps?q=${venue.location.lat},${venue.location.lng}`;
                window.open(url, '_blank');
            };
        }
        
        if (directionsBtn && venue.location) {
            directionsBtn.style.display = 'block';
            directionsBtn.onclick = () => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${venue.location.lat},${venue.location.lng}`;
                window.open(url, '_blank');
            };
        }
    }
    
    async function initializeEventMap(venue) {
        if (!venue.location) {
            console.log('No venue location available');
            return;
        }
        
        try {
            // Wait for MapService to be available
            if (!window.MapService) {
                console.log('Waiting for MapService...');
                // Wait a bit for MapService to load
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                if (!window.MapService) {
                    throw new Error('MapService not available');
                }
            }
            
            console.log('Initializing event map for venue:', venue.name);
            
            // Initialize map
            map = await window.MapService.initializeMap('event-map', {
                center: [venue.location.lng, venue.location.lat],
                zoom: 15,
                style: {
                    height: '400px',
                    borderRadius: '8px'
                }
            });
            
            if (map) {
                // Add venue marker
                venueMarker = window.MapService.addMarker(map, {
                    lng: venue.location.lng,
                    lat: venue.location.lat,
                    popup: `
                        <div style="text-align: center; padding: 0.5rem;">
                            <strong>${venue.name}</strong><br>
                            ${venue.address || 'Venue Location'}
                        </div>
                    `
                });
                
                console.log('Event map initialized successfully');
            }
        } catch (error) {
            console.error('Error initializing event map:', error);
            
            // Show fallback message
            const mapContainer = document.getElementById('event-map');
            if (mapContainer) {
                mapContainer.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; background: #f8f9fa;">
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
                            <p>Unable to load map</p>
                            <small style="color: #999;">Location: ${venue.location.lat.toFixed(4)}, ${venue.location.lng.toFixed(4)}</small>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    function displayEventActions(event) {
        const actionsContainer = document.getElementById('event-actions');
        if (!actionsContainer) return;
        
        actionsContainer.innerHTML = `
            <button class="btn btn-primary" onclick="window.location.href='events.html'">
                ← Back to Events
            </button>
            
            <button class="btn btn-secondary" onclick="editEvent('${event.id}')">
                ✏️ Edit Event
            </button>
            
            <button class="btn btn-danger" onclick="deleteEvent('${event.id}')">
                🗑️ Delete Event
            </button>
        `;
    }
    
    // Global functions for event actions
    window.editEvent = function(eventId) {
        window.location.href = `events.html?edit=${eventId}`;
    };
    
    window.deleteEvent = function(eventId) {
        if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
            try {
                const events = JSON.parse(localStorage.getItem('events') || '[]');
                const updatedEvents = events.filter(e => e.id !== eventId);
                localStorage.setItem('events', JSON.stringify(updatedEvents));
                
                alert('Event deleted successfully!');
                window.location.href = 'events.html';
            } catch (error) {
                console.error('Error deleting event:', error);
                alert('Error deleting event. Please try again.');
            }
        }
    };
});
