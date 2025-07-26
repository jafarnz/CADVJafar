document.addEventListener("DOMContentLoaded", () => {
	const eventsList = document.getElementById("events-list");
	const eventDetail = document.getElementById("event-detail");
	const createEventForm = document.getElementById("create-event-form");

	const urlParams = new URLSearchParams(window.location.search);
	const eventId = urlParams.get("id");

	async function loadAllEvents() {
		try {
			const response = await fetchWithAuth(`${API_BASE_URL}/events`);
			if (!response.ok) throw new Error("Failed to fetch events.");

			const events = await response.json();
			eventsList.innerHTML = ""; // Clear existing list

			if (events.length === 0) {
				eventsList.innerHTML = "<p>No events found.</p>";
				return;
			}

			events.forEach((event) => {
				const eventCard = document.createElement("div");
				eventCard.className = "item-card";
				eventCard.innerHTML = `
                    <h3>${event.name}</h3>
                    <p>${new Date(event.date).toLocaleDateString()}</p>
                    <a href="event-detail.html?id=${event.eventID}">View Details</a>
                `;
				eventsList.appendChild(eventCard);
			});
		} catch (error) {
			console.error("Error loading events:", error);
			eventsList.innerHTML = `<p>${error.message}</p>`;
		}
	}

	/**
	 * Fetches and displays a single event's details.
	 * GET /events/{eventID}
	 *//**
	 * Fetches all events and displays them.
	 * GET /events
	 */
	async function loadEventDetail() {
		try {
			const response = await fetchWithAuth(`${API_BASE_URL}/events/${eventId}`);
			if (!response.ok) throw new Error("Failed to fetch event details.");

			const event = await response.json();
			eventDetail.innerHTML = `
                <h1>${event.name}</h1>
                <p><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</p>
                <p><strong>Description:</strong> ${event.description}</p>
                <p><strong>Venue ID:</strong> ${event.venueID}</p>
                <!-- Add edit/delete buttons here if needed -->
            `;
		} catch (error) {
			console.error("Error loading event detail:", error);
			eventDetail.innerHTML = `<p>${error.message}</p>`;
		}
	}

	/**
	 * Populates the venue dropdown on the create event form.
	 * GET /venues
	 */
	async function populateVenueSelect() {
		const venueSelect = document.getElementById("venue-select");
		try {
			const response = await fetchWithAuth(`${API_BASE_URL}/venues`);
			if (!response.ok) throw new Error("Failed to fetch venues.");

			const venues = await response.json();
			venueSelect.innerHTML = '<option value="">-- Select a Venue --</option>';
			venues.forEach((venue) => {
				const option = document.createElement("option");
				option.value = venue.venueID;
				option.textContent = venue.name;
				venueSelect.appendChild(option);
			});
		} catch (error) {
			console.error("Error populating venues:", error);
			venueSelect.innerHTML = `<option value="">${error.message}</option>`;
		}
	}

	/**
	 * Handles the creation of a new event.
	 * POST /events
	 */
	if (createEventForm) {
		createEventForm.addEventListener("submit", async (e) => {
			e.preventDefault();

			const eventData = {
				name: document.getElementById("event-name").value,
				description: document.getElementById("event-description").value,
				date: document.getElementById("event-date").value,
				time: document.getElementById("event-time").value,
				venueID: document.getElementById("venue-select").value,
			};

			try {
				const response = await fetchWithAuth(`${API_BASE_URL}/events`, {
					method: "POST",
					body: JSON.stringify(eventData),
				});

				if (!response.ok) throw new Error("Failed to create event.");

				alert("Event created successfully!");
				window.location.href = "events.html";
			} catch (error) {
				console.error("Error creating event:", error);
				alert(error.message);
			}
		});
	}

	// Page-specific logic
	if (eventsList) {
		loadAllEvents();
	}
	if (eventDetail && eventId) {
		loadEventDetail();
	}
	if (createEventForm) {
		populateVenueSelect();
	}
});
