// Edit Venue functionality
const EditVenue = {
    map: null,
    marker: null,
    selectedLocation: null,
    currentVenueId: null,
    originalVenueData: null,
    
    async init() {
        try {
            // Get venue ID from URL
            this.currentVenueId = this.getVenueIdFromUrl();
            
            if (!this.currentVenueId) {
                Utils.showMessage('No venue ID provided', 'error');
                setTimeout(() => {
                    window.location.href = 'venues.html';
                }, 2000);
                return;
            }

            console.log('Initializing edit venue with ID:', this.currentVenueId);
            
            // Load the venue data
            await this.loadVenueData();
            
            // Initialize map
            this.initializeMap();
            
            // Setup form handling
            this.setupFormHandling();
            
        } catch (error) {
            console.error('Error initializing edit venue:', error);
            Utils.showMessage('Error loading venue data', 'error');
        }
    },

    getVenueIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    },

    async loadVenueData() {
        try {
            // Simple authentication check - just use what edit-event.js uses
            if (!Utils.isAuthenticated()) {
                window.location.href = 'login.html';
                return;
            }

            console.log('Loading venue data for ID:', this.currentVenueId);

            const venueUrl = CONFIG.buildApiUrl(`venues/${this.currentVenueId}`);
            const response = await Utils.apiCall(venueUrl, {
                method: 'GET',
                headers: CONFIG.getAuthHeaders()
            });

            console.log('Loaded venue data:', response);
            
            // Handle different response formats
            let venueData = null;
            if (response.venue) {
                venueData = response.venue;
            } else if (response.message) {
                // Handle stringified JSON in message field
                try {
                    if (typeof response.message === 'string') {
                        venueData = JSON.parse(response.message);
                    } else {
                        venueData = response.message;
                    }
                } catch (parseError) {
                    console.error("❌ Failed to parse venue message:", parseError);
                    throw new Error('Failed to parse venue data');
                }
            } else if (response.venueID || response.name) {
                // Direct venue object
                venueData = response;
            } else {
                throw new Error('Invalid venue data format received');
            }

            if (!venueData) {
                throw new Error('No venue data received');
            }
            
            this.originalVenueData = venueData;
            this.populateForm(venueData);
            
        } catch (error) {
            console.error('Error loading venue data:', error);
            Utils.showMessage('Failed to load venue data', 'error');
            throw error;
        }
    },

    populateForm(venueData) {
        try {
            // Basic venue info
            document.getElementById('venueName').value = venueData.name || '';
            document.getElementById('venueType').value = venueData.type || '';
            document.getElementById('venueCapacity').value = venueData.capacity || '';
            document.getElementById('venueDescription').value = venueData.description || '';

            // Location data
            if (venueData.latitude && venueData.longitude) {
                this.selectedLocation = {
                    lat: venueData.latitude,
                    lng: venueData.longitude,
                    address: venueData.address || 'Address not available'
                };
                
                this.updateLocationDisplay();
            }

            // Image handling - check both imageUrl and image_url fields
            const imageUrl = venueData.imageUrl || venueData.image_url;
            if (imageUrl) {
                const venueImagePreview = document.getElementById('venueImagePreview');
                const venuePlaceholder = document.getElementById('venueUploadPlaceholder');
                const removeVenueBtn = document.getElementById('removeVenuePhotoBtn');

                if (venueImagePreview && venuePlaceholder) {
                    // Resolve the full image URL
                    const fullImageUrl = Utils.resolveImageUrl(imageUrl, 'venues', venueData.venueID);
                    venueImagePreview.src = fullImageUrl;
                    venueImagePreview.style.display = 'block';
                    venuePlaceholder.style.display = 'none';
                    if (removeVenueBtn) {
                        removeVenueBtn.style.display = 'inline-block';
                    }
                }
            }

            console.log('Form populated with venue data');
            
        } catch (error) {
            console.error('Error populating form:', error);
            Utils.showMessage('Error displaying venue data', 'error');
        }
    },

    initializeMap() {
        try {
            console.log('Initializing edit venue map');
            
            // Use the same AWS map implementation as create venue
            this.initializeAWSMap();
            
        } catch (error) {
            console.error('Error initializing map:', error);
            Utils.showMessage('Map initialization failed', 'error');
        }
    },

    async initializeAWSMap() {
        try {
            console.log('🗺️ Initializing AWS map for venue editing');
            
            // Default center - Singapore
            let center = [103.8198, 1.3521];
            let zoom = 11;

            // If we have venue location, center on it
            if (this.selectedLocation) {
                center = [this.selectedLocation.lng, this.selectedLocation.lat];
                zoom = 15;
            }

            // Initialize AWS venue map using MapService
            this.map = await MapService.initializeVenueMap('venue-map', {
                center: center,
                zoom: zoom
            });

            if (!this.map) {
                throw new Error('Failed to initialize AWS map');
            }

            // Add existing marker if we have location
            if (this.selectedLocation) {
                this.addMarker(this.selectedLocation.lng, this.selectedLocation.lat);
            }
            
            // Enable location selection
            this.enableLocationSelection();

            console.log('✅ AWS venue map initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize AWS map:', error);
            this.showMapError(error.message);
        }
    },

    showMapError(message) {
        const mapContainer = document.getElementById('venue-map');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; color: #6c757d; text-align: center; padding: 2rem; border-radius: 8px;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🗺️</div>
                    <h3 style="margin: 0 0 1rem 0; color: #495057;">Map Unavailable</h3>
                    <p style="margin: 0; line-height: 1.5;">${message}</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
    },

    enableLocationSelection() {
        const selectBtn = document.getElementById('select-location-btn');
        let isSelecting = false;

        if (selectBtn) {
            selectBtn.addEventListener('click', () => {
                isSelecting = !isSelecting;
                selectBtn.textContent = isSelecting ? 
                    '❌ Cancel Selection' : 
                    '📍 Select New Location on Map';
                selectBtn.style.backgroundColor = isSelecting ? '#dc3545' : '#17a2b8';
                
                this.map.getCanvas().style.cursor = isSelecting ? 'crosshair' : '';
            });
        }

        this.map.on('click', (e) => {
            if (isSelecting) {
                const { lng, lat } = e.lngLat;
                this.setLocation(lng, lat);
                
                // Reset selection mode
                isSelecting = false;
                if (selectBtn) {
                    selectBtn.textContent = '📍 Select New Location on Map';
                    selectBtn.style.backgroundColor = '#17a2b8';
                }
                this.map.getCanvas().style.cursor = '';
            }
        });
    },

    addMarker(lng, lat) {
        // Remove existing marker
        if (this.marker) {
            this.marker.remove();
        }

        // Create new marker
        this.marker = new maplibregl.Marker({ color: '#007bff' })
            .setLngLat([lng, lat])
            .addTo(this.map);
    },

    async setLocation(lng, lat) {
        try {
            this.selectedLocation = { lng, lat };
            
            // Add marker
            this.addMarker(lng, lat);
            
            // Try to get address (optional)
            try {
                const address = await this.reverseGeocode(lat, lng);
                this.selectedLocation.address = address;
            } catch (error) {
                console.warn('Could not get address:', error);
                this.selectedLocation.address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
            
            this.updateLocationDisplay();
            
        } catch (error) {
            console.error('Error setting location:', error);
            Utils.showMessage('Error setting location', 'error');
        }
    },

    async reverseGeocode(lat, lng) {
        try {
            // Use MapService for reverse geocoding like other parts of the app
            if (window.MapService && window.MapService.reverseGeocode) {
                const locationInfo = await window.MapService.reverseGeocode(lng, lat);
                if (locationInfo && locationInfo.Place && locationInfo.Place.Label) {
                    return locationInfo.Place.Label;
                } else if (locationInfo && locationInfo.address) {
                    return locationInfo.address;
                }
            }
        } catch (error) {
            console.warn('AWS reverse geocoding failed:', error);
        }
        
        // Fallback to coordinate display
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    },

    updateLocationDisplay() {
        if (!this.selectedLocation) return;

        const addressEl = document.getElementById('location-address');
        const coordsEl = document.getElementById('location-coordinates');

        if (addressEl) {
            addressEl.textContent = this.selectedLocation.address || 'Address not available';
        }

        if (coordsEl) {
            coordsEl.textContent = `Coordinates: ${this.selectedLocation.lat.toFixed(6)}, ${this.selectedLocation.lng.toFixed(6)}`;
        }
    },

    setupFormHandling() {
        const form = document.getElementById('edit-venue-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFormSubmission();
        });
    },

    async handleFormSubmission() {
        try {
            const updateBtn = document.getElementById('updateVenueBtn');
            if (updateBtn) {
                updateBtn.disabled = true;
                updateBtn.textContent = 'Updating...';
            }

            // Collect form data
            const formData = this.collectFormData();
            
            // Validate required fields
            if (!this.validateFormData(formData)) {
                return;
            }

            console.log('Updating venue with data:', formData);

            // Update venue
            await this.updateVenue(formData);

        } catch (error) {
            console.error('Error updating venue:', error);
            Utils.showMessage('Failed to update venue', 'error');
        } finally {
            const updateBtn = document.getElementById('updateVenueBtn');
            if (updateBtn) {
                updateBtn.disabled = false;
                updateBtn.textContent = 'Update Venue';
            }
        }
    },

    collectFormData() {
        const form = document.getElementById('edit-venue-form');
        const formData = new FormData(form);
        
        const data = {
            name: formData.get('name')?.trim(),
            type: formData.get('type'),
            description: formData.get('description')?.trim(),
            capacity: formData.get('capacity') ? parseInt(formData.get('capacity')) : null
        };

        // Add location data if available
        if (this.selectedLocation) {
            data.latitude = this.selectedLocation.lat;
            data.longitude = this.selectedLocation.lng;
            data.address = this.selectedLocation.address;
        } else if (this.originalVenueData) {
            // Keep original location if no new location selected
            data.latitude = this.originalVenueData.latitude;
            data.longitude = this.originalVenueData.longitude;
            data.address = this.originalVenueData.address;
        }

        return data;
    },

    validateFormData(data) {
        if (!data.name) {
            Utils.showMessage('Venue name is required', 'error');
            return false;
        }

        if (!data.type) {
            Utils.showMessage('Venue type is required', 'error');
            return false;
        }

        if (data.capacity && (data.capacity < 1 || data.capacity > 10000)) {
            Utils.showMessage('Capacity must be between 1 and 10,000', 'error');
            return false;
        }

        return true;
    },

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    },

    async updateVenue(venueData) {
        try {
            const userData = Utils.getCurrentUser();
            console.log('Current user data for venue update:', userData);
            
            if (!userData || !userData.user_id) {
                console.error('Authentication check failed:', {
                    userData: userData,
                    hasUserId: !!(userData && userData.user_id),
                    isAuthenticated: Utils.isAuthenticated()
                });
                throw new Error('User not authenticated');
            }

            let imageUrl = this.originalVenueData?.imageUrl || this.originalVenueData?.image_url;

            // Handle image upload if new image selected
            if (window.selectedVenueImage) {
                console.log('Uploading new venue image...');
                imageUrl = await Utils.uploadImage(window.selectedVenueImage, 'venues');
                console.log('Image uploaded successfully:', imageUrl);
            }

            // Prepare API payload using imageUrl (not image_url)
            const payload = {
                ...venueData,
                imageUrl: imageUrl
            };

            console.log('Sending venue update:', payload);

            const url = CONFIG.buildApiUrl(`venues/${this.currentVenueId}`);
            console.log('Update URL:', url);
            
            const response = await Utils.apiCall(url, {
                method: 'PUT',
                headers: CONFIG.getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            console.log('Venue updated successfully:', response);

            Utils.showMessage('Venue updated successfully!', 'success');
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'venues.html';
            }, 1500);

        } catch (error) {
            console.error('Error updating venue:', error);
            Utils.showMessage(error.message || 'Failed to update venue', 'error');
            throw error;
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EditVenue;
}
