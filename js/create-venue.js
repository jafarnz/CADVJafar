// Create Venue Page - Dedicated venue creation interface
const CreateVenuePage = {
    venueLocationMap: null,
    selectedLocationMarker: null,
    isLocationPickerEnabled: false,

    // Initialize the create venue page
    init: async function() {
        console.log("🏢 Initializing Create Venue Page");
        
        // Check authentication
        if (!Utils.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize the map
        await this.initializeMap();
        
        console.log("✅ Create Venue Page initialized successfully");
    },

    // Set up all event listeners
    setupEventListeners: function() {
        console.log("📝 Setting up event listeners");

        // Form submission
        const form = document.getElementById('create-venue-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                Utils.logout();
            });
        }

        // Cancel button
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.handleCancel();
            });
        }

        // Image file input change
        const imageInput = document.getElementById('venueImage');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                this.handleImageSelection(e);
            });
        }

        // Remove image button
        const removeImageBtn = document.getElementById('removeImage');
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', () => {
                this.removeImagePreview();
            });
        }

        // Geocode button
        const geocodeBtn = document.getElementById('geocode-btn');
        if (geocodeBtn) {
            geocodeBtn.addEventListener('click', () => {
                this.geocodeAddress();
            });
        }

        // Current location button
        const currentLocationBtn = document.getElementById('current-location-btn');
        if (currentLocationBtn) {
            currentLocationBtn.addEventListener('click', () => {
                this.useCurrentLocation();
            });
        }

        // Location picker button
        const enablePickerBtn = document.getElementById('enable-picker-btn');
        if (enablePickerBtn) {
            enablePickerBtn.addEventListener('click', () => {
                this.toggleLocationPicker();
            });
        }

        // Clear location button
        const clearLocationBtn = document.getElementById('clear-location-btn');
        if (clearLocationBtn) {
            clearLocationBtn.addEventListener('click', () => {
                this.clearLocationSelection();
            });
        }

        // Success modal buttons
        const viewVenuesBtn = document.getElementById('view-venues-btn');
        if (viewVenuesBtn) {
            viewVenuesBtn.addEventListener('click', () => {
                window.location.href = 'venues.html';
            });
        }

        const createAnotherBtn = document.getElementById('create-another-btn');
        if (createAnotherBtn) {
            createAnotherBtn.addEventListener('click', () => {
                this.resetForm();
                this.hideSuccessModal();
            });
        }

        // Set up location search
        this.setupLocationSearch();
    },

    // Initialize the venue location map
    initializeMap: async function() {
        try {
            console.log("🗺️ Initializing venue location map");

            const container = document.getElementById("venue-location-map");
            if (!container) {
                console.error("❌ Map container not found!");
                return;
            }

            // Initialize AWS venue map
            this.venueLocationMap = await MapService.initializeVenueMap("venue-location-map", {
                center: [103.8198, 1.3521], // Singapore center
                zoom: 11
            });

            if (!this.venueLocationMap) {
                console.error("❌ Failed to initialize map");
                return;
            }

            console.log("✅ Venue location map initialized successfully");

        } catch (error) {
            console.error("❌ Failed to initialize map:", error);
            this.showMapError(error.message);
        }
    },

    // Set up location search functionality
    setupLocationSearch: function() {
        const searchInput = document.getElementById('location-search');
        const searchResults = document.getElementById('search-results');
        
        if (!searchInput || !searchResults) return;

        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            // Hide results if query is too short
            if (query.length < 3) {
                searchResults.style.display = 'none';
                return;
            }
            
            // Debounce search
            searchTimeout = setTimeout(async () => {
                try {
                    const results = await MapService.searchLocation(query);
                    this.displaySearchResults(results);
                } catch (error) {
                    console.error("❌ Search failed:", error);
                }
            }, 300);
        });

        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
    },

    // Display search results
    displaySearchResults: function(results) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        searchResults.innerHTML = results.map((result, index) => `
            <div class="search-result-item" data-result-index="${index}">
                <div class="result-label">${result.label}</div>
                <div class="result-country">${result.country || ''} ${result.region || ''}</div>
            </div>
        `).join('');

        // Store results for later reference
        this.currentSearchResults = results;

        // Add click listeners to result items
        searchResults.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectSearchResult(results[index]);
            });
        });

        searchResults.style.display = 'block';
    },

    // Handle search result selection
    selectSearchResult: function(result) {
        try {
            console.log("🎯 Selecting search result:", result);
            
            // Update search input
            const searchInput = document.getElementById('location-search');
            if (searchInput) {
                searchInput.value = result.label;
            }
            
            // Hide search results
            const searchResults = document.getElementById('search-results');
            if (searchResults) {
                searchResults.style.display = 'none';
            }
            
            // Fly to location on map
            if (this.venueLocationMap && result.coordinates) {
                this.venueLocationMap.flyTo({
                    center: result.coordinates,
                    zoom: 15
                });
                
                // Select this location
                this.handleLocationSelected({
                    coordinates: result.coordinates,
                    lat: result.coordinates[1],
                    lng: result.coordinates[0],
                    address: result.label,
                    country: result.country,
                    region: result.region
                });
            }
            
        } catch (error) {
            console.error("❌ Failed to select search result:", error);
        }
    },

    // Handle location selection from map or search
    handleLocationSelected: function(locationResult) {
        console.log("📍 Location selected for venue creation:", locationResult);
        
        // Remove previous marker
        if (this.selectedLocationMarker) {
            this.selectedLocationMarker.remove();
        }
        
        // Add new marker
        if (this.venueLocationMap) {
            this.selectedLocationMarker = new window.maplibregl.Marker({ 
                color: '#28a745',
                scale: 1.3
            })
            .setLngLat(locationResult.coordinates)
            .addTo(this.venueLocationMap);
            
            console.log("✅ Marker added to map at:", locationResult.coordinates);
        } else {
            console.error("❌ Venue location map not available");
        }
        
        // Update form fields
        console.log("🔧 About to update location fields...");
        this.updateLocationFields(locationResult);
        
        // Show confirmation
        console.log("📋 About to show confirmation...");
        this.showLocationConfirmation(locationResult);
        
        // Disable location picker if it was enabled
        if (this.isLocationPickerEnabled) {
            this.toggleLocationPicker();
        }
        
        console.log("✅ Location selection completed successfully");
    },

    // Update form fields with location data
    updateLocationFields: function(locationResult) {
        console.log("🔧 Updating form fields with location data:", locationResult);
        
        const latInput = document.getElementById('venueLatitude');
        const lngInput = document.getElementById('venueLongitude');
        const addressInput = document.getElementById('venueAddress');

        console.log("🔍 Found form elements:", {
            latInput: !!latInput,
            lngInput: !!lngInput,
            addressInput: !!addressInput
        });

        if (latInput) {
            const latValue = locationResult.lat || locationResult.coordinates[1];
            latInput.value = latValue;
            console.log("✅ Latitude updated:", latValue);
        } else {
            console.error("❌ Latitude input not found");
        }
        
        if (lngInput) {
            const lngValue = locationResult.lng || locationResult.coordinates[0];
            lngInput.value = lngValue;
            console.log("✅ Longitude updated:", lngValue);
        } else {
            console.error("❌ Longitude input not found");
        }
        
        if (addressInput && locationResult.address) {
            addressInput.value = locationResult.address;
            console.log("✅ Address updated:", locationResult.address);
        } else {
            console.error("❌ Address input not found or no address provided");
        }
    },

    // Show location confirmation
    showLocationConfirmation: function(locationResult) {
        const confirmationDiv = document.getElementById('location-confirmation');
        const infoDiv = document.getElementById('selected-location-info');
        
        if (confirmationDiv && infoDiv) {
            infoDiv.innerHTML = `
                <strong>Address:</strong> ${locationResult.address}<br>
                <strong>Coordinates:</strong> ${locationResult.lat || locationResult.coordinates[1]}, ${locationResult.lng || locationResult.coordinates[0]}
            `;
            confirmationDiv.style.display = 'block';
        }
    },

    // Geocode address from input field
    geocodeAddress: async function() {
        const addressInput = document.getElementById('venueAddress');
        const geocodeBtn = document.getElementById('geocode-btn');

        if (!addressInput || !addressInput.value.trim()) {
            Utils.showError("Please enter an address first.");
            return;
        }

        try {
            Utils.showLoading(geocodeBtn, "Finding location...");

            const result = await MapService.geocodeAddress(addressInput.value.trim());

            if (result && result.lat && result.lng) {
                const locationResult = {
                    lat: result.lat,
                    lng: result.lng,
                    coordinates: [result.lng, result.lat],
                    address: result.formatted || addressInput.value.trim()
                };

                this.handleLocationSelected(locationResult);

                // Fly to location on map
                if (this.venueLocationMap) {
                    this.venueLocationMap.flyTo({
                        center: locationResult.coordinates,
                        zoom: 15
                    });
                }

                Utils.showSuccess("Coordinates found successfully!");
            } else {
                Utils.showError("Could not find coordinates for this address.");
            }
        } catch (error) {
            console.error("Geocoding failed:", error);
            Utils.showError("Failed to find coordinates for this address.");
        } finally {
            Utils.hideLoading(geocodeBtn, "📍 Get Coordinates");
        }
    },

    // Use user's current location
    useCurrentLocation: async function() {
        const currentLocationBtn = document.getElementById('current-location-btn');

        try {
            Utils.showLoading(currentLocationBtn, "Getting location...");

            const location = await MapService.getUserLocation();
            
            // Reverse geocode to get address
            const locationInfo = await MapService.reverseGeocode(location.lng, location.lat);
            
            const locationResult = {
                lat: location.lat,
                lng: location.lng,
                coordinates: [location.lng, location.lat],
                address: locationInfo ? locationInfo.Place?.Label : `${location.lat}, ${location.lng}`
            };

            this.handleLocationSelected(locationResult);

            // Fly to location on map
            if (this.venueLocationMap) {
                this.venueLocationMap.flyTo({
                    center: locationResult.coordinates,
                    zoom: 15
                });
            }

            Utils.showSuccess("Current location selected!");

        } catch (error) {
            console.error("Failed to get current location:", error);
            Utils.showError("Failed to get your current location. Please check location permissions.");
        } finally {
            Utils.hideLoading(currentLocationBtn, "📱 Use My Location");
        }
    },

    // Toggle location picker mode
    toggleLocationPicker: function() {
        const enablePickerBtn = document.getElementById('enable-picker-btn');
        
        if (!this.venueLocationMap) {
            Utils.showError("Map not initialized");
            return;
        }

        if (this.isLocationPickerEnabled) {
            // Disable picker
            this.venueLocationMap.getCanvas().style.cursor = '';
            this.venueLocationMap.off('click', this.mapClickHandler);
            this.isLocationPickerEnabled = false;
            
            if (enablePickerBtn) {
                enablePickerBtn.textContent = '🎯 Pick Location on Map';
                enablePickerBtn.className = 'btn btn-primary';
            }
            
            Utils.showInfo("Location picker disabled. Click the button to enable it again.");
        } else {
            // Enable picker
            this.venueLocationMap.getCanvas().style.cursor = 'crosshair';
            this.venueLocationMap.on('click', this.mapClickHandler);
            this.isLocationPickerEnabled = true;
            
            if (enablePickerBtn) {
                enablePickerBtn.textContent = '❌ Cancel Picker';
                enablePickerBtn.className = 'btn btn-secondary';
            }
            
            Utils.showInfo("Click on the map to select a location for your venue.");
        }
    },

    // Map click handler for location picking
    mapClickHandler: async function(e) {
        const { lng, lat } = e.lngLat;
        
        console.log("📍 Map clicked for venue location:", { lng, lat });

        try {
            // Reverse geocode to get address
            const locationInfo = await MapService.reverseGeocode(lng, lat);
            
            const locationResult = {
                coordinates: [lng, lat],
                lat: lat,
                lng: lng,
                address: locationInfo ? locationInfo.Place?.Label : `${lat}, ${lng}`
            };

            CreateVenuePage.handleLocationSelected(locationResult);

        } catch (error) {
            console.error("❌ Failed to process map click:", error);
            
            // Still allow selection with coordinates only
            const locationResult = {
                coordinates: [lng, lat],
                lat: lat,
                lng: lng,
                address: `${lat}, ${lng}`
            };

            CreateVenuePage.handleLocationSelected(locationResult);
        }
    },

    // Clear location selection
    clearLocationSelection: function() {
        // Remove marker
        if (this.selectedLocationMarker) {
            this.selectedLocationMarker.remove();
            this.selectedLocationMarker = null;
        }

        // Clear form fields
        const latInput = document.getElementById('venueLatitude');
        const lngInput = document.getElementById('venueLongitude');
        
        if (latInput) latInput.value = '';
        if (lngInput) lngInput.value = '';

        // Hide confirmation
        const confirmationDiv = document.getElementById('location-confirmation');
        if (confirmationDiv) {
            confirmationDiv.style.display = 'none';
        }

        // Clear search input
        const searchInput = document.getElementById('location-search');
        if (searchInput) {
            searchInput.value = '';
        }

        Utils.showInfo("Location selection cleared.");
    },

    // Handle form submission
    handleFormSubmission: async function() {
        try {
            console.log("📝 Processing venue creation form");

            // Validate form
            if (!this.validateForm()) {
                return;
            }

            // Show loading
            this.showLoadingOverlay();

            // Generate venue ID
            const venueID = CONFIG.generateVenueID();

            // Handle image upload first if file is selected
            let imageUrl = null;
            const imageFile = document.getElementById('venueImage')?.files[0];
            
            if (imageFile) {
                try {
                    console.log("📸 Uploading venue image...");
                    // Upload with venue ID correlation like the old form
                    imageUrl = await Utils.uploadImageWithId(imageFile, "venues", venueID);
                    console.log("✅ Image uploaded successfully:", imageUrl);
                } catch (error) {
                    console.error("❌ Image upload failed:", error);
                    Utils.showError("Image upload failed, but venue will be saved without image.");
                }
            }

            // Gather form data with uploaded image URL
            const formData = this.gatherFormData();
            formData.venueID = venueID; // Add generated venue ID
            formData.imageUrl = imageUrl; // Add uploaded image URL

            console.log("📤 Submitting venue data:", formData);

            // Submit to API
            const response = await Utils.apiCall(
                CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES),
                {
                    method: 'POST',
                    headers: {
                        ...CONFIG.getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                }
            );

            console.log("✅ Venue created successfully:", response);

            // Hide loading
            this.hideLoadingOverlay();

            // Show success modal
            this.showSuccessModal();

        } catch (error) {
            console.error("❌ Failed to create venue:", error);
            this.hideLoadingOverlay();
            Utils.showError(`Failed to create venue: ${error.message}`);
        }
    },

    // Validate form data
    validateForm: function() {
        const requiredFields = [
            { id: 'venueName', name: 'Venue Name' },
            { id: 'venueType', name: 'Venue Type' },
            { id: 'venueAddress', name: 'Address' },
            { id: 'venueLatitude', name: 'Latitude' },
            { id: 'venueLongitude', name: 'Longitude' }
        ];

        for (const field of requiredFields) {
            const element = document.getElementById(field.id);
            if (!element || !element.value.trim()) {
                Utils.showError(`${field.name} is required.`);
                element?.focus();
                return false;
            }
        }

        // Validate coordinates
        const lat = parseFloat(document.getElementById('venueLatitude').value);
        const lng = parseFloat(document.getElementById('venueLongitude').value);

        if (isNaN(lat) || isNaN(lng)) {
            Utils.showError("Please select a valid location on the map.");
            return false;
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            Utils.showError("Invalid coordinates. Please select a location on the map.");
            return false;
        }

        return true;
    },

    // Gather form data
    gatherFormData: function() {
        const formData = {
            name: document.getElementById('venueName').value.trim(),
            type: document.getElementById('venueType').value,
            description: document.getElementById('venueDescription').value.trim(),
            address: document.getElementById('venueAddress').value.trim(),
            capacity: document.getElementById('venueCapacity').value ? parseInt(document.getElementById('venueCapacity').value) : null,
            latitude: parseFloat(document.getElementById('venueLatitude').value),
            longitude: parseFloat(document.getElementById('venueLongitude').value)
            // Note: imageUrl and venueID will be added in handleFormSubmission after image upload
        };

        // Remove empty fields except for required ones
        Object.keys(formData).forEach(key => {
            if (formData[key] === '' || formData[key] === null) {
                // Keep required fields even if empty (they'll be validated)
                if (!['name', 'type', 'address', 'latitude', 'longitude'].includes(key)) {
                    delete formData[key];
                }
            }
        });

        return formData;
    },

    // Handle cancel action
    handleCancel: function() {
        if (confirm('Are you sure you want to cancel? All entered data will be lost.')) {
            window.location.href = 'venues.html';
        }
    },

    // Reset form
    resetForm: function() {
        const form = document.getElementById('create-venue-form');
        if (form) {
            form.reset();
        }

        this.clearLocationSelection();

        // Reset map view
        if (this.venueLocationMap) {
            this.venueLocationMap.flyTo({
                center: [103.8198, 1.3521],
                zoom: 11
            });
        }
    },

    // Handle image selection and preview
    handleImageSelection: function(event) {
        const file = event.target.files[0];
        if (!file) {
            this.hideImagePreview();
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            Utils.showError('Please select a valid image file.');
            this.removeImagePreview();
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            Utils.showError('Image file size must be less than 5MB.');
            this.removeImagePreview();
            return;
        }

        // Show preview
        this.showImagePreview(file);
    },

    // Show image preview
    showImagePreview: function(file) {
        const previewContainer = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');

        if (!previewContainer || !previewImg) return;

        // Create FileReader to read the file
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Update file info
        if (fileName) {
            fileName.textContent = `📁 ${file.name}`;
        }
        if (fileSize) {
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
            fileSize.textContent = `📏 ${sizeInMB} MB`;
        }

        // Show preview container
        previewContainer.style.display = 'block';

        console.log("✅ Image preview displayed:", {
            name: file.name,
            size: file.size,
            type: file.type
        });
    },

    // Remove/hide image preview
    removeImagePreview: function() {
        const imageInput = document.getElementById('venueImage');
        const previewContainer = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');

        // Clear file input
        if (imageInput) {
            imageInput.value = '';
        }

        // Clear preview image
        if (previewImg) {
            previewImg.src = '';
        }

        // Hide preview container
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }

        console.log("🗑️ Image preview removed");
    },

    // Hide image preview (without clearing input)
    hideImagePreview: function() {
        const previewContainer = document.getElementById('imagePreview');
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
    },

    // Show loading overlay
    showLoadingOverlay: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    },

    // Hide loading overlay
    hideLoadingOverlay: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    // Show success modal
    showSuccessModal: function() {
        const modal = document.getElementById('success-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    // Hide success modal
    hideSuccessModal: function() {
        const modal = document.getElementById('success-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Show map error
    showMapError: function(message) {
        const container = document.getElementById('venue-location-map');
        if (container) {
            container.innerHTML = `
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
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    CreateVenuePage.init();
});

// Export for global access
window.CreateVenuePage = CreateVenuePage;
