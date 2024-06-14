document.addEventListener('DOMContentLoaded', () => {
    const mapContainer = document.getElementById('map');
    const citySelect = document.getElementById('city');
    const locationSelect = document.getElementById('location');
    const resultText = document.getElementById('result-text');
    const predictionForm = document.getElementById('prediction-form');
    const loadingSpinner = document.getElementById('loading-spinner');

    const cityCoordinates = {
        bangalore: { lat: 12.9716, lng: 77.5946 },
        chennai: { lat: 13.0827, lng: 80.2707 },
    };

    let map;
    let markers = []; // To store markers on the map

    const initMap = () => {
        map = L.map('map').setView([12.9716, 77.5946], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    };

    const clearMarkers = () => {
        markers.forEach(marker => {
            map.removeLayer(marker);
        });
        markers = [];
    };

    const addMarker = (lat, lng, popupText) => {
        const marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(popupText);
        markers.push(marker);
    };

    const fetchLocations = () => {
        const selectedCity = citySelect.value;
        if (!selectedCity) return;

        fetch('/get_locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city: selectedCity }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch locations');
            }
            return response.json();
        })
        .then(data => {
            locationSelect.innerHTML = ''; // Clear existing options
            if (data && data.locations && data.locations.length > 0) {
                data.locations.forEach(location => {
                    const option = document.createElement('option');
                    option.value = location;
                    option.textContent = location;
                    locationSelect.appendChild(option);
                });
            } else {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'No locations available';
                locationSelect.appendChild(defaultOption);
            }
        })
        .catch(error => {
            console.error('Error fetching locations:', error);
            resultText.textContent = 'Error fetching locations. Please try again.';
        });
    };

    const fetchCoordinates = (city) => {
        const address = `${city}`;
        const apiKey = '4b563cb3d358707d5eb2e095a9e68ca9';
        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(address)}&appid=${apiKey}`;

        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch location coordinates');
                }
                return response.json();
            })
            .then(data => {
                if (data.coord) {
                    const { lat, lon } = data.coord;
                    clearMarkers(); // Clear existing markers
                    addMarker(lat, lon, city); // Add new marker
                    map.setView([lat, lon], 13); // Set map view to new marker
                } else {
                    console.error('No coordinates found for the location');
                }
            })
            .catch(error => {
                console.error('Error fetching location coordinates:', error);
                resultText.textContent = 'Error fetching location coordinates. Please try again.';
            });
    };

    const submitForm = () => {
        const loadingSpinner = document.getElementById('loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'block'; // Show loading spinner
        }
        
        fetch('/predict', {
            method: 'POST',
            body: new FormData(predictionForm),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to predict');
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                resultText.textContent = `Error: ${data.error}`;
            } else {
                resultText.textContent = `Estimated Price: ₹${data.prediction}L`;
                // predictionForm.reset(); // Reset the form after successful submission
            }
        })
        .catch(error => {
            console.error('Error making prediction:', error);
            resultText.textContent = 'Error making prediction. Please try again.';
        })
        .finally(() => {
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none'; // Hide loading spinner
            }
        });
    };

    // Event listeners
    if (mapContainer && citySelect && locationSelect && resultText && predictionForm) {
        initMap(); // Initialize the map on page load
        fetchLocations(); // Fetch locations when the page loads

        citySelect.addEventListener('change', () => {
            const selectedCity = citySelect.value;
            if (selectedCity && selectedCity in cityCoordinates) {
                const { lat, lng } = cityCoordinates[selectedCity];
                fetchLocations();
                map.setView([lat, lng], 13);
            }
        });

        locationSelect.addEventListener('change', () => {
            const selectedLocation = locationSelect.value;
            if (selectedLocation) {
                fetchCoordinates(selectedLocation);
            }
        });

        predictionForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent form submission
            submitForm();
        });
    }
});
