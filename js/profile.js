const ProfilePage = {
  currentUser: null,
  userProfile: null,
  editingProfile: false,
  maxGenres: 3,
  eventListenersAttached: false,

  init: async function () {
    console.log("Initializing profile page...");

    console.log("Checking authentication...");
    if (!Utils.requireAuth()) {
      console.error("❌ Authentication check failed");
      return;
    }
    console.log("Authentication check passed");

    console.log("Getting user from token...");
    this.currentUser = Utils.getUserFromToken();
    console.log(" Current user from token:", this.currentUser);

    if (!this.currentUser) {
      console.error("❌ No current user found, logging out");
      Utils.logout();
      return;
    }
    console.log("Current user found:", this.currentUser.email);

    console.log("Setting up event listeners...");
    this.setupEventListeners();

    console.log("Loading user profile data...");
    await this.loadUserProfile();
    console.log("User profile loaded:", this.userProfile);

    console.log("Loading activity data...");
    await this.loadActivityData();
    console.log("Activity data loaded");

    console.log("Rendering profile display...");
    this.renderProfile();

    console.log("Profile page initialized successfully");
  },

  setupEventListeners: function () {
    if (this.eventListenersAttached) {
      console.log("Event listeners already attached, skipping...");
      return;
    }

    console.log("Setting up profile page event listeners...");
    this.eventListenersAttached = true;

    const logoutBtn = document.getElementById("logout-button");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        Utils.logout();
      });
    }

    const editProfileBtn = document.getElementById("edit-profile-btn");
    const editProfileModal = document.getElementById("edit-profile-modal");
    const closeProfileModal = document.getElementById("close-profile-modal");
    const editProfileForm = document.getElementById("edit-profile-form");

    if (editProfileBtn && editProfileModal) {
      editProfileBtn.addEventListener("click", () => {
        this.openEditProfileModal();
      });
    }

    if (closeProfileModal && editProfileModal) {
      closeProfileModal.addEventListener("click", () => {
        editProfileModal.style.display = "none";
      });
    }

    if (editProfileForm) {
      editProfileForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleProfileUpdate(e);
      });
    }

    const editPreferencesBtn = document.getElementById("edit-preferences-btn");
    const editPreferencesModal = document.getElementById(
      "edit-preferences-modal",
    );
    const closePreferencesModal = document.getElementById(
      "close-preferences-modal",
    );
    const editPreferencesForm = document.getElementById(
      "edit-preferences-form",
    );

    if (editPreferencesBtn && editPreferencesModal) {
      editPreferencesBtn.addEventListener("click", () => {
        this.openEditPreferencesModal();
      });
    }

    if (closePreferencesModal && editPreferencesModal) {
      closePreferencesModal.addEventListener("click", () => {
        editPreferencesModal.style.display = "none";
      });
    }

    if (editPreferencesForm) {
      editPreferencesForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handlePreferencesUpdate(e);
      });

      const genreCheckboxes = editPreferencesForm.querySelectorAll(
        'input[name="genres"]',
      );
      genreCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          this.handleGenreSelection();
        });
      });
    }

    const changePasswordBtn = document.getElementById("change-password-btn");
    const changePasswordModal = document.getElementById(
      "change-password-modal",
    );
    const closePasswordModal = document.getElementById("close-password-modal");
    const changePasswordForm = document.getElementById("change-password-form");

    if (changePasswordBtn && changePasswordModal) {
      changePasswordBtn.addEventListener("click", () => {
        changePasswordModal.style.display = "block";
      });
    }

    if (closePasswordModal && changePasswordModal) {
      closePasswordModal.addEventListener("click", () => {
        changePasswordModal.style.display = "none";
      });
    }

    if (changePasswordForm) {
      changePasswordForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handlePasswordChange(e);
      });
    }

    const changePictureBtn = document.getElementById("change-picture-btn");
    const profilePictureModal = document.getElementById(
      "profile-picture-modal",
    );
    const closePictureModal = document.getElementById("close-picture-modal");
    const profilePictureForm = document.getElementById("profile-picture-form");
    const profilePictureFile = document.getElementById("profilePictureFile");

    if (changePictureBtn && profilePictureModal) {
      changePictureBtn.addEventListener("click", () => {
        profilePictureModal.style.display = "block";
      });
    }

    if (closePictureModal && profilePictureModal) {
      closePictureModal.addEventListener("click", () => {
        profilePictureModal.style.display = "none";
      });
    }

    if (profilePictureForm) {
      profilePictureForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleProfilePictureUpload(e);
      });
    }

    if (profilePictureFile) {
      profilePictureFile.addEventListener("change", (e) => {
        this.previewProfilePicture(e);
      });
    }

    const privacySettingsBtn = document.getElementById("privacy-settings-btn");
    const exportDataBtn = document.getElementById("export-data-btn");
    const deleteAccountBtn = document.getElementById("delete-account-btn");

    if (privacySettingsBtn) {
      privacySettingsBtn.addEventListener("click", () => {
        Utils.showError("Privacy settings feature coming soon!");
      });
    }

    if (exportDataBtn) {
      exportDataBtn.addEventListener("click", () => {
        this.exportUserData();
      });
    }

    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener("click", () => {
        this.handleDeleteAccount();
      });
    }

    window.addEventListener("click", (e) => {
      if (e.target === editProfileModal) {
        editProfileModal.style.display = "none";
      }
      if (e.target === editPreferencesModal) {
        editPreferencesModal.style.display = "none";
      }
      if (e.target === changePasswordModal) {
        changePasswordModal.style.display = "none";
      }
      if (e.target === profilePictureModal) {
        profilePictureModal.style.display = "none";
      }
    });
  },

  loadUserProfile: async function () {
    try {
      console.log("Loading user profile from backend...");
      console.log("User ID (sub):", this.currentUser.sub);

      const url = CONFIG.buildApiUrl(
        CONFIG.API.ENDPOINTS.USERS,
        this.currentUser.sub,
      );
      console.log("API URL:", url);
      console.log("Auth headers:", CONFIG.getAuthHeaders());

      this.userProfile = await Utils.apiCall(url, {
        method: "GET",
        headers: CONFIG.getAuthHeaders(),
      });

      if (
        this.userProfile &&
        this.userProfile.message &&
        typeof this.userProfile.message === "string"
      ) {
        try {
          console.log(" Unwrapping message response...");
          this.userProfile = JSON.parse(this.userProfile.message);
        } catch (parseError) {
          console.error("❌ Failed to parse wrapped message:", parseError);
        }
      }

      console.log(
        "User profile loaded successfully from backend:",
        this.userProfile,
      );
    } catch (error) {
      console.log("User profile not found in backend, using token data");
      console.log("Backend error:", error.message);

      this.userProfile = {
        userID: this.currentUser.sub,
        name: this.currentUser.email.split("@")[0],
        email: this.currentUser.email,
        preferences: {
          genres: [],
          emailNotifications: true,
          eventReminders: true,
          locationSuggestions: true,
        },
        createdAt: new Date().toISOString(),
      };
      console.log("Created fallback profile:", this.userProfile);
    }

    if (this.userProfile && !this.userProfile.userID) {
      console.log("Profile missing userID, adding it");
      this.userProfile.userID = this.currentUser.sub;
    }
  },
  loadActivityData: async function () {
    const joinedEventsCount = Utils.getJoinedEventsCount();
    const joinedEvents = Utils.getJoinedEvents();

    console.log("Loaded activity data:", {
      joinedEventsCount,
      joinedEvents: joinedEvents.slice(0, 3),
    });

    this.activityData = {
      eventsCreated: 0,
      eventsJoined: joinedEventsCount,
      venuesAdded: 0,
      daysActive: Math.floor(
        (new Date() - new Date(this.userProfile.createdAt)) /
          (1000 * 60 * 60 * 24),
      ),
      recentActivity: this.generateRecentActivity(joinedEvents),
    };

    try {
      const eventsUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.EVENTS);
      const events = await Utils.apiCall(eventsUrl, {
        method: "GET",
        headers: CONFIG.getAuthHeaders(),
      });

      const venuesUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.VENUES);
      const venues = await Utils.apiCall(venuesUrl, {
        method: "GET",
        headers: CONFIG.getAuthHeaders(),
      });

      this.activityData.eventsCreated = events.length;
      this.activityData.venuesAdded = venues.length;
    } catch (error) {
      console.log("Could not load activity data:", error);
    }
  },

  generateRecentActivity: function (joinedEvents) {
    const activities = [];

    const sortedEvents = joinedEvents
      .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
      .slice(0, 5);

    sortedEvents.forEach((event) => {
      activities.push({
        type: "joined",
        title: `Joined "${event.name}"`,
        time: event.joinedAt,
        icon: "🎟️",
        eventId: event.eventID,
      });
    });

    if (activities.length === 0) {
      activities.push({
        type: "joined",
        title: "Joined Local Gigs",
        time: this.userProfile.createdAt,
        icon: "🎉",
      });
    }

    return activities;
  },

  renderProfile: function () {
    console.log(" Starting profile render...");
    console.log("Profile data to render:", this.userProfile);

    const displayName = document.getElementById("display-name");
    const displayEmail = document.getElementById("display-email");
    const displayBio = document.getElementById("display-bio");
    const displayMemberSince = document.getElementById("display-member-since");
    const profilePicture = document.getElementById("profile-picture");

    const profileDisplayName = document.getElementById("profileDisplayName");
    const profileEmail = document.getElementById("profileEmail");
    const currentProfilePicture = document.getElementById(
      "currentProfilePicture",
    );
    const profilePicturePlaceholder = document.getElementById(
      "profilePicturePlaceholder",
    );
    const profileInitials = document.getElementById("profileInitials");

    console.log(" DOM elements found:", {
      displayName: !!displayName,
      displayEmail: !!displayEmail,
      displayBio: !!displayBio,
      displayMemberSince: !!displayMemberSince,
      profilePicture: !!profilePicture,
      profileDisplayName: !!profileDisplayName,
      profileEmail: !!profileEmail,
      currentProfilePicture: !!currentProfilePicture,
      profilePicturePlaceholder: !!profilePicturePlaceholder,
    });

    if (profileDisplayName) {
      profileDisplayName.textContent = this.userProfile.name || "User";
      console.log(
        "Header display name updated:",
        profileDisplayName.textContent,
      );
    }

    if (profileEmail) {
      profileEmail.textContent = this.userProfile.email || "";
      console.log("Header email updated:", profileEmail.textContent);
    }

    if (this.userProfile.profilePictureUrl) {
      if (currentProfilePicture) {
        currentProfilePicture.src = this.userProfile.profilePictureUrl;
        currentProfilePicture.style.display = "block";
        console.log(
          "Header profile picture updated:",
          this.userProfile.profilePictureUrl,
        );
      }
      if (profilePicturePlaceholder) {
        profilePicturePlaceholder.style.display = "none";
      }
    } else {
      if (currentProfilePicture) {
        currentProfilePicture.style.display = "none";
      }
      if (profilePicturePlaceholder) {
        profilePicturePlaceholder.style.display = "flex";
      }
      if (profileInitials && this.userProfile.name) {
        const initials = this.userProfile.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2);
        profileInitials.textContent = initials;
        console.log("Header initials updated:", initials);
      }
    }

    if (displayName) {
      displayName.textContent = this.userProfile.name || "No name set";
      console.log("Display name updated:", displayName.textContent);
    }

    if (displayEmail) {
      displayEmail.textContent = this.userProfile.email;
      console.log("Display email updated:", displayEmail.textContent);
    }

    if (displayBio) {
      if (this.userProfile.bio) {
        displayBio.textContent = this.userProfile.bio;
        displayBio.style.fontStyle = "normal";
        displayBio.style.color = "#333";
      } else {
        displayBio.textContent = "No bio added yet";
        displayBio.style.fontStyle = "italic";
        displayBio.style.color = "#666";
      }
      console.log("Display bio updated:", displayBio.textContent);
    }

    if (displayMemberSince) {
      const memberSince = new Date(this.userProfile.createdAt);
      displayMemberSince.textContent = memberSince.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      console.log(" Member since updated:", displayMemberSince.textContent);
    }

    if (profilePicture && this.userProfile.profilePictureUrl) {
      profilePicture.src = this.userProfile.profilePictureUrl;
      console.log(
        "Profile picture updated:",
        this.userProfile.profilePictureUrl,
      );
    }

    console.log("Rendering preferences...");
    this.renderPreferences();

    console.log("Rendering activity summary...");
    this.renderActivitySummary();

    console.log("Rendering recent activity...");
    this.renderRecentActivity();

    console.log("Rendering joined events...");
    this.renderJoinedEvents();

    console.log("Profile render completed successfully");
  },

  renderPreferences: function () {
    const favoriteGenres = document.getElementById("favorite-genres");
    const notificationsStatus = document.getElementById("notifications-status");
    const remindersStatus = document.getElementById("reminders-status");

    if (favoriteGenres) {
      if (
        this.userProfile.preferences &&
        this.userProfile.preferences.genres &&
        this.userProfile.preferences.genres.length > 0
      ) {
        favoriteGenres.innerHTML = this.userProfile.preferences.genres
          .map(
            (genre) =>
              `<span class="genre-tag">${Utils.capitalize(genre)}</span>`,
          )
          .join("");
      } else {
        favoriteGenres.innerHTML =
          '<span style="color: #666; font-style: italic;">No genres selected</span>';
      }
    }

    if (notificationsStatus) {
      notificationsStatus.textContent =
        this.userProfile.preferences &&
        this.userProfile.preferences.emailNotifications
          ? "Enabled"
          : "Disabled";
      notificationsStatus.style.color =
        this.userProfile.preferences &&
        this.userProfile.preferences.emailNotifications
          ? "#28a745"
          : "#dc3545";
    }

    if (remindersStatus) {
      remindersStatus.textContent =
        this.userProfile.preferences &&
        this.userProfile.preferences.eventReminders
          ? "Enabled"
          : "Disabled";
      remindersStatus.style.color =
        this.userProfile.preferences &&
        this.userProfile.preferences.eventReminders
          ? "#28a745"
          : "#dc3545";
    }
  },

  renderActivitySummary: function () {
    const eventsCreated = document.getElementById("events-created-count");
    const eventsJoined = document.getElementById("events-joined-count");
    const venuesAdded = document.getElementById("venues-added-count");
    const daysActive = document.getElementById("days-active");

    if (eventsCreated)
      eventsCreated.textContent = this.activityData.eventsCreated;
    if (eventsJoined) eventsJoined.textContent = this.activityData.eventsJoined;
    if (venuesAdded) venuesAdded.textContent = this.activityData.venuesAdded;
    if (daysActive)
      daysActive.textContent = Math.max(1, this.activityData.daysActive);
  },

  renderRecentActivity: function () {
    const recentActivity = document.getElementById("recent-activity");
    if (!recentActivity) return;

    if (this.activityData.recentActivity.length === 0) {
      recentActivity.innerHTML = `
        <div class="loading-placeholder">
          <p>No recent activity</p>
        </div>
      `;
      return;
    }

    recentActivity.innerHTML = this.activityData.recentActivity
      .map(
        (activity) => `
        <div class="activity-item">
          <div class="activity-icon">${activity.icon}</div>
          <div class="activity-content">
            <div class="activity-title">${activity.title}</div>
            <div class="activity-time">${Utils.formatDate(activity.time)}</div>
          </div>
        </div>
      `,
      )
      .join("");
  },

  renderJoinedEvents: function () {
    const joinedEventsList = document.getElementById("joined-events-list");
    if (!joinedEventsList) return;

    const joinedEvents = Utils.getJoinedEvents();

    if (joinedEvents.length === 0) {
      joinedEventsList.innerHTML = `
                <div class="loading-placeholder" style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🎪</div>
                    <p style="color: #666; margin: 0;">You haven't joined any events yet</p>
                    <p style="color: #999; font-size: 0.9rem; margin: 0.5rem 0 0 0;">
                        <a href="events.html" style="color: #007bff; text-decoration: none;">Browse events</a> to find something interesting!
                    </p>
                </div>
            `;
      return;
    }

    // Sort events by join date (most recent first)
    const sortedEvents = joinedEvents.sort(
      (a, b) => new Date(b.joinedAt) - new Date(a.joinedAt),
    );

    joinedEventsList.innerHTML = `
            <div style="margin-bottom: 1rem; color: #666; font-size: 0.9rem;">
                ${joinedEvents.length} event${joinedEvents.length !== 1 ? "s" : ""} joined
            </div>
            ${sortedEvents.map((event) => this.renderJoinedEventCard(event)).join("")}
        `;
  },

  renderJoinedEventCard: function (event) {
    const eventDate = new Date(`${event.eventDate}T${event.eventTime}`);
    const isUpcoming = eventDate >= new Date();
    const joinDate = new Date(event.joinedAt);

    return `
            <div class="joined-event-card" style="
                border: 1px solid #e9ecef;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1rem;
                background: ${isUpcoming ? "#f8fff8" : "#f8f9fa"};
                border-left: 4px solid ${isUpcoming ? "#28a745" : "#6c757d"};
                transition: all 0.3s ease;
                position: relative;
            ">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <h4 style="margin: 0; color: #333; font-size: 1.1rem; cursor: pointer;"
                        onclick="window.location.href='event-details.html?id=${event.eventID}'">${Utils.sanitizeInput(event.name)}</h4>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span style="
                            font-size: 0.8rem;
                            color: ${isUpcoming ? "#28a745" : "#6c757d"};
                            font-weight: 500;
                            padding: 2px 8px;
                            border-radius: 12px;
                            background: ${isUpcoming ? "#d4edda" : "#e9ecef"};
                        ">
                            ${isUpcoming ? "🟢 Upcoming" : "⚪ Past"}
                        </span>
                        ${
                          isUpcoming
                            ? `
                            <button onclick="ProfilePage.leaveEvent('${event.eventID}', '${Utils.sanitizeInput(event.name).replace(/'/g, "\\'")}'); event.stopPropagation();"
                                    style="
                                        background: #dc3545;
                                        color: white;
                                        border: none;
                                        padding: 0.25rem 0.5rem;
                                        border-radius: 4px;
                                        font-size: 0.8rem;
                                        cursor: pointer;
                                        transition: all 0.2s ease;
                                    "
                                    onmouseover="this.style.background='#c82333'"
                                    onmouseout="this.style.background='#dc3545'"
                                    title="Leave this event">
                                ❌ Leave
                            </button>
                        `
                            : ""
                        }
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.9rem; color: #666;">
                    <div>📅 ${Utils.formatDate(event.eventDate)}</div>
                    <div>🕐 ${Utils.formatTime(event.eventTime)}</div>
                </div>
                <div style="font-size: 0.8rem; color: #999; margin-top: 0.5rem;">
                    Joined ${Utils.formatDate(joinDate.toISOString().split("T")[0])}
                </div>
                ${
                  event.description
                    ? `
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: #666; line-height: 1.4; cursor: pointer;"
                       onclick="window.location.href='event-details.html?id=${event.eventID}'">
                        ${Utils.sanitizeInput(event.description).substring(0, 100)}${event.description.length > 100 ? "..." : ""}
                    </p>
                `
                    : ""
                }
                <div style="margin-top: 0.5rem;">
                    <button onclick="window.location.href='event-details.html?id=${event.eventID}'"
                            style="
                                background: #007bff;
                                color: white;
                                border: none;
                                padding: 0.5rem 1rem;
                                border-radius: 4px;
                                font-size: 0.9rem;
                                cursor: pointer;
                                transition: all 0.2s ease;
                            "
                            onmouseover="this.style.background='#0056b3'"
                            onmouseout="this.style.background='#007bff'">
                        📋 View Details
                    </button>
                </div>
            </div>
        `;
  },

  async leaveEvent(eventID, eventName) {
    if (!confirm(`Are you sure you want to leave "${eventName}"?`)) {
      return;
    }

    try {
      console.log("Leaving event:", eventID);

      const leaveButtons = document.querySelectorAll(
        `button[onclick*="${eventID}"]`,
      );
      leaveButtons.forEach((btn) => {
        if (btn.textContent.includes("Leave")) {
          btn.disabled = true;
          btn.textContent = "⏳ Leaving...";
        }
      });

      const success = await Utils.removeJoinedEvent(eventID);

      if (success) {
        Utils.showMessage(`Successfully left "${eventName}"!`, "success");

        this.renderJoinedEvents();

        await this.loadActivityData();
        this.renderActivitySummary();

        console.log("Successfully left event");
      } else {
        Utils.showMessage("Failed to leave event. Please try again.", "error");

        leaveButtons.forEach((btn) => {
          if (btn.textContent.includes("Leaving")) {
            btn.disabled = false;
            btn.textContent = "❌ Leave";
          }
        });
      }
    } catch (error) {
      console.error("❌ Failed to leave event:", error);
      Utils.showMessage("Failed to leave event. Please try again.", "error");

      const leaveButtons = document.querySelectorAll(
        `button[onclick*="${eventID}"]`,
      );
      leaveButtons.forEach((btn) => {
        if (btn.textContent.includes("Leaving")) {
          btn.disabled = false;
          btn.textContent = "❌ Leave";
        }
      });
    }
  },

  openEditProfileModal: function () {
    const modal = document.getElementById("edit-profile-modal");

    document.getElementById("profileName").value = this.userProfile.name || "";
    document.getElementById("profileBio").value = this.userProfile.bio || "";
    document.getElementById("profileLocation").value =
      this.userProfile.location || "";
    document.getElementById("profileWebsite").value =
      this.userProfile.website || "";

    modal.style.display = "block";
  },

  // Handle profile update
  handleProfileUpdate: async function (e) {
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const messagesDiv = document.getElementById("profile-modal-messages");

    try {
      Utils.showLoading(submitBtn, "Saving...");

      if (!this.userProfile) {
        console.log("No user profile found, creating one from current user");
        this.userProfile = {
          userID: this.currentUser.sub,
          name: this.currentUser.email.split("@")[0],
          email: this.currentUser.email,
          preferences: {
            genres: [],
            emailNotifications: true,
            eventReminders: true,
            locationSuggestions: true,
          },
          createdAt: new Date().toISOString(),
        };
      }

      if (!this.userProfile.userID) {
        console.log("No userID in profile, setting from current user");
        this.userProfile.userID = this.currentUser.sub;
      }

      const formData = new FormData(form);

      const profileData = {
        userID: this.userProfile.userID,
        name: formData.get("name") || this.userProfile.name,
        email: this.userProfile.email,
        bio: formData.get("bio") || this.userProfile.bio || null,
        location: formData.get("location") || this.userProfile.location || null,
        website: formData.get("website") || this.userProfile.website || null,
        preferences: this.userProfile.preferences || {},
        profilePictureUrl: this.userProfile.profilePictureUrl || null,
        createdAt: this.userProfile.createdAt || new Date().toISOString(),
      };

      const url = CONFIG.buildApiUrl(
        CONFIG.API.ENDPOINTS.USERS,
        this.userProfile.userID,
      );

      try {
        await Utils.apiCall(url, {
          method: "PUT",
          headers: CONFIG.getAuthHeaders(),
          body: JSON.stringify(profileData),
        });
      } catch (error) {
        if (error.message.includes("not found")) {
          const createUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.USERS);
          await Utils.apiCall(createUrl, {
            method: "POST",
            headers: CONFIG.getAuthHeaders(),
            body: JSON.stringify({
              userID: this.userProfile.userID,
              ...profileData,
            }),
          });
        } else {
          throw error;
        }
      }

      this.userProfile = { ...this.userProfile, ...profileData };

      localStorage.setItem(
        CONFIG.STORAGE_KEYS.USER_DATA,
        JSON.stringify(this.userProfile),
      );

      Utils.showSuccess("Profile updated successfully!", messagesDiv.id);

      this.renderProfile();

      setTimeout(() => {
        document.getElementById("edit-profile-modal").style.display = "none";
      }, 2000);
    } catch (error) {
      console.error("Failed to update profile:", error);
      Utils.showError(
        error.message || "Failed to update profile",
        messagesDiv.id,
      );
    } finally {
      Utils.hideLoading(submitBtn, "Save Changes");
    }
  },

  openEditPreferencesModal: function () {
    const modal = document.getElementById("edit-preferences-modal");
    const form = document.getElementById("edit-preferences-form");

    const genreCheckboxes = form.querySelectorAll('input[name="genres"]');
    genreCheckboxes.forEach((checkbox) => {
      checkbox.checked = false;
      checkbox.parentElement.classList.remove("selected");
    });

    if (this.userProfile.preferences && this.userProfile.preferences.genres) {
      this.userProfile.preferences.genres.forEach((genre) => {
        const checkbox = form.querySelector(
          `input[name="genres"][value="${genre}"]`,
        );
        if (checkbox) {
          checkbox.checked = true;
          checkbox.parentElement.classList.add("selected");
        }
      });
    }

    document.getElementById("emailNotifications").checked =
      (this.userProfile.preferences &&
        this.userProfile.preferences.emailNotifications) ||
      false;
    document.getElementById("eventReminders").checked =
      (this.userProfile.preferences &&
        this.userProfile.preferences.eventReminders) ||
      false;
    document.getElementById("locationSuggestions").checked =
      (this.userProfile.preferences &&
        this.userProfile.preferences.locationSuggestions) ||
      false;

    modal.style.display = "block";
  },

  handleGenreSelection: function () {
    const form = document.getElementById("edit-preferences-form");
    const genreCheckboxes = form.querySelectorAll('input[name="genres"]');
    const checkedBoxes = form.querySelectorAll('input[name="genres"]:checked');

    genreCheckboxes.forEach((checkbox) => {
      if (checkbox.checked) {
        checkbox.parentElement.classList.add("selected");
      } else {
        checkbox.parentElement.classList.remove("selected");
      }

      if (checkedBoxes.length >= this.maxGenres && !checkbox.checked) {
        checkbox.disabled = true;
        checkbox.parentElement.style.opacity = "0.5";
      } else {
        checkbox.disabled = false;
        checkbox.parentElement.style.opacity = "1";
      }
    });
  },

  handlePreferencesUpdate: async function (e) {
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const messagesDiv = document.getElementById("preferences-modal-messages");

    try {
      Utils.showLoading(submitBtn, "Saving...");

      const formData = new FormData(form);
      const selectedGenres = Array.from(
        form.querySelectorAll('input[name="genres"]:checked'),
      ).map((checkbox) => checkbox.value);

      const preferencesData = {
        userID: this.userProfile.userID,
        name: this.userProfile.name,
        email: this.userProfile.email,
        bio: this.userProfile.bio || null,
        location: this.userProfile.location || null,
        website: this.userProfile.website || null,
        profilePictureUrl: this.userProfile.profilePictureUrl || null,
        preferences: {
          genres: selectedGenres,
          emailNotifications: formData.get("emailNotifications") === "on",
          eventReminders: formData.get("eventReminders") === "on",
          locationSuggestions: formData.get("locationSuggestions") === "on",
        },
        createdAt: this.userProfile.createdAt || new Date().toISOString(),
      };

      if (!this.userProfile) {
        console.log("No user profile found, creating one from current user");
        this.userProfile = {
          userID: this.currentUser.sub,
          name: this.currentUser.email.split("@")[0],
          email: this.currentUser.email,
          preferences: {
            genres: [],
            emailNotifications: true,
            eventReminders: true,
            locationSuggestions: true,
          },
          createdAt: new Date().toISOString(),
        };
      }

      if (!this.userProfile.userID) {
        console.log("No userID in profile, setting from current user");
        this.userProfile.userID = this.currentUser.sub;
      }

      preferencesData.userID = this.userProfile.userID;

      const url = CONFIG.buildApiUrl(
        CONFIG.API.ENDPOINTS.USERS,
        this.userProfile.userID,
      );
      console.log("Updating user preferences:", {
        userID: this.userProfile.userID,
        url: url,
        data: preferencesData,
      });

      try {
        await Utils.apiCall(url, {
          method: "PUT",
          headers: CONFIG.getAuthHeaders(),
          body: JSON.stringify(preferencesData),
        });
      } catch (error) {
        if (error.message.includes("not found")) {
          const createUrl = CONFIG.buildApiUrl(CONFIG.API.ENDPOINTS.USERS);
          await Utils.apiCall(createUrl, {
            method: "POST",
            headers: CONFIG.getAuthHeaders(),
            body: JSON.stringify({
              userID: this.userProfile.userID,
              ...preferencesData,
            }),
          });
        } else {
          throw error;
        }
      }

      this.userProfile = preferencesData;

      localStorage.setItem(
        CONFIG.STORAGE_KEYS.USER_DATA,
        JSON.stringify(this.userProfile),
      );

      Utils.showSuccess("Preferences updated successfully!", messagesDiv.id);

      this.renderPreferences();

      setTimeout(() => {
        document.getElementById("edit-preferences-modal").style.display =
          "none";
      }, 2000);
    } catch (error) {
      console.error("Failed to update preferences:", error);
      Utils.showError(
        error.message || "Failed to update preferences",
        messagesDiv.id,
      );
    } finally {
      Utils.hideLoading(submitBtn, "Save Preferences");
    }
  },

  handlePasswordChange: async function (e) {
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const messagesDiv = document.getElementById("password-modal-messages");

    try {
      const formData = new FormData(form);
      const currentPassword = formData.get("currentPassword");
      const newPassword = formData.get("newPassword");
      const confirmPassword = formData.get("confirmPassword");

      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match");
      }

      const passwordValidation = Utils.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(
          "Password must be at least 8 characters long with uppercase, lowercase, and numbers",
        );
      }

      Utils.showLoading(submitBtn, "Changing...");

      await new Promise((resolve) => setTimeout(resolve, 1000));

      Utils.showSuccess("Password changed successfully!", messagesDiv.id);
      form.reset();

      setTimeout(() => {
        document.getElementById("change-password-modal").style.display = "none";
      }, 2000);
    } catch (error) {
      console.error("Failed to change password:", error);
      Utils.showError(
        error.message || "Failed to change password",
        messagesDiv.id,
      );
    } finally {
      Utils.hideLoading(submitBtn, "Change Password");
    }
  },

  previewProfilePicture: function (e) {
    const file = e.target.files[0];
    const previewDiv = document.getElementById("image-preview");
    const previewImg = document.getElementById("preview-image");

    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        previewImg.src = e.target.result;
        previewDiv.style.display = "block";
      };
      reader.readAsDataURL(file);
    } else {
      previewDiv.style.display = "none";
    }
  },

  handleProfilePictureUpload: async function (e) {
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const messagesDiv = document.getElementById("picture-modal-messages");

    try {
      Utils.showLoading(submitBtn, "Uploading...");

      const formData = new FormData(form);
      const imageFile = formData.get("profilePicture");

      if (!imageFile || imageFile.size === 0) {
        throw new Error("Please select an image file");
      }

      if (imageFile.size > 5 * 1024 * 1024) {
        throw new Error("Image file must be less than 5MB");
      }

      const imageUrl = await Utils.uploadImage(imageFile, "users");
      console.log("Image uploaded successfully:", imageUrl);

      if (!this.userProfile) {
        console.log("No user profile found, creating one from current user");
        this.userProfile = {
          userID: this.currentUser.sub,
          name: this.currentUser.email.split("@")[0],
          email: this.currentUser.email,
          preferences: {
            genres: [],
            emailNotifications: true,
            eventReminders: true,
            locationSuggestions: true,
          },
          createdAt: new Date().toISOString(),
        };
      }

      if (!this.userProfile.userID) {
        console.log("No userID in profile, setting from current user");
        this.userProfile.userID = this.currentUser.sub;
      }

      console.log("Updating user profile with image URL:", {
        userID: this.userProfile.userID,
        imageUrl: imageUrl,
      });

      const profileData = {
        userID: this.userProfile.userID,
        name: this.userProfile.name || "",
        email: this.userProfile.email || "",
        bio: this.userProfile.bio || null,
        location: this.userProfile.location || null,
        website: this.userProfile.website || null,
        preferences: this.userProfile.preferences || {},
        profilePictureUrl: imageUrl,
        createdAt: this.userProfile.createdAt || new Date().toISOString(),
      };

      console.log("Profile data being sent for image update:", {
        userID: profileData.userID,
        name: profileData.name,
        email: profileData.email,
        bio: profileData.bio,
        location: profileData.location,
        website: profileData.website,
        preferences: profileData.preferences,
        profilePictureUrl: profileData.profilePictureUrl,
        createdAt: profileData.createdAt,
      });

      const url = CONFIG.buildApiUrl(
        CONFIG.API.ENDPOINTS.USERS,
        this.userProfile.userID,
      );
      console.log("API URL for update:", url);

      try {
        await Utils.apiCall(url, {
          method: "PUT",
          headers: CONFIG.getAuthHeaders(),
          body: JSON.stringify(profileData),
        });
      } catch (updateError) {
        console.error(
          "Failed to update user profile with new image:",
          updateError,
        );

        const profilePicture = document.getElementById("profile-picture");
        if (profilePicture) {
          profilePicture.src = imageUrl;
        }
        throw new Error(
          `Image uploaded but profile update failed: ${updateError.message}`,
        );
      }

      this.userProfile = profileData;

      localStorage.setItem(
        CONFIG.STORAGE_KEYS.USER_DATA,
        JSON.stringify(this.userProfile),
      );

      const profilePicture = document.getElementById("profile-picture");
      const currentProfilePicture = document.getElementById(
        "currentProfilePicture",
      );
      const profilePicturePlaceholder = document.getElementById(
        "profilePicturePlaceholder",
      );

      if (profilePicture) {
        profilePicture.src = imageUrl;
      }

      if (currentProfilePicture) {
        currentProfilePicture.src = imageUrl;
        currentProfilePicture.style.display = "block";
      }
      if (profilePicturePlaceholder) {
        profilePicturePlaceholder.style.display = "none";
      }

      Utils.showSuccess(
        "Profile picture updated successfully!",
        messagesDiv.id,
      );
      form.reset();
      document.getElementById("image-preview").style.display = "none";

      setTimeout(() => {
        document.getElementById("profile-picture-modal").style.display = "none";
      }, 2000);
    } catch (error) {
      console.error("Failed to upload profile picture:", error);
      Utils.showError(
        error.message || "Failed to upload profile picture",
        messagesDiv.id,
      );
    } finally {
      Utils.hideLoading(submitBtn, "Upload Picture");
    }
  },

  exportUserData: function () {
    try {
      const exportData = {
        profile: this.userProfile,
        activity: this.activityData,
        exportDate: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(dataBlob);
      link.download = `local-gigs-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Utils.showSuccess("Your data has been exported successfully!");
    } catch (error) {
      console.error("Failed to export data:", error);
      Utils.showError("Failed to export your data. Please try again.");
    }
  },

  handleDeleteAccount: function () {
    const confirmMessage = `Are you sure you want to delete your account? This action cannot be undone and will remove:

• Your profile information
• All events you've created
• All venues you've added
• Your preferences and settings

Type "DELETE" to confirm:`;

    const confirmation = prompt(confirmMessage);

    if (confirmation === "DELETE") {
      this.deleteAccount();
    } else if (confirmation !== null) {
      Utils.showError(
        "Account deletion cancelled. You must type 'DELETE' exactly to confirm.",
      );
    }
  },

  deleteAccount: async function () {
    try {
      const url = CONFIG.buildApiUrl(
        CONFIG.API.ENDPOINTS.USERS,
        this.userProfile.userID,
      );
      await Utils.apiCall(url, {
        method: "DELETE",
        headers: CONFIG.getAuthHeaders(),
      });

      Utils.showSuccess(
        "Your account has been deleted successfully. You will be logged out in 3 seconds.",
      );

      localStorage.clear();

      setTimeout(() => {
        window.location.href = "index.html";
      }, 3000);
    } catch (error) {
      console.error("Failed to delete account:", error);
      Utils.showError(
        "Failed to delete account. Please try again later or contact support.",
      );
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  ProfilePage.init();
});
