// movieRoutes.js
const express = require("express");
const oracleDB = require("oracledb");
const path = require("path"); // Add this line
const router = express.Router();
router.get("/Movies", async (req, res) => {
  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });
    // function
    const moviesQuery = `
    SELECT M.MovieID, M.Title, M.Poster , get_rating(M.MovieID, 1) AS RATING, G.GenreName as Genre 
    FROM Movie M
    LEFT JOIN MovieWithGenre G ON M.MovieID = G.MovieID
    LEFT JOIN MOVIE_STATUS_LOG S ON M.MovieID = S.MOVIE_ID
		WHERE S.STATUS <> 1 OR S.STATUS IS NULL
    ORDER BY M.Title`;
    // advance sql - 3 join
    const moviesResult = await con.execute(moviesQuery, [], {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });

    const moviesData = {};
    moviesResult.rows.forEach((row) => {
      if (!moviesData[row.MOVIEID]) {
        moviesData[row.MOVIEID] = { MOVIEID: row.MOVIEID, TITLE: row.TITLE, POSTER: row.POSTER,RATING: row.RATING, Genres: [] };
      }
      if (row.GENRE && !moviesData[row.MOVIEID].Genres.includes(row.GENRE)) {
        moviesData[row.MOVIEID].Genres.push(row.GENRE);
      }
    });


    const movies = Object.values(moviesData);

    const genresQuery =
      "SELECT DISTINCT genrename FROM MovieWithGenre ORDER BY genrename";  //(potential funtion)
    const genresResult = await con.execute(genresQuery, [], {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });
    console.log("Movies:", movies);
    console.log("Genres:", genresResult.rows.map((row) => row.GENRENAME));


    res.render("movies", {
      movies: movies,
      genres: genresResult.rows.map((row) => row.GENRENAME),
      role: req.session.userRole,                       //mychange
    });
  } catch (e) {
    console.error(e.message);
    res.status(500).send("Error during DB operation: " + e.message);
  } finally {
    if (con) {
      try {
        await con.close();
      } catch (err) {
        console.error(err.message);
      }
    }
  }
});
router.get("/Movies/:movieId", async (req, res) => {

  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });

    const { movieId } = req.params;
    const screeningsQuery = `
            SELECT s.ScreeningID, s.HallID, s.ShowTime, s.ScreeningDate, 
                   h.Name AS HallName
            FROM Screening s
            JOIN Cinema_Hall h ON s.HallID = h.HallID
            JOIN HALLADMIN HA ON HA.HallID = h.HallID
            JOIN PERSON P ON P.ID = HA.USERID
            WHERE s.MovieID = :movieId
            AND ScreeningDate >= SYSDATE AND P.ISACTIVE = 1
            ORDER BY s.ScreeningDate, s.ShowTime`; 
            //advance sql 3 join

    const screeningsResult = await con.execute(screeningsQuery, [movieId], {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });


    const castsQuery = `
    SELECT MA.CHARACTER,FP.NAME,FP.IMAGE from MOVIEACTOR MA left join FILMPERSONNEL FP ON (MA.ACTORID=FP.ID)
    WHERE MA.MOVIEID = :movieId
    `; 
    //advance sql

    const castsResult = await con.execute(castsQuery, [movieId], {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });

    const movieDetailsQuery = `
    SELECT M.MovieID, M.Title, M.Poster, M.ReleaseDate, M.Backdrop, M.Overview, REPLACE(M.Trailer,'watch?v=','embed/') AS TRAILER, G.GenreName as Genre,FP.NAME,FP.IMAGE,get_rating(M.MovieID, 1) AS RATING
      FROM Movie M
      LEFT JOIN MovieWithGenre G ON M.MovieID = G.MovieID LEFT JOIN FILMPERSONNEL FP ON M.DIRECTORID = ID
      WHERE M.MovieID = :movieId
      ORDER BY M.Title
			`;
    //advance sql + function 
    const movieDetailsResult = await con.execute(movieDetailsQuery, [movieId], {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });

    const movieDetailsData = {};
    movieDetailsResult.rows.forEach((row) => {
      const movieId = row.MOVIEID;
      if (!movieDetailsData[movieId]) {
        movieDetailsData[movieId] = {
          MOVIEID: movieId,
          TITLE: row.TITLE,
          POSTER: row.POSTER,
          RELEASEDATE: row.RELEASEDATE,
          BACKDROP: row.BACKDROP,
          OVERVIEW: row.OVERVIEW,
          TRAILER: row.TRAILER,
          Genres: [],
          NAME: row.NAME,
          IMAGE: row.IMAGE,
          RATING: row.RATING,
        };
      }
      if (row.GENRE && !movieDetailsData[movieId].Genres.includes(row.GENRE)) {
        movieDetailsData[movieId].Genres.push(row.GENRE);
      }
    });

    const movieDetails = Object.values(movieDetailsData);
    console.log(movieDetails);
    

    const reviewsQuery = `
    SELECT NAME, COMMENTS,RATING
    FROM MOVIEREVIEW MR JOIN PERSON P ON P.ID = MR.USERID 
    WHERE MOVIEID=:movieId AND P.ISACTIVE = 1
    `;
    //advance sql
    const reviewsResult = await con.execute(reviewsQuery, [movieId], {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });



    const reviewscountQuery = `
    SELECT COUNT(*)
    FROM MOVIEREVIEW MR 
    WHERE MOVIEID = :movieId AND USERID = :userID
`;
//basic sql
const userID = req.session.userID;

const reviewscountResult = await con.execute(reviewscountQuery, { movieId, userID }, {
    outFormat: oracleDB.OUT_FORMAT_OBJECT,
});

const count = reviewscountResult.rows[0]['COUNT(*)'];
const reviewCount = parseInt(count);


    const prevreviewsQuery = `
    SELECT 
    COALESCE(MR.COMMENTS, '') AS COMMENTS,
    NVL(MR.RATING, 0) AS RATING
    FROM 
    (
        SELECT :userID AS USERID, :movieId AS MOVIEID FROM DUAL 
    ) U
    LEFT JOIN 
    MOVIEREVIEW MR ON U.USERID = MR.USERID AND U.MOVIEID = MR.MOVIEID
    `;
    //advance query

    const prevreviewsResult = await con.execute(prevreviewsQuery, { movieId, userID }, {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });

    console.log(reviewCount);
    res.render("movieScreenings", {
      movies: movieDetails,
      screenings: screeningsResult.rows,
      casts: castsResult.rows,
      reviews: reviewsResult.rows,
      updatereview: prevreviewsResult.rows,
      role: req.session.userRole,
      userid: req.session.userID,                        //mychange
      update: reviewCount,
    });
  } catch (e) {
    console.error(e.message);
    res.status(500).send("Error during DB operation: " + e.message);
  } finally {
    if (con) {
      try {
        await con.close();
      } catch (err) {
        console.error(err.message);
      }
    }
  }
});


router.post("/mreview", async (req, res) => {
  const { userid, movieid, reviewDescription, reviewRating } = req.body;

  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });

    console.log(userid, movieid, reviewDescription, reviewRating);
   
    const insertreviewQuery = `
            INSERT INTO MOVIEREVIEW (REVIEWID, MOVIEID, USERID, RATING, COMMENTS) 
            VALUES (moviereview_seq.nextval, :movieid, :userid,:reviewRating, :reviewDescription) 
            `;
//basic sql - insert 
    const result = await con.execute(
      insertreviewQuery,
      {
        movieid,
        userid,
        reviewRating,
        reviewDescription,
      },
      { autoCommit: false }
    );

    // Commit the transaction to save changes
    await con.commit();

    res.send("review successful");
    //res.json({ success: true });

  } catch (e) {
    // Rollback in case of errors
    await con.rollback();
    console.error(e);
    res.status(500).send("Error during review process.");
  } finally {
    // Always close the connection
    if (con) {
      try {
        await con.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});


router.post("/updatemreview", async (req, res) => {
  const { userid, movieid, reviewDescription, reviewRating } = req.body;

  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });

    console.log(userid, movieid, reviewDescription, reviewRating);
    
    const updatereviewQuery = `
    UPDATE MOVIEREVIEW 
    SET RATING = :reviewRating, COMMENTS = :reviewDescription
    WHERE MOVIEID = :movieid AND USERID = :userid
    `;
   //update basic sql
    const result = await con.execute(
      updatereviewQuery,
      {
        movieid,
        userid,
        reviewRating,
        reviewDescription,
      },
      { autoCommit: false }
    );

    await con.commit();

    res.send("update successful");

  } catch (e) {
    // Rollback in case of errors
    await con.rollback();
    console.error(e);
    res.status(500).send("Error during review process.");
  } finally {
    // Always close the connection
    if (con) {
      try {
        await con.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});


router.post("/deletemreview", async (req, res) => {
  const { userid, movieid, reviewDescription, reviewRating } = req.body;

  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });

    console.log(userid, movieid, reviewDescription, reviewRating);
    const deletereviewQuery = `
    DELETE FROM MOVIEREVIEW 
    WHERE MOVIEID = :movieid AND USERID = :userid
    `;
    //basic sql delete
    const result = await con.execute(
      deletereviewQuery,
      {
        movieid,
        userid
      },
      { autoCommit: false }
    );

    // Commit the transaction to save changes
    await con.commit();

    res.send("delete successful");
    //res.json({ success: true });

  } catch (e) {
    // Rollback in case of errors
    await con.rollback();
    console.error(e);
    res.status(500).send("Error during review process.");
  } finally {
    // Always close the connection
    if (con) {
      try {
        await con.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

module.exports = router;
