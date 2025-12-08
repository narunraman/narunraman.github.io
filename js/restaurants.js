// Search/Filter functionality for restaurants
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('restaurant-search');
    const regionSections = document.querySelectorAll('.region-section');

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();

            regionSections.forEach(section => {
                const regionName = section.querySelector('h3').textContent.toLowerCase();
                const restaurants = section.querySelectorAll('.restaurant-list li');
                let hasVisibleRestaurants = false;

                // Check if search term matches region name
                const regionMatches = regionName.includes(searchTerm);

                restaurants.forEach(restaurant => {
                    const text = restaurant.textContent.toLowerCase();
                    // Show restaurant if it matches search OR if the region matches
                    if (text.includes(searchTerm) || regionMatches) {
                        restaurant.classList.remove('hidden');
                        hasVisibleRestaurants = true;
                    } else {
                        restaurant.classList.add('hidden');
                    }
                });

                // Hide the entire region section if no restaurants match
                if (hasVisibleRestaurants || searchTerm === '') {
                    section.classList.remove('hidden');
                } else {
                    section.classList.add('hidden');
                }
            });
        });
    }
});
