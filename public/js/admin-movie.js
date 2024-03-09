$(document).ready(function() {
    // Listen for input in the movie search box
    $('#movie-search').on('input', function() {
        var query = $(this).val();
        if (query.length > 2) { // Only search if at least 3 characters are typed
            $.ajax({
                url: '/search-movies', // Backend endpoint for searching movies
                method: 'GET',
                data: { query: query }, // Send the current value of the text input as the query parameter
                success: function(movies) {
                    $('#search-results').empty(); // Clear previous search results
                    movies.forEach(function(movie) {
                        // Append each movie as a list item to the search results
                        $('#search-results').append(`<li data-movie-id="${movie.MOVIEID}"><div class="test">${movie.TITLE}</div></li>`);
                    });
                },
                error: function(xhr, status, error) {
                    console.error("Error fetching movies:", status, error);
                    $('#search-results').empty().append('<li>Failed to fetch results.</li>');
                }
            });
        } else {
            $('#search-results').empty(); // Clear search results if the query is less than 3 characters
        }
    });
});
$(document).ready(function() {
    // Search functionality remains the same...

    // Handle movie selection from search results
    $(document).on('click', '#search-results li', function() {
        var movieId = $(this).data('movie-id');
        $('#search-results').empty();
        // Fetch and display movie details
        $.ajax({
            url: `/movie-details/${movieId}`, // Assume you have this endpoint
            method: 'GET',
            success: function(movie) {
                // Assuming 'movie' is the object returned with all details
                // Update UI with movie details
                $('#movie-details').html(`
                <div class="s-container">
                    <div class="left">
                        <img src="${movie.POSTER}" alt="Movie Poster" class="movie-poster">
                    </div>
                    <div class="right">

                        <div class="date">
                    
                        </div>
                        <div class="movie-title">
                            ${movie.TITLE}
                        </div>

                        <div class="genre">
                            ${movie.RELEASEDATE}
                        </div>
                        <div class="screenings">
                        
                            <span>
                            ${movie.OVERVIEW}
                            </span>
                            <a href="${movie.TRAILER}" target="_blank">Watch Here</a>
                        </div>
                        <button id="delete-movie" data-movie-id="${movie.MOVIEID}">Delete Movie</button>

                        </div>
                    </div>
                </div>


                    <!--<h2>${movie.TITLE}</h2>
                    <p><strong>Release Date:</strong> ${movie.RELEASEDATE}</p>
                    <p><strong>Overview:</strong> ${movie.OVERVIEW}</p>
                    <img src="${movie.POSTER}" alt="${movie.TITLE} Poster" style="width: 200px; height: 300px;">
                    <p><strong>Trailer:</strong> <a href="${movie.TRAILER}" target="_blank">Watch Here</a></p>
                    <button id="delete-movie" data-movie-id="${movie.MOVIEID}">Delete Movie</button>-->
                `);
            },
            error: function() {
                $('#movie-details').html('<p>Error fetching movie details.</p>');
            }
        });
    });

    // Handle movie deletion
    $(document).on('click', '#delete-movie', function() {
        var movieId = $(this).data('movie-id');
        
        // Confirm deletion
        if(confirm('Are you sure you want to delete this movie?')) {
            $.ajax({
                url: '/admin/delete-movie',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ movieId: movieId }),
                success: function() {
                    alert('Movie deleted successfully.');
                    // Clear the movie details section or handle as needed
                    $('#movie-details').empty();
                },
                error: function() {
                    alert('Error deleting movie.');
                }
            });
        }
    });
});


