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
            const searchTerm = document.getElementById("search-input") ? .value.toLowerCase() || "";
            const capacityFilter = document.getElementById("capacity-filter") ? .value || "";
            const locationFilter = document.getElementById("location-filter") ? .value.toLowerCase() || "";
            const sortBy = document.getElementById("sort-select") ? .value || "name-asc";

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
            if (capacityFilter) {
                filtered = filtered.filter((venue) => {
                    if (!venue.capacity) return capacityFilter === "small"; // Assume small if no capacity
                    const capacity = parseInt(venue.capacity);
                    switch (capacityFilter) {
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
            if (locationFilter) {
                filtered = filtered.filter((venue) =>
                    venue.address.toLowerCase().includes(locationFilter)
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

            // Add venue markers to map
            if (this.mapInitialized && this.filteredVenues.length > 0) {
                MapService.addVenueMarkers(this.filteredVenues);
            }
        },

        // Create HTML for venue card
        createVenueCard: function(venue) {
                const capacity = venue.capacity || 0;
                const capacityClass = capacity <= 500 ? "small" : capacity <= 2000 ? "medium" : "large";
                const capacityText = capacity > 0 ? capacity.toLocaleString() : "Not specified";
                const imageUrl = venue.imageUrl || "/api/placeholder/350/180";

                return `
      <div class="venue-card" data-venue-id="${venue.venueID}">
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
              <button class="btn btn-secondary view-details-btn" data-venue-id="${venue.venueID}">
                View Details
              </button>
              <button class="edit-btn" data-venue-id="${venue.venueID}">
                Edit
              </button>
              <button class="delete-btn" data-venue-id="${venue.venueID}">
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

    modal.style.display = "block";
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
      let imageUrl = this.editingVenue?.imageUrl || null;

      // Handle image upload if present
      const imageFile = formData.get("image");
      if (imageFile && imageFile.size > 0) {
        try {
          imageUrl = await Utils.uploadImage(imageFile, "venues");
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
        venueID: this.editingVenue ? this.editingVenue.venueID : CONFIG.generateVenueID(),
        name: formData.get("name"),
        address: formData.get("address"),
        description: formData.get("description") || null,
        capacity: formData.get("capacity") ? parseInt(formData.get("capacity")) : null,
        type: formData.get("type") || null,
        latitude: latitude || null,
        longitude: longitude || null,
        imageUrl: imageUrl,
      };

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

      // Close modal after a delay
      setTimeout(() => {
        this.closeModal();
      }, 2000);
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

    const imageUrl = venue.imageUrl || "/api/placeholder/600/300";
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
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  VenuesPage.init();
});