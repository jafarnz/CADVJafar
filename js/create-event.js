// Create Event Page - Dedicated event creation interface
const CreateEvent = {
    venues: [],

    // Initialize the create event page
    init: async function() {
        console.log("🎵 Initializing Create Event Page");
        
        // Check authentication
        if (!Utils.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Set up event listeners
        this.setupEventListeners();
        
        // Load venues for selection
        await this.loadVenues();
        
        console.log("✅ Create Event Page initialized successfully");
    },

    // Set up all event listeners
    setupEventListeners: function() {
        console.log("📝 Setting up event listeners");

        // Form submission
        const form = document.getElementById('create-event-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-button');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                Utils.logout();
            });
        }
    },

    // Load venues from API for dropdown
    loadVenues: async function() {
        try {
            console.log("🏪 Loading venues from API");

            const venuesUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES);
            const response = await Utils.apiCall(venuesUrl, {
                method: 'GET',
                headers: CONFIG.getAuthHeaders()
            });
            console.log("✅ Venues loaded:", response);

            // Handle different response formats
            let venues = [];
            if (response.venues) {
                venues = response.venues;
            } else if (response.message) {
                // Handle stringified JSON in message field
                try {
                    if (typeof response.message === 'string') {
                        venues = JSON.parse(response.message);
                    } else if (response.message.venues) {
                        venues = response.message.venues;
                    }
                } catch (parseError) {
                    console.error("❌ Failed to parse venues message:", parseError);
                    venues = [];
                }
            } else if (Array.isArray(response)) {
                venues = response;
            } else if (response.Items) {
                venues = response.Items;
            }

            this.venues = venues;
            this.populateVenueDropdown();

        } catch (error) {
            console.error("❌ Failed to load venues:", error);
            Utils.showError("Failed to load venues. Please refresh the page.", "create-event-messages");
        }
    },

    // Populate venue dropdown
    populateVenueDropdown: function() {
        const venueSelect = document.getElementById('eventVenue');
        if (!venueSelect) return;

        // Clear existing options except the first one
        venueSelect.innerHTML = '<option value="">Select a venue...</option>';

        this.venues.forEach(venue => {
            const option = document.createElement('option');
            // Use the correct venue ID field based on database schema (venueID)
            const venueId = venue.venueID || venue.venueId || venue.id;
            option.value = venueId;
            option.textContent = venue.name || 'Unnamed Venue';
            venueSelect.appendChild(option);
            
            // Debug logging to see venue structure
            console.log('Venue:', venue, 'Using ID:', venueId);
        });

        console.log(`✅ Populated venue dropdown with ${this.venues.length} venues`);
    },

    // Handle form submission
    handleFormSubmission: async function() {
        const submitBtn = document.getElementById('createEventBtn');
        const originalText = submitBtn.textContent;

        try {
            // Validate form
            const validationResult = this.validateForm();
            if (!validationResult.isValid) {
                Utils.showError(validationResult.message, "create-event-messages");
                return;
            }

            // Show loading state
            Utils.showLoading(submitBtn, "Creating Event...");

            // Collect form data
            const formData = this.collectFormData();
            console.log("📝 Form data collected:", formData);

            // Upload image if selected
            let imageUrl = null;
            if (selectedEventImage) {
                console.log("📸 Uploading event image...");
                imageUrl = await this.uploadEventImage(formData.eventID);
                console.log("✅ Image uploaded:", imageUrl);
            }

            // Add image URL to form data
            if (imageUrl) {
                formData.imageUrl = imageUrl;
            }

            // Submit to API
            console.log("📤 Submitting event to API...");
            const eventsUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS);
            const response = await Utils.apiCall(eventsUrl, {
                method: 'POST',
                headers: CONFIG.getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            console.log("✅ Event created successfully:", response);
            Utils.showSuccess("Event created successfully! Redirecting to dashboard...", "create-event-messages");

            // Redirect after success
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);

        } catch (error) {
            console.error("❌ Failed to create event:", error);
            Utils.showError(error.message || "Failed to create event. Please try again.", "create-event-messages");
        } finally {
            Utils.hideLoading(submitBtn, originalText);
        }
    },

    // Validate form data
    validateForm: function() {
        const name = document.getElementById('eventName').value.trim();
        const eventDate = document.getElementById('eventDate').value;
        const eventTime = document.getElementById('eventTime').value;
        const venueID = document.getElementById('eventVenue').value;

        if (!name) {
            return { isValid: false, message: "Event name is required." };
        }

        if (!eventDate) {
            return { isValid: false, message: "Event date is required." };
        }

        if (!eventTime) {
            return { isValid: false, message: "Event time is required." };
        }

        if (!venueID) {
            return { isValid: false, message: "Please select a venue." };
        }

        // Validate that the selected venue exists in our loaded venues
        const selectedVenue = this.venues.find(venue => {
            const venueId = venue.venueID || venue.venueId || venue.id;
            return venueId && venueId.toString() === venueID.toString();
        });

        if (!selectedVenue) {
            return { isValid: false, message: "Selected venue is invalid. Please refresh the page and try again." };
        }

        console.log('✅ Venue validation passed:', selectedVenue);

        // Check if date is in the future
        const selectedDate = new Date(eventDate + 'T' + eventTime);
        const now = new Date();
        
        if (selectedDate <= now) {
            return { isValid: false, message: "Event date and time must be in the future." };
        }

        return { isValid: true };
    },

    // Collect form data
    collectFormData: function() {
        const name = document.getElementById('eventName').value.trim();
        const description = document.getElementById('eventDescription').value.trim();
        const eventDate = document.getElementById('eventDate').value;
        const eventTime = document.getElementById('eventTime').value;
        const venueID = document.getElementById('eventVenue').value;

        // Generate unique event ID
        const eventID = 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // Debug the venue selection
        const selectedVenue = this.venues.find(venue => {
            const venueId = venue.venueID || venue.venueId || venue.id;
            return venueId && venueId.toString() === venueID.toString();
        });
        
        console.log('🏪 Selected venue details:', selectedVenue);
        console.log('📝 Form data venue ID:', venueID);

        return {
            eventID: eventID,
            name: name,
            description: description || null,
            eventDate: eventDate,
            eventTime: eventTime,
            venueID: venueID
        };
    },

    // Upload event image to S3
    uploadEventImage: async function(eventID) {
        try {
            console.log("📸 Starting S3 image upload for event:", eventID);

            // Validate file
            if (!selectedEventImage) {
                throw new Error("No image selected");
            }

            // Validate image file using Utils function
            if (selectedEventImage.size > 5 * 1024 * 1024) {
                throw new Error("Image file too large. Maximum size is 5MB.");
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(selectedEventImage.type)) {
                throw new Error("Invalid file type. Please select a JPEG, PNG, or GIF image.");
            }

            console.log("📤 Uploading image to S3...");
            
            // Upload to S3 using correct Utils function
            const imageUrl = await Utils.uploadImage(selectedEventImage, "events");
            console.log("✅ S3 upload successful:", imageUrl);

            return imageUrl;

        } catch (error) {
            console.error("❌ S3 upload failed:", error);
            throw new Error(`Image upload failed: ${error.message}`);
        }
    }
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Auth to complete initialization
    setTimeout(() => {
        if (Utils.isAuthenticated()) {
            CreateEvent.init();
        }
    }, 500);
});
