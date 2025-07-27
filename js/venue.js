// Venues page functionality for Local Gigs App
const VenuesPage = {
        venues: [],
        filteredVenues: [],
        currentPage: 1,
        itemsPerPage: 12,
        isMapView: false,
        mapInitialized: false,
        editingVenue: null,

        // Initialize the venues page
        init: async function() {
            console.log("Initializing venues page...");

            // Check authentication
            if (!Utils.requireAuth()) {
                return;
            }

            // Check if we should open create modal (from URL parameter)
            const urlParams = new URLSearchParams(window.location.search);
            const action = urlParams.get('action');

            // Set up event listeners
            this.setupEventListeners();

            // Load venues data
            await this.loadAllData();

            // Apply filters and render
            this.applyFilters();
            this.render();

            // Open create modal if requested
            if (action === 'create') {
                this.openCreateModal();
            }

            console.log("Venues page initialized successfully");
        },

        // Set up all event listeners
        setupEventListeners: function() {
            // Logout button
            const logoutBtn = document.getElementById("logout-button");
            if (logoutBtn) {
                logoutBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    Utils.logout();
                });
            }

            // Search input
            const searchInput = document.getElementById("search-input");
            if (searchInput) {
                searchInput.addEventListener(
                    "input",
                    Utils.debounce(() => {
                        this.currentPage = 1;
                        this.applyFilters();
                        this.render();
                    }, 300)
                );
            }

            // Capacity filter
            const capacityFilter = document.getElementById("capacity-filter");
            if (capacityFilter) {
                capacityFilter.addEventListener("change", () => {
                    this.currentPage = 1;
                    this.applyFilters();
                    this.render();
                });
            }

            // Location filter
            const locationFilter = document.getElementById("location-filter");
            if (locationFilter) {
                locationFilter.addEventListener(
                    "input",
                    Utils.debounce(() => {
                        this.currentPage = 1;
                        this.applyFilters();
                        this.render();
                    }, 300)
                );
            }

            // Sort select
            const sortSelect = document.getElementById("sort-select");
            if (sortSelect) {
                sortSelect.addEventListener("change", () => {
                    this.applyFilters();
                    this.render();
                });
            }

            // View toggle buttons
            const toggleViewBtn = document.getElementById("toggle-view-btn");
            const listViewBtn = document.getElementById("list-view-btn");

            if (toggleViewBtn) {
                toggleViewBtn.addEventListener("click", () => {
                    this.toggleMapView();
                });
            }

            if (listViewBtn) {
                listViewBtn.addEventListener("click", () => {
                    this.toggleListView();
                });
            }

            // Create venue button and modal
            const createVenueBtn = document.getElementById("create-venue-btn");
            const venueModal = document.getElementById("venue-modal");
            const closeVenueModal = document.getElementById("close-venue-modal");
            const venueForm = document.getElementById("venue-form");

            if (createVenueBtn && venueModal) {
                createVenueBtn.addEventListener("click", () => {
                    this.openCreateModal();
                });
            }

            if (closeVenueModal && venueModal) {
                closeVenueModal.addEventListener("click", () => {
                    this.closeModal();
                });
            }

            if (venueForm) {
                venueForm.addEventListener("submit", (e) => {
                    e.preventDefault();
                    this.handleVenueSubmit(e);
                });
            }

            // Venue details modal
            const venueDetailsModal = document.getElementById("venue-details-modal");
            const closeDetailsModal = document.getElementById("close-details-modal");

            if (closeDetailsModal && venueDetailsModal) {
                closeDetailsModal.addEventListener("click", () => {
                    venueDetailsModal.style.display = "none";
                });
            }

            // Location and geocoding buttons
            const getLocationBtn = document.getElementById("get-location-btn");
            const geocodeBtn = document.getElementById("geocode-btn");

            if (getLocationBtn) {
                getLocationBtn.addEventListener("click", () => {
                    this.getCurrentLocationForVenue();
                });
            }

            if (geocodeBtn) {
                geocodeBtn.addEventListener("click", () => {
                    this.geocodeVenueAddress();
                });
            }

            // Interactive map controls for venue creation
            const enableLocationPickerBtn = document.getElementById("enable-location-picker-btn");
            const getCurrentLocationBtn = document.getElementById("get-current-location-btn");
            const searchLocationBtn = document.getElementById("search-location-btn");
            const locationSearchInput = document.getElementById("location-search");

            if (enableLocationPickerBtn) {
                enableLocationPickerBtn.addEventListener("click", () => {
                    this.enableVenueLocationPicker();
                });
            }

            if (getCurrentLocationBtn) {
                getCurrentLocationBtn.addEventListener("click", () => {
                    this.useCurrentLocationForVenue();
                });
            }

            if (searchLocationBtn) {
                searchLocationBtn.addEventListener("click", () => {
                    this.searchAndSelectLocation();
                });
            }

            if (locationSearchInput) {
                locationSearchInput.addEventListener("keypress", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        this.searchAndSelectLocation();
                    }
                });
            }

            // Pagination
            const prevPageBtn = document.getElementById("prev-page");
            const nextPageBtn = document.getElementById("next-page");

            if (prevPageBtn) {
                prevPageBtn.addEventListener("click", () => {
                    if (this.currentPage > 1) {
                        this.currentPage--;
                        this.render();
                    }
                });
            }

            if (nextPageBtn) {
                nextPageBtn.addEventListener("click", () => {
                    const totalPages = Math.ceil(this.filteredVenues.length / this.itemsPerPage);
                    if (this.currentPage < totalPages) {
                        this.currentPage++;
                        this.render();
                    }
                });
            }

            // Close modals when clicking outside
            window.addEventListener("click", (e) => {
                if (e.target === venueModal) {
                    this.closeModal();
                }
                if (e.target === venueDetailsModal) {
                    venueDetailsModal.style.display = "none";
                }
            });
        },

        // Load all venues data
        loadAllData: async function() {
            try {
                console.log("Loading venues...");

                const venuesUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES);
                const venuesResponse = await Utils.apiCall(venuesUrl, {
                    method: "GET",
                    headers: CONFIG.getAuthHeaders(),
                });

                // Handle different response formats
                if (Array.isArray(venuesResponse)) {
                    this.venues = venuesResponse;
                } else if (venuesResponse && venuesResponse.venues && Array.isArray(venuesResponse.venues)) {
                    this.venues = venuesResponse.venues;
                } else if (venuesResponse && venuesResponse.Items && Array.isArray(venuesResponse.Items)) {
                    this.venues = venuesResponse.Items;
                } else if (venuesResponse && venuesResponse.message) {
                    try {
                        const parsedVenues = JSON.parse(venuesResponse.message);
                        if (Array.isArray(parsedVenues)) {
                            this.venues = parsedVenues;
                            console.log("✅ Venues parsed from message field:", this.venues.length);
                        } else {
                            console.log("Parsed venues message is not an array:", parsedVenues);
                            this.venues = [];
                        }
                    } catch (parseError) {
                        console.error("Failed to parse venues from message:", parseError);
                        this.venues = [];
                    }
                } else {
                    console.log("Unexpected venues response format:", venuesResponse);
                    this.venues = [];
                }

                console.log(`Loaded ${this.venues.length} venues`);
            } catch (error) {
                console.error("Failed to load venues:", error);
                this.venues = [];
                Utils.showError("Failed to load venues. Please try again later.");
            }
        },

        // Apply search and filter criteria
        applyFilters: function() {
            const searchInput = document.getElementById("search-input");
            const capacityFilter = document.getElementById("capacity-filter");
            const locationFilter = document.getElementById("location-filter");
            const sortSelect = document.getElementById("sort-select");

            const searchTerm = searchInput && searchInput.value.toLowerCase() || "";
            const capacityFilterValue = capacityFilter && capacityFilter.value || "";
            const locationFilterValue = locationFilter && locationFilter.value.toLowerCase() || "";
            const sortBy = sortSelect && sortSelect.value || "name-asc";

            let filtered = [...this.venues];

            // Apply search filter
            if (searchTerm) {
                filtered = filtered.filter(
                    (venue) =>
                    venue.name.toLowerCase().includes(searchTerm) ||
                    (venue.description && venue.description.toLowerCase().includes(searchTerm)) ||
                    venue.address.toLowerCase().includes(searchTerm)
                );
            }

            // Apply capacity filter
            if (capacityFilterValue) {
                filtered = filtered.filter((venue) => {
                    if (!venue.capacity) return capacityFilterValue === "small"; // Assume small if no capacity
                    const capacity = parseInt(venue.capacity);
                    switch (capacityFilterValue) {
                        case "small":
                            return capacity <= 500;
                        case "medium":
                            return capacity > 500 && capacity <= 2000;
                        case "large":
                            return capacity > 2000;
                        default:
                            return true;
                    }
                });
            }

            // Apply location filter
            if (locationFilterValue) {
                filtered = filtered.filter((venue) =>
                    venue.address.toLowerCase().includes(locationFilterValue)
                );
            }

            // Apply sorting
            filtered.sort((a, b) => {
                switch (sortBy) {
                    case "name-asc":
                        return a.name.localeCompare(b.name);
                    case "name-desc":
                        return b.name.localeCompare(a.name);
                    case "capacity-asc":
                        return (a.capacity || 0) - (b.capacity || 0);
                    case "capacity-desc":
                        return (b.capacity || 0) - (a.capacity || 0);
                    default:
                        return a.name.localeCompare(b.name);
                }
            });

            this.filteredVenues = filtered;
        },

        // Render the venues list or map
        render: function() {
            if (this.isMapView) {
                this.renderMapView();
            } else {
                this.renderListView();
            }
            this.updateVenuesCount();
            this.updatePagination();
        },

        // Render list view
        renderListView: function() {
            const venuesGrid = document.getElementById("venues-grid");
            if (!venuesGrid) return;

            if (this.filteredVenues.length === 0) {
                venuesGrid.innerHTML = `
        <div class="no-venues">
          <h3>No venues found</h3>
          <p>Try adjusting your filters or add a new venue.</p>
          <button onclick="VenuesPage.openCreateModal()" class="btn">
            Add Venue
          </button>
        </div>
      `;
                return;
            }

            // Calculate pagination
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const venuesToShow = this.filteredVenues.slice(startIndex, endIndex);

            // Render venues grid
            venuesGrid.innerHTML = `
      <div class="venues-grid">
        ${venuesToShow.map((venue) => this.createVenueCard(venue)).join("")}
      </div>
    `;

            // Add click listeners to venue cards
            this.addVenueCardListeners();
        },

        // Render map view
        renderMapView: async function() {
            if (!this.mapInitialized) {
                try {
                    const success = await MapService.init("venues-map");
                    if (success) {
                        this.mapInitialized = true;
                    } else {
                        Utils.showError("Failed to initialize map. Please try list view.");
                        this.toggleListView();
                        return;
                    }
                } catch (error) {
                    console.error("Map initialization failed:", error);
                    Utils.showError("Map is not available. Please use list view.");
                    this.toggleListView();
                    return;
                }
            }

            // Show venue markers on the map
            if (this.mapInitialized) {
                try {
                    await this.renderVenuesOnMap();
                } catch (error) {
                    console.error("❌ Failed to load map data:", error);
                    Utils.showError("Failed to load venues on map. Please try refreshing.");
                }
            }
        },

        // Render venues on map with proper data and hover functionality
        renderVenuesOnMap: async function() {
            try {
                console.log("🗺️ Loading venue markers...");
                
                // Clear any existing markers
                if (MapService.venueMarkers) {
                    MapService.venueMarkers.forEach(marker => marker.remove());
                    MapService.venueMarkers = [];
                }

                let venueMarkersCount = 0;
                const validVenues = this.filteredVenues.filter(venue => 
                    venue.latitude && venue.longitude
                );

                console.log(`📍 Adding ${validVenues.length} venue markers to map...`);

                for (const venue of validVenues) {
                    if (venue.latitude && venue.longitude) {
                        // Create venue marker with custom styling
                        const marker = new window.maplibregl.Marker({
                            color: '#10b981',
                            scale: 1.3
                        })
                        .setLngLat([parseFloat(venue.longitude), parseFloat(venue.latitude)])
                        .setPopup(new window.maplibregl.Popup().setHTML(`
                            <div style="text-align: center; padding: 0.75rem; max-width: 280px;">
                                <h4 style="margin: 0 0 0.5rem 0; color: #333; font-size: 1.1rem;">${venue.name}</h4>
                                <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">
                                    📍 ${venue.address || 'Address not available'}
                                </p>
                                <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">
                                    👥 Capacity: ${venue.capacity || 'Not specified'}
                                </p>
                                ${venue.type ? `<p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">🏢 ${venue.type.charAt(0).toUpperCase() + venue.type.slice(1).replace('-', ' ')}</p>` : ''}
                                ${venue.description ? `<p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.85rem; line-height: 1.4; max-height: 60px; overflow-y: auto;">${venue.description}</p>` : ''}
                                <div style="display: flex; gap: 0.5rem; justify-content: center; margin-top: 0.75rem;">
                                    <button onclick="window.location.href='venue-details.html?id=${venue.venueID || venue.venueId}'" 
                                            style="background: #3b82f6; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">
                                        View Details
                                    </button>
                                    <button onclick="VenuesPage.createEventAtVenue('${venue.venueID || venue.venueId}')" 
                                            style="background: #10b981; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">
                                        Create Event
                                    </button>
                                </div>
                            </div>
                        `))
                        .addTo(MapService.map);
                        
                        // Store marker reference
                        if (!MapService.venueMarkers) {
                            MapService.venueMarkers = [];
                        }
                        MapService.venueMarkers.push(marker);
                        
                        venueMarkersCount++;
                    }
                }
                
                console.log(`✅ Venues map loaded with ${venueMarkersCount} venue markers`);
                
                // Update map info display if it exists
                const mapInfo = document.getElementById("venues-map-info");
                if (mapInfo) {
                    mapInfo.textContent = `Showing ${venueMarkersCount} venues`;
                }
                
                return { venues: venueMarkersCount, events: 0 };
            } catch (error) {
                console.error("❌ Failed to load venue markers:", error);
                return { venues: 0, events: 0 };
            }
        },

        // Create event at specific venue (helper function for map popup)
        createEventAtVenue: function(venueId) {
            // Pre-select the venue in create event form
            const createEventBtn = document.getElementById("create-event-btn");
            if (createEventBtn) {
                // Store venue ID for pre-selection
                sessionStorage.setItem('preselectedVenueId', venueId);
                // Redirect to events page to create event
                window.location.href = 'events.html';
            }
        },

        // Create HTML for venue card
        createVenueCard: function(venue) {
                const capacity = venue.capacity || 0;
                const capacityClass = capacity <= 500 ? "small" : capacity <= 2000 ? "medium" : "large";
                const capacityText = capacity > 0 ? capacity.toLocaleString() : "Not specified";
                
                // Use the enhanced image URL resolver
                const imageUrl = Utils.resolveImageUrl(venue.imageUrl, 'venues', venue.venueID);

                return `
      <div class="venue-card" data-venue-id="${venue.venueID}" onclick="VenuesPage.goToVenueDetails('${venue.venueID}')">
        <img src="${imageUrl}" alt="${Utils.sanitizeInput(venue.name)}" class="venue-card-image"
             onerror="this.src='/api/placeholder/350/180'">
        <div class="venue-card-content">
          <h3 class="venue-card-title">${Utils.sanitizeInput(venue.name)}</h3>
          <div class="venue-card-meta">
            <span><strong>📍</strong> ${Utils.sanitizeInput(venue.address)}</span>
            <span><strong>👥</strong> Capacity: ${capacityText}</span>
            ${venue.type ? `<span><strong>🏢</strong> ${Utils.capitalize(venue.type.replace('-', ' '))}</span>` : ""}
          </div>
          ${venue.description ? `<p class="venue-card-description">${Utils.sanitizeInput(venue.description)}</p>` : ""}
          <div class="venue-card-actions">
            <div>
              <span class="capacity-badge ${capacityClass}">${Utils.capitalize(capacityClass)}</span>
              ${venue.type ? `<span class="type-badge">${Utils.capitalize(venue.type.replace('-', ' '))}</span>` : ""}
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary view-details-btn" data-venue-id="${venue.venueID}" onclick="event.stopPropagation(); VenuesPage.goToVenueDetails('${venue.venueID}')">
                View Details
              </button>
              <button class="edit-btn" data-venue-id="${venue.venueID}" onclick="event.stopPropagation();">
                Edit
              </button>
              <button class="delete-btn" data-venue-id="${venue.venueID}" onclick="event.stopPropagation();">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // Add event listeners to venue cards
  addVenueCardListeners: function () {
    // View details buttons
    document.querySelectorAll(".view-details-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const venueId = btn.getAttribute("data-venue-id");
        this.showVenueDetails(venueId);
      });
    });

    // Edit buttons
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const venueId = btn.getAttribute("data-venue-id");
        this.openEditModal(venueId);
      });
    });

    // Delete buttons
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const venueId = btn.getAttribute("data-venue-id");
        this.deleteVenue(venueId);
      });
    });

    // Venue card click for details
    document.querySelectorAll(".venue-card").forEach((card) => {
      card.addEventListener("click", () => {
        const venueId = card.getAttribute("data-venue-id");
        this.showVenueDetails(venueId);
      });
    });
  },

  // Open create venue modal
  openCreateModal: function () {
    this.editingVenue = null;
    const modal = document.getElementById("venue-modal");
    const title = document.getElementById("venue-modal-title");
    const submitBtn = document.getElementById("venue-submit-btn");
    const form = document.getElementById("venue-form");

    if (title) title.textContent = "Add New Venue";
    if (submitBtn) submitBtn.textContent = "Add Venue";
    if (form) form.reset();

    // Clear any selected location info
    this.clearSelectedLocationInfo();

    // Clear map container and prepare for initialization
    const mapContainer = document.getElementById("venue-location-map");
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6c757d;">
          <div style="text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">🗺️</div>
            <p style="margin: 0; font-weight: 600;">AWS Location Service Map</p>
            <p style="margin: 0; font-size: 0.9rem;">Initializing interactive map...</p>
          </div>
        </div>
      `;
    }

    modal.style.display = "block";

    // Initialize map for location selection after modal is visible
    setTimeout(() => {
      this.initializeVenueLocationMap();
    }, 500); // Increased timeout to ensure modal is fully rendered
  },

  // Open edit venue modal
  openEditModal: function (venueId) {
    const venue = this.venues.find(v => v.venueID.toString() === venueId.toString());
    if (!venue) return;

    this.editingVenue = venue;
    const modal = document.getElementById("venue-modal");
    const title = document.getElementById("venue-modal-title");
    const submitBtn = document.getElementById("venue-submit-btn");

    if (title) title.textContent = "Edit Venue";
    if (submitBtn) submitBtn.textContent = "Update Venue";

    // Populate form with venue data
    document.getElementById("venueID").value = venue.venueID;
    document.getElementById("venueName").value = venue.name;
    document.getElementById("venueAddress").value = venue.address;
    document.getElementById("venueDescription").value = venue.description || "";
    document.getElementById("venueCapacity").value = venue.capacity || "";
    document.getElementById("venueType").value = venue.type || "";
    document.getElementById("venueLatitude").value = venue.latitude || "";
    document.getElementById("venueLongitude").value = venue.longitude || "";

    modal.style.display = "block";
  },

  // Close venue modal
  closeModal: function () {
    const modal = document.getElementById("venue-modal");
    modal.style.display = "none";
    this.editingVenue = null;
  },

  // Handle venue form submission
  handleVenueSubmit: async function (e) {
    const form = e.target;
    const submitBtn = document.getElementById("venue-submit-btn");
    const messagesDiv = document.getElementById("venue-modal-messages");

    try {
      Utils.showLoading(submitBtn, this.editingVenue ? "Updating..." : "Creating...");

      const formData = new FormData(form);
      let imageUrl = this.editingVenue && this.editingVenue.imageUrl || null;

      // Handle image upload if present
      const imageFile = formData.get("image");
      let venueID = this.editingVenue ? this.editingVenue.venueID : CONFIG.generateVenueID();
      
      if (imageFile && imageFile.size > 0) {
        try {
          // Upload with venue ID correlation
          imageUrl = await Utils.uploadImageWithId(imageFile, "venues", venueID);
        } catch (error) {
          console.error("Image upload failed:", error);
          Utils.showError(
            "Image upload failed, but venue will be saved without image.",
            messagesDiv.id
          );
        }
      }

      // Geocode address if lat/lng not provided
      let latitude = parseFloat(formData.get("latitude"));
      let longitude = parseFloat(formData.get("longitude"));

      if (!latitude || !longitude) {
        const address = formData.get("address");
        if (address) {
          try {
            const geocoded = await MapService.geocodeAddress(address);
            if (geocoded) {
              latitude = geocoded.lat;
              longitude = geocoded.lng;
            }
          } catch (error) {
            console.error("Geocoding failed:", error);
          }
        }
      }

      const venueData = {
        venueID: venueID,
        name: formData.get("name"),
        address: formData.get("address"),
        description: formData.get("description") || null,
        capacity: formData.get("capacity") ? parseInt(formData.get("capacity")) : null,
        type: formData.get("type") || null,
        latitude: latitude || null,
        longitude: longitude || null,
        imageUrl: imageUrl,
      };

      console.log("�️ CRITICAL: Venue data being saved with imageUrl field:", {
        venueID: venueData.venueID,
        name: venueData.name,
        imageUrl: venueData.imageUrl,
        expectedS3Pattern: `venues_${venueID}_*.jpg`,
        NOTE: "Database MUST have imageUrl column in Venues table!"
      });

      // Ensure imageUrl is properly formatted for database storage
      if (venueData.imageUrl && !venueData.imageUrl.startsWith('http')) {
        // Store the S3 key pattern that matches uploaded files
        if (venueData.imageUrl.includes('venues_')) {
          console.log("✅ Using correlated S3 filename pattern:", venueData.imageUrl);
        } else {
          console.log("⚠️ ImageUrl doesn't follow correlation pattern:", venueData.imageUrl);
        }
      }

      const url = this.editingVenue
        ? CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES, this.editingVenue.venueID)
        : CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES);

      const method = this.editingVenue ? "PUT" : "POST";

      const response = await Utils.apiCall(url, {
        method: method,
        headers: CONFIG.getAuthHeaders(),
        body: JSON.stringify(venueData),
      });

      Utils.showSuccess(
        this.editingVenue ? "Venue updated successfully!" : "Venue created successfully!",
        messagesDiv.id
      );

      // Reload data and re-render
      await this.loadAllData();
      this.applyFilters();
      this.render();

      // Check if we need to return to events page
      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = urlParams.get('returnTo');
      
      if (returnTo === 'events' && !this.editingVenue) {
        // Return to events page with the new venue ID
        setTimeout(() => {
          window.location.href = `events.html?returnFrom=venues&venueId=${venueData.venueID}`;
        }, 2000);
      } else {
        // Close modal after a delay
        setTimeout(() => {
          this.closeModal();
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to save venue:", error);
      Utils.showError(
        error.message || "Failed to save venue",
        messagesDiv.id
      );
    } finally {
      Utils.hideLoading(
        submitBtn,
        this.editingVenue ? "Update Venue" : "Add Venue"
      );
    }
  },

  // Delete venue
  deleteVenue: async function (venueId) {
    const venue = this.venues.find(v => v.venueID.toString() === venueId.toString());
    if (!venue) return;

    if (!confirm(`Are you sure you want to delete "${venue.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const url = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES, venueId);
      await Utils.apiCall(url, {
        method: "DELETE",
        headers: CONFIG.getAuthHeaders(),
      });

      Utils.showSuccess("Venue deleted successfully!");

      // Reload data and re-render
      await this.loadAllData();
      this.applyFilters();
      this.render();
    } catch (error) {
      console.error("Failed to delete venue:", error);
      Utils.showError(error.message || "Failed to delete venue");
    }
  },

  // Show venue details in modal
  showVenueDetails: function (venueId) {
    const venue = this.venues.find(v => v.venueID.toString() === venueId.toString());
    if (!venue) return;

    const modal = document.getElementById("venue-details-modal");
    const content = document.getElementById("venue-details-content");

    if (!modal || !content) return;

    // Enhanced image URL handling for venue details
    let imageUrl = "/api/placeholder/600/300";
    if (venue.imageUrl) {
      console.log("🖼️ Processing venue details image URL:", venue.imageUrl, "for venue:", venue.venueID);
      
      if (venue.imageUrl.startsWith('http')) {
        // Already a full URL from database
        imageUrl = venue.imageUrl;
      } else if (venue.imageUrl.includes('venues_')) {
        // Handle correlated filename pattern: venues_VENUEID_timestamp.ext
        if (venue.imageUrl.startsWith('venues/')) {
          // S3 path format
          imageUrl = `https://local-gigs-static.s3.us-east-1.amazonaws.com/${venue.imageUrl}`;
        } else {
          // Just filename, add full S3 path
          imageUrl = `https://local-gigs-static.s3.us-east-1.amazonaws.com/venues/${venue.imageUrl}`;
        }
      }
      
      console.log("✅ Final image URL for venue details:", imageUrl);
    }

    const capacity = venue.capacity || 0;
    const capacityText = capacity > 0 ? capacity.toLocaleString() : "Not specified";

    content.innerHTML = `
      <div style="text-align: center; margin-bottom: 2rem;">
        <img src="${imageUrl}" alt="${Utils.sanitizeInput(venue.name)}"
             style="width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px;"
             onerror="this.style.display='none'">
        <h2 style="margin: 1rem 0 0.5rem 0;">${Utils.sanitizeInput(venue.name)}</h2>
        ${venue.type ? `<span class="type-badge" style="font-size: 1rem; padding: 0.5rem 1rem;">${Utils.capitalize(venue.type.replace('-', ' '))}</span>` : ""}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <h4 style="margin: 0 0 0.5rem 0; color: #333;">📍 Address</h4>
          <p style="margin: 0; color: #666;">${Utils.sanitizeInput(venue.address)}</p>
        </div>
        <div>
          <h4 style="margin: 0 0 0.5rem 0; color: #333;">👥 Capacity</h4>
          <p style="margin: 0; color: #666;">${capacityText}</p>
        </div>
      </div>

      ${venue.description ? `
        <div style="margin-bottom: 1.5rem;">
          <h4 style="margin: 0 0 0.5rem 0; color: #333;">About This Venue</h4>
          <p style="margin: 0; color: #666; line-height: 1.6;">${Utils.sanitizeInput(venue.description)}</p>
        </div>
      ` : ""}

      <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
        ${venue.latitude && venue.longitude ? `
          <button onclick="MapService.showDirections(${venue.latitude}, ${venue.longitude}, '${Utils.sanitizeInput(venue.name).replace(/'/g, "\\'")}')" class="btn">
            Get Directions
          </button>
        ` : ""}
        <button onclick="VenuesPage.openEditModal('${venue.venueID}')" class="btn btn-secondary">
          Edit Venue
        </button>
        <button onclick="Utils.copyToClipboard(window.location.href + '?venue=${venue.venueID}')" class="btn btn-secondary">
          Share Venue
        </button>
      </div>
    `;

    modal.style.display = "block";
  },

  // Get current location for venue
  getCurrentLocationForVenue: async function () {
    const latInput = document.getElementById("venueLatitude");
    const lngInput = document.getElementById("venueLongitude");
    const btn = document.getElementById("get-location-btn");

    try {
      Utils.showLoading(btn, "Getting location...");

      const location = await Utils.getCurrentLocation();

      if (latInput) latInput.value = location.lat.toFixed(6);
      if (lngInput) lngInput.value = location.lng.toFixed(6);

      Utils.showSuccess("Location retrieved successfully!");
    } catch (error) {
      console.error("Failed to get location:", error);
      Utils.showError("Could not get your location. Please enter coordinates manually.");
    } finally {
      Utils.hideLoading(btn, "Get My Current Location");
    }
  },

  // Geocode venue address to get coordinates
  geocodeVenueAddress: async function () {
    const addressInput = document.getElementById("venueAddress");
    const latInput = document.getElementById("venueLatitude");
    const lngInput = document.getElementById("venueLongitude");
    const btn = document.getElementById("geocode-btn");

    if (!addressInput || !addressInput.value.trim()) {
      Utils.showError("Please enter an address first.");
      return;
    }

    try {
      Utils.showLoading(btn, "Finding location...");

      const result = await MapService.geocodeAddress(addressInput.value.trim());

      if (result && result.lat && result.lng) {
        if (latInput) latInput.value = result.lat.toFixed(6);
        if (lngInput) lngInput.value = result.lng.toFixed(6);
        Utils.showSuccess("Coordinates found successfully!");
      } else {
        Utils.showError("Could not find coordinates for this address.");
      }
    } catch (error) {
      console.error("Geocoding failed:", error);
      Utils.showError("Failed to find coordinates for this address.");
    } finally {
      Utils.hideLoading(btn, "Get Coordinates from Address");
    }
  },

  // Toggle to map view
  toggleMapView: function () {
    this.isMapView = true;
    document.getElementById("map-container-wrapper").style.display = "block";
    document.getElementById("venues-list-wrapper").style.display = "none";
    
    // Trigger map resize after container is visible
    setTimeout(() => {
      if (MapService.map) {
        MapService.map.resize();
      }
    }, 100);
    
    this.render();
  },

  // Toggle to list view
  toggleListView: function () {
    this.isMapView = false;
    document.getElementById("map-container-wrapper").style.display = "none";
    document.getElementById("venues-list-wrapper").style.display = "block";
    this.render();
  },

  // Update venues count display
  updateVenuesCount: function () {
    const countElement = document.getElementById("venues-count");
    if (countElement) {
      countElement.textContent = this.filteredVenues.length;
    }
  },

  // Update pagination controls
  updatePagination: function () {
    const totalPages = Math.ceil(this.filteredVenues.length / this.itemsPerPage);
    const paginationDiv = document.getElementById("pagination");
    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");
    const pageInfo = document.getElementById("page-info");

    if (!paginationDiv || totalPages <= 1) {
      if (paginationDiv) paginationDiv.style.display = "none";
      return;
    }

    paginationDiv.style.display = "block";

    if (prevBtn) {
      prevBtn.disabled = this.currentPage <= 1;
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= totalPages;
    }

    if (pageInfo) {
      pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
    }
  },

  // Interactive Map Functions for Venue Location Selection
  venueLocationMap: null,
  selectedLocationMarker: null,

  // Initialize the venue creation map with search functionality
  initializeVenueLocationMap: async function() {
    try {
      console.log("🗺️ Initializing venue creation map...");
      
      // Check if container exists
      const container = document.getElementById("venue-location-map");
      if (!container) {
        console.error("❌ Map container 'venue-location-map' not found!");
        return;
      }
      
      console.log("✅ Map container found, initializing AWS map...");
      
      // Initialize AWS venue map
      this.venueLocationMap = await MapService.initializeVenueMap("venue-location-map");
      
      if (!this.venueLocationMap) {
        console.error("❌ Failed to initialize venue map - null returned");
        return;
      }
      
      console.log("✅ AWS map initialized, setting up location search...");
      
      // Set up location search functionality
      this.setupLocationSearch();
      
      console.log("✅ Location search setup complete, enabling location picker...");
      
      // Enable location picker
      MapService.enableVenueLocationPicker(this.venueLocationMap, (locationResult, marker) => {
        this.handleLocationSelected(locationResult, marker);
      });

      console.log("✅ Venue creation map initialized successfully with all features!");
    } catch (error) {
      console.error("❌ Failed to initialize venue creation map:", error);
      this.showMapError(`Map initialization failed: ${error.message}`);
    }
  },

  // Setup location search with autocomplete
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
      
      // Hide results if query too short
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

  // Display search results with modern styling
  displaySearchResults: function(results) {
    const searchResults = document.getElementById('search-results');
    if (!searchResults) return;

    if (results.length === 0) {
      searchResults.style.display = 'none';
      return;
    }

    searchResults.innerHTML = results.map(result => `
      <div class="search-result-item" onclick="VenuesPage.selectSearchResult('${JSON.stringify(result).replace(/'/g, "&#39;")}')">
        <div class="result-label">${result.label}</div>
        <div class="result-country">${result.country || ''} ${result.region || ''}</div>
      </div>
    `).join('');

    searchResults.style.display = 'block';
  },

  // Handle search result selection
  selectSearchResult: function(resultJson) {
    try {
      const result = JSON.parse(resultJson.replace(/&#39;/g, "'"));
      
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
        
        // Add marker
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

  // Handle location selection from map or search with enhanced visuals
  handleLocationSelected: function(locationResult, marker = null) {
    console.log("📍 Location selected for venue:", locationResult);
    
    // Remove previous marker and pulse effect
    if (this.selectedLocationMarker) {
      this.selectedLocationMarker.remove();
    }
    
    // Remove existing pulse effect
    if (this.venueLocationMap.getLayer('venue-location-pulse')) {
      this.venueLocationMap.removeLayer('venue-location-pulse');
      this.venueLocationMap.removeSource('venue-location-pulse');
    }
    
    // Add enhanced marker if not provided
    if (!marker && this.venueLocationMap) {
      marker = new window.maplibregl.Marker({ 
        color: '#22c55e',
        scale: 1.3
      })
      .setLngLat(locationResult.coordinates)
      .addTo(this.venueLocationMap);
    }
    
    this.selectedLocationMarker = marker;
    
    // Enhanced map animation to selected location
    this.venueLocationMap.flyTo({
      center: locationResult.coordinates,
      zoom: 16,
      speed: 1.5,
      curve: 1.42,
      essential: true
    });
    
    // Add pulsing effect around the location
    setTimeout(() => {
      this.addLocationPulseEffect(locationResult.lng, locationResult.lat);
    }, 1000);
    
    // Update form fields
    const latInput = document.getElementById('venueLatitude') || document.getElementById('latitude');
    const lngInput = document.getElementById('venueLongitude') || document.getElementById('longitude'); 
    const addressInput = document.getElementById('venueAddress') || document.getElementById('address');
    
    if (latInput) latInput.value = locationResult.lat;
    if (lngInput) lngInput.value = locationResult.lng;
    if (addressInput) addressInput.value = locationResult.address;
    
    // Update search input if it exists
    const searchInput = document.getElementById('location-search');
    if (searchInput && !searchInput.value) {
      searchInput.value = locationResult.address;
    }
    
    // Show enhanced confirmation with animation
    this.showLocationConfirmation(locationResult);
  },

  // Show enhanced location confirmation with beautiful UI
  showLocationConfirmation: function(locationResult) {
    const confirmationDiv = document.getElementById('location-confirmation');
    if (confirmationDiv) {
      confirmationDiv.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 2px solid #22c55e;
          border-radius: 16px;
          padding: 24px;
          margin-top: 16px;
          color: #15803d;
          animation: slideInUp 0.6s ease-out;
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.15);
        ">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="
              background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
              color: white;
              border-radius: 50%;
              width: 56px;
              height: 56px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              box-shadow: 0 6px 20px rgba(34, 197, 94, 0.3);
              animation: bounce 2s infinite;
            ">📍</div>
            <div style="flex: 1;">
              <div style="font-weight: 700; margin-bottom: 8px; font-size: 1.2rem; color: #15803d;">
                🎉 Perfect Location Selected!
              </div>
              <div style="font-size: 1rem; margin-bottom: 8px; color: #166534; font-weight: 500;">
                ${locationResult.address}
              </div>
              <div style="
                font-family: 'Courier New', monospace; 
                font-size: 0.85rem; 
                color: #166534; 
                opacity: 0.8;
                background: rgba(255, 255, 255, 0.6);
                padding: 6px 12px;
                border-radius: 8px;
                display: inline-block;
                border-left: 3px solid #22c55e;
              ">
                📐 ${locationResult.lat.toFixed(6)}, ${locationResult.lng.toFixed(6)}
              </div>
            </div>
          </div>
          <div style="
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(34, 197, 94, 0.3);
            text-align: center;
          ">
            <div style="
              background: rgba(34, 197, 94, 0.1);
              border-radius: 12px;
              padding: 12px 20px;
              color: #15803d;
              font-size: 0.95rem;
              font-weight: 600;
            ">
              ✨ Excellent! Your venue location is now set and ready to go!
            </div>
          </div>
        </div>
      `;
      confirmationDiv.style.display = 'block';
      
      // Add animations
      this.addLocationAnimations();
    }
  },

  // Enable location picker manually
  enableLocationPicker: function() {
    if (this.venueLocationMap) {
      console.log("🖱️ Enabling manual location picker");
      MapService.enableVenueLocationPicker(this.venueLocationMap, (locationResult, marker) => {
        this.handleLocationSelected(locationResult, marker);
      });
    } else {
      console.error("❌ Map not initialized");
    }
  },

  // Get current location
  getCurrentLocation: async function() {
    try {
      console.log("📱 Getting current location...");
      
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation is not supported by this browser"));
          return;
        }
        
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });
      
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      console.log("📍 Current location:", { lat, lng });
      
      // Reverse geocode to get address
      const locationInfo = await MapService.reverseGeocode(lng, lat);
      
      const locationResult = {
        coordinates: [lng, lat],
        lat: lat,
        lng: lng,
        address: locationInfo ? (locationInfo.Place?.Label || 'Current location') : 'Current location',
        country: locationInfo ? locationInfo.Place?.Country : null,
        region: locationInfo ? locationInfo.Place?.Region : null
      };
      
      // Fly to location and add marker
      if (this.venueLocationMap) {
        this.venueLocationMap.flyTo({
          center: [lng, lat],
          zoom: 15
        });
        
        this.handleLocationSelected(locationResult);
      }
      
    } catch (error) {
      console.error("❌ Failed to get current location:", error);
      alert("Unable to get your current location. Please try searching for your location or clicking on the map.");
    }
  },

  // Show map error with modern styling
  showMapError: function(message) {
    const mapContainer = document.getElementById('venue-location-map');
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div style="
          display: flex; 
          align-items: center; 
          justify-content: center; 
          height: 100%; 
          color: #dc3545; 
          background: linear-gradient(135deg, #fdf2f2 0%, #fef2f2 100%);
          border: 2px solid #f87171;
          border-radius: 12px;
        ">
          <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.8;">❌</div>
            <p style="margin: 0 0 1rem 0; font-weight: 600; color: #991b1b; font-size: 1.1rem;">${message}</p>
            <button 
              onclick="VenuesPage.initializeVenueLocationMap()" 
              style="
                padding: 12px 20px; 
                background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); 
                color: white; 
                border: none; 
                border-radius: 8px; 
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s ease;
              "
              onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(220,38,38,0.4)'"
              onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
            >
              🔄 Retry Loading Map
            </button>
          </div>
        </div>
      `;
    }
  },

  // Create a separate map instance for venue location selection
  createVenueLocationMap: async function() {
    const apiKey = CONFIG.LOCATION.API_KEY;
    const region = CONFIG.LOCATION.REGION;
    const style = "Standard";
    const colorScheme = "Light";

    const styleUrl = `https://maps.geo.${region}.amazonaws.com/v2/styles/${style}/descriptor?key=${apiKey}&color-scheme=${colorScheme}`;

    this.venueLocationMap = new maplibregl.Map({
      container: "venue-location-map",
      style: styleUrl,
      center: [CONFIG.APP.DEFAULT_COORDINATES.LNG, CONFIG.APP.DEFAULT_COORDINATES.LAT],
      zoom: CONFIG.APP.MAP_ZOOM
    });

    // Add navigation controls
    this.venueLocationMap.addControl(new maplibregl.NavigationControl(), "top-left");

    // Wait for map to load
    await new Promise((resolve) => {
      this.venueLocationMap.on("load", resolve);
    });
  },

  // Enable location picker mode
  enableVenueLocationPicker: function() {
    if (!this.venueLocationMap) {
      console.error("Map not initialized");
      return;
    }

    console.log("📍 Enabling location picker mode");
    
    // Update button state
    const btn = document.getElementById("enable-location-picker-btn");
    if (btn) {
      btn.textContent = "🎯 Click on the map to select location";
      btn.style.background = "#28a745";
    }

    // Change cursor
    this.venueLocationMap.getCanvas().style.cursor = 'crosshair';

    // Add click handler
    const clickHandler = async (e) => {
      const { lng, lat } = e.lngLat;
      console.log("📍 Location selected:", { lng, lat });

      try {
        // Remove previous marker
        if (this.selectedLocationMarker) {
          this.selectedLocationMarker.remove();
        }

        // Add new marker
        this.selectedLocationMarker = new maplibregl.Marker({ color: '#ff6b6b' })
          .setLngLat([lng, lat])
          .addTo(this.venueLocationMap);

        // Try to reverse geocode to get address
        let address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        try {
          if (window.MapService && window.MapService.reverseGeocode) {
            const locationInfo = await window.MapService.reverseGeocode(lng, lat);
            if (locationInfo && locationInfo.Place && locationInfo.Place.Label) {
              address = locationInfo.Place.Label;
            }
          }
        } catch (geocodeError) {
          console.warn("Reverse geocoding failed:", geocodeError);
        }

        // Update form fields
        this.updateVenueLocationFields(lat, lng, address);

        // Show selected location info
        this.showSelectedLocationInfo(address, lat, lng);

        // Reset button and cursor
        if (btn) {
          btn.textContent = "✅ Location Selected - Click again to change";
          btn.style.background = "#007cbf";
        }
        this.venueLocationMap.getCanvas().style.cursor = '';

        // Remove click handler
        this.venueLocationMap.off('click', clickHandler);

      } catch (error) {
        console.error("❌ Error processing location selection:", error);
        Utils.showError("Failed to process location selection. Please try again.");
      }
    };

    // Add click handler
    this.venueLocationMap.on('click', clickHandler);
  },

  // Use current location for venue
  useCurrentLocationForVenue: async function() {
    try {
      console.log("📱 Getting current location...");
      const btn = document.getElementById("get-current-location-btn");
      if (btn) {
        btn.textContent = "📱 Getting location...";
        btn.disabled = true;
      }

      // Get current position
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Remove previous marker
      if (this.selectedLocationMarker) {
        this.selectedLocationMarker.remove();
      }

      // Add enhanced marker at current location
      this.selectedLocationMarker = new maplibregl.Marker({ 
        color: '#3b82f6',
        scale: 1.4 
      })
        .setLngLat([lng, lat])
        .addTo(this.venueLocationMap);

      // Enhanced fly animation to current location
      this.venueLocationMap.flyTo({
        center: [lng, lat],
        zoom: 16,
        speed: 1.5,
        curve: 1.42,
        essential: true
      });

      // Add pulsing effect for current location
      setTimeout(() => {
        this.addLocationPulseEffect(lng, lat);
      }, 1000);

      // Try to reverse geocode
      let address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      try {
        if (window.MapService && window.MapService.reverseGeocode) {
          const locationInfo = await window.MapService.reverseGeocode(lng, lat);
          if (locationInfo && locationInfo.Place && locationInfo.Place.Label) {
            address = locationInfo.Place.Label;
          }
        }
      } catch (geocodeError) {
        console.warn("Reverse geocoding failed:", geocodeError);
      }

      // Update form fields
      this.updateVenueLocationFields(lat, lng, address);

      // Show selected location info
      this.showSelectedLocationInfo(address, lat, lng);

      console.log("✅ Current location set for venue");

    } catch (error) {
      console.error("❌ Failed to get current location:", error);
      Utils.showError("Failed to get current location. Please check location permissions.");
    } finally {
      const btn = document.getElementById("get-current-location-btn");
      if (btn) {
        btn.textContent = "📱 Use My Current Location";
        btn.disabled = false;
      }
    }
  },

  // Search and select location
  searchAndSelectLocation: async function() {
    const searchInput = document.getElementById("location-search");
    const searchBtn = document.getElementById("search-location-btn");
    
    if (!searchInput || !searchInput.value.trim()) {
      Utils.showError("Please enter a location to search for.");
      return;
    }

    const query = searchInput.value.trim();

    try {
      console.log("🔍 Searching for location:", query);
      
      if (searchBtn) {
        searchBtn.textContent = "Searching...";
        searchBtn.disabled = true;
      }

      // Use direct geocoding API call (working endpoint)
      const geocodeEndpoint = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.GEOCODE);
      
      const requestBody = {
        address: query.trim() + ", Singapore",
        maxResults: 1,
        biasPosition: [103.8198, 1.3521]
      };

      console.log("🔍 Direct geocoding request:", { url: geocodeEndpoint, body: requestBody });

      const response = await Utils.apiCall(geocodeEndpoint, {
        method: 'POST',
        headers: {
          ...CONFIG.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log("📍 Geocoding response:", response);

      if (response && response.latitude && response.longitude) {
        const lng = response.longitude;
        const lat = response.latitude;
        const address = response.formatted || response.address || query + ", Singapore";

        // Remove previous marker
        if (this.selectedLocationMarker) {
          this.selectedLocationMarker.remove();
        }

        // Add marker at search result with enhanced styling
        this.selectedLocationMarker = new maplibregl.Marker({ 
          color: '#22c55e', 
          scale: 1.3 
        })
          .setLngLat([lng, lat])
          .addTo(this.venueLocationMap);

        // Enhanced fly animation to search result
        this.venueLocationMap.flyTo({
          center: [lng, lat],
          zoom: 16,
          speed: 1.5,
          curve: 1.42,
          essential: true
        });

        // Add pulsing animation to marker area
        this.addLocationPulseEffect(lng, lat);

        // Update form fields
        this.updateVenueLocationFields(lat, lng, address);

        // Show selected location info
        this.showSelectedLocationInfo(address, lat, lng);

        console.log("✅ Location found and selected:", address);
      } else {
        Utils.showError("No location found for that search. Please try a different search term.");
      }

    } catch (error) {
      console.error("❌ Location search failed:", error);
      Utils.showError("Location search failed. Please try again.");
    } finally {
      if (searchBtn) {
        searchBtn.textContent = "Search";
        searchBtn.disabled = false;
      }
    }
  },

  // Update venue form location fields
  updateVenueLocationFields: function(lat, lng, address) {
    const latInput = document.getElementById("venueLatitude");
    const lngInput = document.getElementById("venueLongitude");
    const addressInput = document.getElementById("venueAddress");

    if (latInput) latInput.value = lat.toFixed(6);
    if (lngInput) lngInput.value = lng.toFixed(6);
    if (addressInput && !addressInput.value.trim()) {
      addressInput.value = address;
    }

    console.log("📝 Form fields updated:", { lat, lng, address });
  },

  // Show enhanced location confirmation with animations
  showSelectedLocationInfo: function(address, lat, lng) {
    const infoDiv = document.getElementById("selected-location-info");
    const textDiv = document.getElementById("selected-location-text");

    if (infoDiv && textDiv) {
      textDiv.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          border: 2px solid #22c55e;
          border-radius: 16px;
          padding: 20px;
          animation: slideInUp 0.5s ease-out;
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.15);
        ">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div style="
              background: #22c55e;
              color: white;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              animation: bounce 1s infinite;
            ">📍</div>
            <div>
              <div style="font-weight: 700; color: #15803d; font-size: 1.1rem;">Location Selected!</div>
              <div style="color: #166534; font-size: 0.9rem; opacity: 0.8;">Perfect! Your venue location is set.</div>
            </div>
          </div>
          <div style="
            background: rgba(255, 255, 255, 0.7);
            border-radius: 12px;
            padding: 16px;
            border-left: 4px solid #22c55e;
          ">
            <div style="font-weight: 600; color: #15803d; margin-bottom: 8px;">${address}</div>
            <div style="font-family: monospace; font-size: 0.85rem; color: #166534; opacity: 0.8;">
              📐 ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
          </div>
          <div style="
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid rgba(34, 197, 94, 0.3);
            text-align: center;
          ">
            <div style="color: #15803d; font-size: 0.9rem; font-weight: 500;">
              ✨ Great choice! You can now continue creating your venue.
            </div>
          </div>
        </div>
      `;
      infoDiv.style.display = "block";
      
      // Add CSS animations if not already present
      this.addLocationAnimations();
    }
  },

  // Add location pulse effect to map
  addLocationPulseEffect: function(lng, lat) {
    // Remove existing pulse layer if it exists
    if (this.venueLocationMap.getLayer('venue-location-pulse')) {
      this.venueLocationMap.removeLayer('venue-location-pulse');
      this.venueLocationMap.removeSource('venue-location-pulse');
    }

    // Add pulsing circle around the selected location
    this.venueLocationMap.addSource('venue-location-pulse', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          }
        }]
      }
    });

    this.venueLocationMap.addLayer({
      id: 'venue-location-pulse',
      type: 'circle',
      source: 'venue-location-pulse',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 8,
          16, 20
        ],
        'circle-color': '#22c55e',
        'circle-opacity': 0.3,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#22c55e',
        'circle-stroke-opacity': 0.8
      }
    });

    // Animate the pulse
    let pulseRadius = 20;
    const animatePulse = () => {
      pulseRadius = pulseRadius === 20 ? 35 : 20;
      this.venueLocationMap.setPaintProperty('venue-location-pulse', 'circle-radius', [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, pulseRadius * 0.4,
        16, pulseRadius
      ]);
    };

    // Pulse every 1.5 seconds
    const pulseInterval = setInterval(animatePulse, 1500);
    
    // Clear interval after 10 seconds
    setTimeout(() => {
      clearInterval(pulseInterval);
    }, 10000);
  },

  // Add CSS animations for location UI
  addLocationAnimations: function() {
    // Check if animations are already added
    if (document.getElementById('venue-location-animations')) return;

    const style = document.createElement('style');
    style.id = 'venue-location-animations';
    style.textContent = `
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% {
          transform: translateY(0);
        }
        40% {
          transform: translateY(-8px);
        }
        60% {
          transform: translateY(-4px);
        }
      }

      @keyframes fadeInScale {
        from {
          opacity: 0;
          transform: scale(0.8);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .location-search-container {
        animation: fadeInScale 0.6s ease-out;
      }

      .venue-card {
        transition: all 0.3s ease;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .venue-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
      }

      .venue-card-image {
        transition: transform 0.3s ease;
      }

      .venue-card:hover .venue-card-image {
        transform: scale(1.05);
      }

      .capacity-badge {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
        display: inline-block;
        margin: 2px;
        box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
      }

      .type-badge {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
        display: inline-block;
        margin: 2px;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
      }

      .btn {
        transition: all 0.2s ease;
        border-radius: 8px;
        font-weight: 600;
        padding: 10px 20px;
        border: none;
        cursor: pointer;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }

      .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
      }

      .btn:active {
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  },

  // Clear selected location info
  clearSelectedLocationInfo: function() {
    const infoDiv = document.getElementById("selected-location-info");
    if (infoDiv) {
      infoDiv.style.display = "none";
    }

    // Clear any existing marker
    if (this.selectedLocationMarker) {
      this.selectedLocationMarker.remove();
      this.selectedLocationMarker = null;
    }

    // Reset location picker button
    const btn = document.getElementById("enable-location-picker-btn");
    if (btn) {
      btn.textContent = "📍 Click on Map to Select Location";
      btn.style.background = "#007cbf";
    }
  },

  // Navigate to venue details page
  goToVenueDetails: function(venueId) {
    if (venueId) {
      window.location.href = `venue-details.html?id=${venueId}`;
    }
  },

  // Show map error message
  showMapError: function(message) {
    const mapContainer = document.getElementById("venue-location-map");
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; color: #6c757d; text-align: center; padding: 2rem;">
          <div style="font-size: 2rem; margin-bottom: 1rem;">🗺️</div>
          <h4 style="margin: 0 0 1rem 0; color: #495057;">Map Error</h4>
          <p style="margin: 0; max-width: 300px; line-height: 1.5;">${message}</p>
        </div>
      `;
    }
  },
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  VenuesPage.init();
});