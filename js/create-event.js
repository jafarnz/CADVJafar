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

            const response = await Utils.apiCall('/venues', 'GET');
            console.log("✅ Venues loaded:", response);

            // Handle different response formats
            let venues = [];
            if (response.venues) {
                venues = response.venues;
            } else if (response.message && response.message.venues) {
                venues = response.message.venues;
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
            option.value = venue.venueId || venue.id;
            option.textContent = venue.name || 'Unnamed Venue';
            venueSelect.appendChild(option);
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
            const response = await Utils.apiCall('/events', 'POST', formData);

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

            Utils.s3.validateImageFile(selectedEventImage);

            // Generate unique filename
            const fileExtension = selectedEventImage.name.split('.').pop().toLowerCase();
            const fileName = `events/${eventID}/main.${fileExtension}`;

            // Upload to S3
            const uploadResult = await Utils.s3.uploadFile(selectedEventImage, fileName);
            console.log("✅ S3 upload successful:", uploadResult);

            return uploadResult.url;

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
