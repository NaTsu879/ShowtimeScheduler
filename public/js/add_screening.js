// Assuming jQuery is used
$(document).ready(function() {
    // Listen for input in the movie search box
    $('#movie-search').on('input', function() {
        var query = $(this).val();
        if (query.length > 2) { // Only search if at least 3 characters are typed
            $.ajax({
                url: '/search-movies', // Backend endpoint for searching movies
                method: 'GET',
                data: { query: query },
                success: function(movies) {
                    $('#search-results').empty();
                    movies.forEach(function(movie) {
                        $('#search-results').append(`<li data-movie-id="${movie.MOVIEID}">
                        <div class="test">${movie.TITLE}</div></li>`);
                    });
                }
            });
        } else {
            $('#search-results').empty();
        }
    });
    // Handle movie selection from suggestions
    $(document).on('click', '#search-results li', function() {
        var movieId = $(this).data('movie-id');
        var movieTitle = $(this).text().trim();
        console.log(movieId);
        console.log(movieTitle);
        $('#movie-search').val(movieTitle); // Update search box with the selected movie title
        $('#selected-movie-id').val(movieId); 
        $('#search-results').empty(); // Clear search results
        fetchScreenings(movieId);

    });

    $('#add-screening-form').on('submit', function(e) {
        e.preventDefault(); // Prevent the default form submission

        // Gather form data
        var formData = {
            movieId: $('#selected-movie-id').val(),
            showtime: $('#showtime').val(),
            screeningDate: $('#screening-date').val(),
        };

        // Send the data to the server using AJAX
        console.log(formData); // Add this line before the AJAX request in `add_screening.js`
        $.ajax({
            url: '/add-screening',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                alert('Screening added successfully.');
                // Optionally, clear the form or redirect the user
            },
            error: function(xhr, status, error) {
                console.error("Error adding screening:", status, error);
                alert('Error adding screening.');
            }
        });
    });

    // Function to fetch and display screenings
    function fetchScreenings(movieId) {
        $.ajax({
            url: '/search-screenings', // Backend endpoint to search screenings by movieId
            method: 'GET',
            data: { movieId: movieId },
            success: function(screenings) {
                $('#screening-results').empty(); // Clear existing screenings
                screenings.forEach(function(screening) {
                    $('#screening-results').append(`
                        <li>
                            Screening ID: ${screening.SCREENINGID}, Showtime: ${screening.SHOWTIME}, Screening Date: ${screening.SCREENINGDATE}
                            <button class="delete-screening" data-screening-id="${screening.SCREENINGID}">Delete</button>
                        </li>
                    `);
                });
            }
        });
    }

    // Handle click event on the delete button for a screening
    $(document).on('click', '.delete-screening', function() {
        var screeningId = $(this).data('screening-id');
        if(confirm('Are you sure you want to delete this screening?')) {
            $.ajax({
                url: '/delete-screening', // Backend endpoint to delete a screening by screeningId
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ screeningId: screeningId }),
                success: function(response) {
                    alert('Screening deleted successfully.');
                    fetchScreenings($('#selected-movie-id').val()); // Refresh the screenings list
                },
                error: function(xhr, status, error) {
                    alert('Error deleting screening.');
                }
            });
        }
    });

   
    $('#insert-movie-form').on('submit', function(e) {
        e.preventDefault();
    
        var selectedGenres = $('#movie-genre').val(); // This will be an array of selected genre names
    
        var formData = {
            title: $('#movie-title').val(),
            poster: $('#movie-poster').val(),
            releaseDate: $('#movie-releaseDate').val(),
            backdrop: $('#movie-backdrop').val(),
            overview: $('#movie-overview').val(),
            trailer: $('#movie-trailer').val(),
            genres: selectedGenres
        };
    
        $.ajax({
            url: '/insert-movie',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                alert('Movie inserted successfully.');
                // Optionally, reset the form or handle success further
            },
            error: function(xhr, status, error) {
                alert('Error inserting movie: ' + error);
            }
        });
    });
    
    
});


