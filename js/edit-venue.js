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
            const userData = Utils.getUserData();
            if (!userData || !userData.user_id) {
                throw new Error('User not authenticated');
            }

            console.log('Loading venue data for ID:', this.currentVenueId);

            const response = await fetch(`${CONFIG.API_BASE_URL}/venues/${this.currentVenueId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CONFIG.API_KEY,
                    'x-user-id': userData.user_id
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load venue: ${response.status}`);
            }

            const venueData = await response.json();
            console.log('Loaded venue data:', venueData);
            
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
            document.getElementById('venuePhone').value = venueData.phone || '';
            document.getElementById('venueWebsite').value = venueData.website || '';

            // Location data
            if (venueData.latitude && venueData.longitude) {
                this.selectedLocation = {
                    lat: venueData.latitude,
                    lng: venueData.longitude,
                    address: venueData.address || 'Address not available'
                };
                
                this.updateLocationDisplay();
            }

            // Image handling
            if (venueData.image_url) {
                const venueImagePreview = document.getElementById('venueImagePreview');
                const venuePlaceholder = document.getElementById('venueUploadPlaceholder');
                const removeVenueBtn = document.getElementById('removeVenuePhotoBtn');

                if (venueImagePreview && venuePlaceholder) {
                    venueImagePreview.src = venueData.image_url;
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
            
            // Default center - Singapore
            let center = [103.8198, 1.3521];
            let zoom = 11;

            // If we have venue location, center on it
            if (this.selectedLocation) {
                center = [this.selectedLocation.lng, this.selectedLocation.lat];
                zoom = 15;
            }

            this.map = new maplibregl.Map({
                container: 'venue-map',
                style: 'https://api.maptiler.com/maps/streets/style.json?key=YOUR_MAPTILER_KEY',
                center: center,
                zoom: zoom
            });

            this.map.on('load', () => {
                console.log('Edit venue map loaded');
                
                // Add existing marker if we have location
                if (this.selectedLocation) {
                    this.addMarker(this.selectedLocation.lng, this.selectedLocation.lat);
                }
                
                // Enable location selection
                this.enableLocationSelection();
            });

            this.map.on('error', (e) => {
                console.warn('Map error (using fallback):', e);
                // Fallback to basic OpenStreetMap
                this.map.setStyle({
                    'version': 8,
                    'sources': {
                        'osm': {
                            'type': 'raster',
                            'tiles': ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                            'tileSize': 256
                        }
                    },
                    'layers': [{
                        'id': 'osm',
                        'type': 'raster',
                        'source': 'osm'
                    }]
                });
            });

        } catch (error) {
            console.error('Error initializing map:', error);
            Utils.showMessage('Map initialization failed', 'error');
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
            const response = await fetch(
                `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=YOUR_MAPTILER_KEY`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.features && data.features.length > 0) {
                    return data.features[0].place_name;
                }
            }
        } catch (error) {
            console.warn('Reverse geocoding failed:', error);
        }
        
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
            capacity: formData.get('capacity') ? parseInt(formData.get('capacity')) : null,
            phone: formData.get('phone')?.trim(),
            website: formData.get('website')?.trim()
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

        if (data.website && !this.isValidUrl(data.website)) {
            Utils.showMessage('Please enter a valid website URL', 'error');
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
            const userData = Utils.getUserData();
            if (!userData || !userData.user_id) {
                throw new Error('User not authenticated');
            }

            let imageUrl = this.originalVenueData?.image_url;

            // Handle image upload if new image selected
            if (window.selectedVenueImage) {
                console.log('Uploading new venue image...');
                imageUrl = await Utils.s3.uploadImage(window.selectedVenueImage, 'venue');
                console.log('Image uploaded successfully:', imageUrl);
            }

            // Prepare API payload
            const payload = {
                ...venueData,
                image_url: imageUrl
            };

            console.log('Sending venue update:', payload);

            const response = await fetch(`${CONFIG.API_BASE_URL}/venues/${this.currentVenueId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CONFIG.API_KEY,
                    'x-user-id': userData.user_id
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Update failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('Venue updated successfully:', result);

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
