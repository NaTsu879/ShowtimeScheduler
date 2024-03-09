

document.addEventListener('DOMContentLoaded', function() {
    var locationSelect = document.getElementById('location-select');
    var cinemas = document.querySelectorAll('.cinema');
    var cinemaCount = document.getElementById('cinema-count');
    var value1 = document.getElementById('value1');
    var value2 = document.getElementById('value2');
    var slider = document.getElementById('slider');


    function filterCinemas() {
        var selectedLocation = locationSelect.value;
        var count = 0;
        var min= parseFloat(value1.textContent);
        var max= parseFloat(value2.textContent);

        console.log(min,max);

        cinemas.forEach(function(cinema) {
            var rating = parseFloat(cinema.getAttribute("data-rating"));
            console.log(rating);
            if ((cinema.getAttribute('data-location') === selectedLocation || selectedLocation === 'all')&&(rating>=min && rating<=max)) {
                cinema.style.display = 'block';
                count++;
            } else {
                cinema.style.display = 'none';
            }
        });

        cinemaCount.textContent = count; // Update cinema count display
    }

    // Listen for changes in the location dropdown
    locationSelect.addEventListener('change', filterCinemas);
    slider.noUiSlider.on('change', filterCinemas);
    // Call filterCinemas on page load to display all cinemas
    filterCinemas();
});
