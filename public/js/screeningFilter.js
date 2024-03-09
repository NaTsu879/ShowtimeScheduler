document.addEventListener('DOMContentLoaded', function() {
    var screeningsList = document.getElementById('screenings-list');
    var genreSelect = document.getElementById('genre-select');
    var dateSelect = document.getElementById('date-select');
    var timeSelect = document.getElementById('time-select');

    function filterScreenings() {
        var selectedGenre = genreSelect.value;
        var selectedDate = dateSelect.value;
        var selectedTime = timeSelect.value;

        var screenings = screeningsList.getElementsByClassName('screening');
        for (var i = 0; i < screenings.length; i++) {
            var screening = screenings[i];
            var screeningGenres = screening.getAttribute('data-genre').split(', ');
            var screeningDate = screening.getAttribute('data-date');
            var screeningTime = screening.getAttribute('data-time'); 

            var genreMatch = selectedGenre === 'all' || screeningGenres.includes(selectedGenre);
            var dateMatch = !selectedDate || screeningDate === selectedDate;
            var timeMatch = !selectedTime || screeningTime.startsWith(selectedTime);

            screening.style.display = genreMatch && dateMatch && timeMatch ? '' : 'none';
        }
    }

    genreSelect.addEventListener('change', filterScreenings);
    dateSelect.addEventListener('change', filterScreenings);
    timeSelect.addEventListener('change', filterScreenings);
});
