const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const dbConfig = {
    user: "c##showtimeDB",
    password: "showtimeDB",
    connectString: "localhost:1521/ORCL",
};

// Search Movies Endpoint
router.get('/search-movies', async (req, res) => {
    let connection;
    try {
        const query = req.query.query; // The search query
        connection = await oracledb.getConnection(dbConfig);

        const result = await connection.execute(
            `SELECT MOVIEID, TITLE FROM MOVIE WHERE UPPER(TITLE) LIKE UPPER(:query)`, //basic sql
            [`%${query}%`], // Using bind variables for security
            { outFormat: oracledb.OUT_FORMAT_OBJECT } // Fetches rows as objects
        );

        res.json(result.rows); // Send back the search results
    } catch (err) {
        console.error(err);
        res.status(500).send('Error during the search process.');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

// Add Screening Endpoint (example)
router.post('/add-screening', async (req, res) => {
    let connection;
    try {
        const { movieId, showtime, screeningDate } = req.body;
        console.log( req.body); 

        const hallID = req.session.hallID; // Retrieve hallID stored in session

        connection = await oracledb.getConnection(dbConfig);

        // Modified SQL statement to include SCREENING_SEQ.NEXTVAL for SCREENINGID
        const insertScreeningSQL = `
        INSERT INTO SCREENING (SCREENINGID, MOVIEID, HALLID, SHOWTIME, SCREENINGDATE)
        VALUES (SCREENING_SEQ.NEXTVAL, :movieId, :hallID, TO_TIMESTAMP(:showtime, 'YYYY-MM-DD"T"HH24:MI'), TO_DATE(:screeningDate, 'YYYY-MM-DD'))
        
        `; //basic sql insert

        await connection.execute(insertScreeningSQL, { movieId, hallID, showtime, screeningDate }, { autoCommit: true });
        res.send("Screening added successfully.");
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send("Error adding screening.");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing database connection:', err);
            }
        }
    }
});


router.get('/hall_admin/screening',async  (req, res) => {

  if (req.session.userRole === 'HallAdmin') {
    const hallID = req.session.hallID;
    const userRole = req.session.userRole;
    console.log(hallID);
    if (hallID) {
         let connection;
        try {
          connection = await oracledb.getConnection(dbConfig);
          const result = await connection.execute(
            `SELECT AVG(RATINGS) AS avg_rating FROM CINEMAHALLREVIEW WHERE HALLID = :hallId`,
            [hallID],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          const result2 = await connection.execute(
            `SELECT NAME FROM CINEMA_HALL WHERE HALLID = :hallId`,
            [hallID],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );

            let name = result2.rows[0].NAME;
          let avgRating;
          if (result.rows && result.rows.length > 0 && result.rows[0].AVG_RATING !== null) {
            avgRating = result.rows[0].AVG_RATING;
          } else {
            avgRating = 100; 
          }
          const showWarning = avgRating < 2;
          console.log(showWarning,avgRating);
          res.render('hallAdmin-screening', { hallID, role: userRole, showWarning,name});
        } catch (err) {
          console.error('Database query failed:', err);
          res.status(500).send('Error querying the database.');
        } finally {
          if (connection) {
            try {
              await connection.close();
            } catch (err) {
              console.error('Error closing connection:', err);
            }
          }
        }
    } else {
      res.status(404).send('No hall assigned to this HallAdmin.');
    }
  } else {
    // If not HallAdmin or not logged in, redirect to login or appropriate page
    res.redirect('/login');
  }
});

router.get('/search-screenings', async (req, res) => {
    let connection;
    try {
        const movieId = req.query.movieId; // Assuming you're passing movieId as a query parameter
        connection = await oracledb.getConnection(dbConfig);

        const result = await connection.execute(
            `SELECT SCREENINGID, MOVIEID, HALLID, SHOWTIME, SCREENINGDATE FROM SCREENING WHERE MOVIEID = :movieId`, //basic sql
            [movieId],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error during the search process.');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});


router.post('/delete-screening', async (req, res) => {
    let connection;
    try {
        const { screeningId } = req.body; // Destructure screeningId from request body
        connection = await oracledb.getConnection(dbConfig);

        // Call the DeleteScreening stored procedure
        await connection.execute(
            `BEGIN DeleteScreening(:screeningId); END;`,  //basic sql -cascade delete
            { screeningId: screeningId }, // Bind variables
            { autoCommit: true }
        );

        res.send("Screening deleted successfully.");
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send("Error deleting screening.");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing database connection:', err);
            }
        }
    }
});

router.post('/insert-movie', async (req, res) => {
    const { title, poster, releaseDate, backdrop, overview, trailer, genres } = req.body;
    const genresStr = genres.join(','); // Convert array of genres to comma-separated string

    if (!title) {
        return res.status(400).send("Title is mandatory.");
    }

    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        // Call the stored procedure
        await connection.execute(
            `BEGIN 
                InsertMovieWithGenres(:title, :poster, TO_DATE(:releaseDate, 'YYYY-MM-DD'), :backdrop, :overview, :trailer, :genresStr); 
             END;`, //basic sql (cascade insert)
            { title, poster, releaseDate, backdrop, overview, trailer, genresStr },
            { autoCommit: true }
        );

        res.send("Movie and genres inserted successfully.");
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send("Error inserting movie and genres.");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing database connection:', err);
            }
        }
    }
});



module.exports = router;
