// // public/js/movieFilter.js
// document.addEventListener('DOMContentLoaded', function() {        //basically this starts working after the movies.ejs is loaded 
//     var genreSelect = document.getElementById('genre-select');      //u can access genre-select element (basically the drop down selector) by the variable
//     var moviesList = document.getElementById('movies-list');        //u can access movies-list element by the variable 

//     genreSelect.addEventListener('change', function() {             //if there is any change in genre-select element this function is called
//         var selectedGenre = this.value;                             //selectedGenre stores tha value of the option/ change
//         var movies = moviesList.getElementsByClassName('movie');    //movies is an array and it stores all the elements with the movie class name inside (movieList class)

//         Array.from(movies).forEach(function(movie) {
//             if (selectedGenre === 'all' || movie.getAttribute('data-genre') === selectedGenre) {
//                 movie.style.display = 'block';
//             } else {
//                 movie.style.display = 'none';
//             }
//         });
//     });
// });

// public/js/movieFilter.js




document.addEventListener("DOMContentLoaded", function () {
    var genreSelect = document.getElementById("genre-select");
    var moviesList = document.getElementById("movies-list");
    var value1 = document.getElementById('value1');
    var value2 = document.getElementById('value2');
    var slider = document.getElementById('slider');


    function filtermovies() {
      var selectedGenre = genreSelect.value;
      var movies = moviesList.getElementsByClassName("movie");
      var min= parseFloat(value1.textContent);
      var max= parseFloat(value2.textContent);

      console.log(min,max);
  
      Array.from(movies).forEach(function (movie) {
        var movieGenres = movie.getAttribute("data-genre").split(", ");
        var rating = parseFloat(movie.getAttribute("data-rating"));
        console.log(rating);
        if ((selectedGenre === "all" || movieGenres.includes(selectedGenre))&&(rating>=min && rating<=max)) {
          movie.style.display = "block";
        } else {
          movie.style.display = "none";
        }
      });  
      }
    

    genreSelect.addEventListener('change', filtermovies);
    slider.noUiSlider.on('change', filtermovies);


      
    
  });
  