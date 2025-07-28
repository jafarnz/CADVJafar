const EditEvent = {
    currentEventId: null,
    originalEventData: null,
    venues: [],
    selectedEventImage: null,

    init: function() {
        try {
            this.currentEventId = this.getEventIdFromUrl();
            
            if (!this.currentEventId) {
                Utils.showError('No event ID provided', 'edit-event-messages');
                setTimeout(() => {
                    window.location.href = 'events.html';
                }, 2000);
                return;
            }

            console.log('Initializing edit event with ID:', this.currentEventId);
            
            this.loadEventData();
            
            this.loadVenues();
            
            this.setupFormHandling();
            
        } catch (error) {
            console.error('Error initializing edit event:', error);
            Utils.showError('Error loading event data', 'edit-event-messages');
        }
    },

    getEventIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    },

    async loadEventData() {
        try {
            if (!Utils.isAuthenticated()) {
                console.error('User not authenticated, redirecting to login');
                Utils.showError('Please log in to edit events', 'edit-event-messages');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            }

            const userData = Utils.getUserFromToken();
            console.log('Current user data from token:', userData);
            
            if (!userData || !userData.sub) {
                console.error('User data missing or invalid');
                Utils.showError('Unable to verify user identity. Please log in again.', 'edit-event-messages');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
                return;
            }

            console.log('Loading event data for ID:', this.currentEventId);

            const eventUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS, this.currentEventId);
            console.log('Event API URL:', eventUrl);
            
            const response = await Utils.apiCall(eventUrl, {
                method: 'GET',
                headers: CONFIG.getAuthHeaders()
            });

            console.log('Loaded event data:', response);
            
            let eventData = null;
            if (response.event) {
                eventData = response.event;
            } else if (response.message) {
                try {
                    if (typeof response.message === 'string') {
                        eventData = JSON.parse(response.message);
                    } else {
                        eventData = response.message;
                    }
                } catch (parseError) {
                    console.error("Failed to parse event message:", parseError);
                    throw new Error('Failed to parse event data');
                }
            } else if (response.eventID || response.name) {
                eventData = response;
            } else {
                throw new Error('Invalid event data format received');
            }

            if (!eventData) {
                throw new Error('No event data received');
            }
            
            this.originalEventData = eventData;
            this.populateForm(eventData);
            
        } catch (error) {
            console.error('Error loading event data:', error);
            Utils.showError(`Failed to load event data: ${error.message}`, 'edit-event-messages');
            
            // Don't throw the error to prevent further propagation
            // Instead, show a user-friendly message and option to go back
            setTimeout(() => {
                const messagesDiv = document.getElementById('edit-event-messages');
                if (messagesDiv) {
                    messagesDiv.innerHTML += `
                        <div style="padding: 1rem; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; margin-top: 1rem;">
                            <p style="margin: 0 0 1rem 0;">Unable to load event. This might be because:</p>
                            <ul style="margin: 0 0 1rem 1rem;">
                                <li>The event doesn't exist</li>
                                <li>You don't have permission to edit this event</li>
                                <li>There's a network connectivity issue</li>
                            </ul>
                            <a href="events.html" class="btn btn-primary">← Back to Events</a>
                        </div>
                    `;
                }
            }, 1000);
        }
    },

    populateForm(eventData) {
        try {
            // Clear any previously uploaded image URL when loading existing data
            window.uploadedEventImageUrl = null;
            
            // Basic event info
            document.getElementById('eventName').value = eventData.name || '';
            document.getElementById('eventDescription').value = eventData.description || '';
            document.getElementById('eventDate').value = this.formatDateForInput(eventData.eventDate) || '';
            document.getElementById('eventTime').value = eventData.eventTime || '';
            
            // Set venue selection (will be set after venues are loaded)
            this.selectedVenueId = eventData.venueID;

            // Image handling
            if (eventData.imageUrl) {
                const eventImagePreview = document.getElementById('eventImagePreview');
                const eventPlaceholder = document.getElementById('eventUploadPlaceholder');
                const removeEventBtn = document.getElementById('removeEventPhotoBtn');

                eventImagePreview.src = eventData.imageUrl;
                eventImagePreview.style.display = 'block';
                eventPlaceholder.style.display = 'none';
                removeEventBtn.style.display = 'inline-block';
            }

            // Update preview
            updatePreview();

            console.log(' Form populated with event data');
        } catch (error) {
            console.error('Error populating form:', error);
            Utils.showError('Error displaying event data', 'edit-event-messages');
        }
    },

    async loadVenues() {
        try {
            console.log(" Loading venues from API");

            const venuesUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES);
            const response = await Utils.apiCall(venuesUrl, {
                method: 'GET',
                headers: CONFIG.getAuthHeaders()
            });
            console.log(" Venues loaded:", response);

            // Handle different response formats
            let venues = [];
            if (response.venues) {
                venues = response.venues;
            } else if (response.message) {
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
            Utils.showError("Failed to load venues. You can still edit other event details.", "edit-event-messages");
            
            // Add a fallback message to the venue dropdown
            const venueSelect = document.getElementById('eventVenue');
            if (venueSelect) {
                venueSelect.innerHTML = '<option value="">Venues could not be loaded</option>';
                venueSelect.disabled = true;
            }
        }
    },

    populateVenueDropdown() {
        const venueSelect = document.getElementById('eventVenue');
        if (!venueSelect) return;

        // Clear existing options except the first one
        venueSelect.innerHTML = '<option value="">Select a venue...</option>';

        this.venues.forEach(venue => {
            const option = document.createElement('option');
            const venueId = venue.venueID || venue.venueId || venue.id;
            option.value = venueId;
            option.textContent = venue.name || 'Unnamed Venue';
            
            // Select the current venue
            if (this.selectedVenueId && venueId.toString() === this.selectedVenueId.toString()) {
                option.selected = true;
            }
            
            venueSelect.appendChild(option);
        });

        // Update preview after venues are loaded
        updatePreview();

        console.log(`Populated venue dropdown with ${this.venues.length} venues`);
    },

    setupFormHandling() {
        const form = document.getElementById('edit-event-form');
        const deleteBtn = document.getElementById('deleteEventBtn');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission();
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.handleEventDeletion();
            });
        }

        // Setup logout functionality
        const logoutBtn = document.getElementById('logout-button');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                Utils.logout();
            });
        }
    },

    async handleFormSubmission() {
        const submitBtn = document.getElementById('updateEventBtn');
        const originalText = submitBtn.textContent;

        try {
            // Validate form
            const validationResult = this.validateForm();
            if (!validationResult.isValid) {
                Utils.showError(validationResult.message, "edit-event-messages");
                return;
            }

            Utils.showLoading(submitBtn, "Updating...");

            // Collect form data
            const formData = this.collectFormData();

            // Use uploaded image URL if available, otherwise keep original
            let imageUrl = this.originalEventData.imageUrl;
            if (window.uploadedEventImageUrl) {
                imageUrl = window.uploadedEventImageUrl;
                console.log(" Using uploaded image URL:", imageUrl);
            }
            // Check if image was removed (preview is hidden and no uploaded URL)
            else {
                const eventImagePreview = document.getElementById('eventImagePreview');
                const isImageDisplayed = eventImagePreview && eventImagePreview.style.display !== 'none';
                
                if (!isImageDisplayed && !window.uploadedEventImageUrl) {
                    console.log('Image was removed, setting imageUrl to null');
                    imageUrl = null;
                }
            }

            // Add image URL to form data
            if (imageUrl) {
                formData.imageUrl = imageUrl;
            }

            // Submit to API
            console.log(" Updating event in API...");
            const eventUrl = CONFIG.buildApiUrl(`events/${this.currentEventId}`);
            const response = await Utils.apiCall(eventUrl, {
                method: 'PUT',
                headers: CONFIG.getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            console.log(" Event updated successfully:", response);
            Utils.showSuccess("Event updated successfully! Redirecting to events...", "edit-event-messages");

            // Redirect after success
            setTimeout(() => {
                window.location.href = 'events.html';
            }, 2000);

        } catch (error) {
            console.error("❌ Failed to update event:", error);
            Utils.showError(error.message || "Failed to update event. Please try again.", "edit-event-messages");
        } finally {
            Utils.hideLoading(submitBtn, originalText);
        }
    },

    async handleEventDeletion() {
        const eventName = this.originalEventData.name;
        
        const confirmed = confirm(
            `Are you sure you want to delete "${eventName}"?\n\nThis action cannot be undone.`
        );

        if (!confirmed) return;

        const deleteBtn = document.getElementById('deleteEventBtn');
        const originalText = deleteBtn.textContent;

        try {
            Utils.showLoading(deleteBtn, "Deleting...");

            console.log("Deleting event from API...");
            const eventUrl = CONFIG.buildApiUrl(`events/${this.currentEventId}`);
            const response = await Utils.apiCall(eventUrl, {
                method: 'DELETE',
                headers: CONFIG.getAuthHeaders()
            });

            console.log("Event deleted successfully:", response);
            Utils.showSuccess("Event deleted successfully! Redirecting to events...", "edit-event-messages");

            // Redirect after success
            setTimeout(() => {
                window.location.href = 'events.html';
            }, 2000);

        } catch (error) {
            console.error("❌ Failed to delete event:", error);
            Utils.showError(error.message || "Failed to delete event. Please try again.", "edit-event-messages");
        } finally {
            Utils.hideLoading(deleteBtn, originalText);
        }
    },

    validateForm() {
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

        // Check if date is in the future
        const selectedDate = new Date(eventDate + 'T' + eventTime);
        const now = new Date();
        
        if (selectedDate <= now) {
            return { isValid: false, message: "Event date and time must be in the future." };
        }

        console.log(' Form validation passed');
        return { isValid: true };
    },

    collectFormData() {
        const name = document.getElementById('eventName').value.trim();
        const description = document.getElementById('eventDescription').value.trim();
        const eventDate = document.getElementById('eventDate').value;
        const eventTime = document.getElementById('eventTime').value;
        const venueID = document.getElementById('eventVenue').value;

        // Debug the venue selection
        const selectedVenue = this.venues.find(venue => {
            const venueId = venue.venueID || venue.venueId || venue.id;
            return venueId && venueId.toString() === venueID.toString();
        });
        
        console.log(' Selected venue details:', selectedVenue);
        console.log(' Form data venue ID:', venueID);

        return {
            eventID: this.currentEventId,
            name: name,
            description: description || null,
            eventDate: eventDate,
            eventTime: eventTime,
            venueID: venueID
        };
    },

    async uploadEventImage(eventID) {
        try {
            console.log(' Starting image upload for event:', eventID);
            
            if (!selectedEventImage) {
                console.log(' No image selected for upload');
                return null;
            }

            const imageUrl = await Utils.uploadImage(selectedEventImage, 'events', eventID);
            console.log(' Image uploaded successfully (parsed):', imageUrl);
            
            return imageUrl;
        } catch (error) {
            console.error(' Image upload failed:', error);
            throw new Error('Failed to upload event image');
        }
    },

    // Utility function to format ISO date for HTML date input (yyyy-MM-dd format)
    formatDateForInput(dateString) {
        if (!dateString) return '';
        
        try {
            // Handle ISO date strings like "2026-10-26T00:00:00.000Z"
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            
            // Format as yyyy-MM-dd for HTML date input
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('❌ Error formatting date for input:', error);
            return '';
        }
    }
};
