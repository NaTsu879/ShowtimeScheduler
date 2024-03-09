// theaterRoutes.js
const express = require("express");
const oracleDB = require("oracledb");
const path = require("path");
const router = express.Router();

router.get("/theaters", async (req, res) => {
  // Add this line if you haven't already set the default outFormat elsewhere
  oracleDB.outFormat = oracleDB.OUT_FORMAT_OBJECT;

  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });

    // Query to get all cinema halls
    const result = await con.execute(
      `SELECT CH.HallID, CH.Name, Location,get_rating(CH.HALLID, 2) AS RATING
      FROM Cinema_Hall CH JOIN HALLADMIN H ON  CH.HALLID = H.HALLID JOIN PERSON P ON H.USERID = P.ID
      WHERE P.ISACTIVE = 1
      ORDER BY NAME`
    );
    //advance sql + function

    // Query to get distinct locations for the dropdown
    const locationsResult = await con.execute(
      "SELECT DISTINCT Location FROM Cinema_Hall ORDER BY Location"
    );
      //basic
    res.render("theaters", {
      theaters: result.rows,
      locations: locationsResult.rows,
      role: req.session.userRole
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

router.get("/theater/:hallId", async (req, res) => {
  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });

    const hallId = req.params.hallId;

    // Query to get all screenings for the theater
    const screeningsQuery = `
    SELECT s.ScreeningID, s.HallID, s.ShowTime, s.ScreeningDate,
    m.Title,m.POSTER,m.BACKDROP,m.OVERVIEW,m.TRAILER, m.ReleaseDate, c.Name AS HallName,
    LISTAGG(g.GenreName, ', ') WITHIN GROUP (ORDER BY g.GenreName) AS Genres
    FROM Screening s
    JOIN HALLADMIN H ON s.HALLID = H.HALLID 
    JOIN PERSON P ON H.USERID = P.ID
    JOIN Movie m ON s.MovieID = m.MovieID
    LEFT JOIN MovieWithGenre g ON m.MovieID = g.MovieID
    JOIN Cinema_Hall c ON s.HallID = c.HallID
    WHERE s.HallID = :hallId AND P.ISACTIVE = 1 
    GROUP BY s.ScreeningID, s.HallID, s.ShowTime, s.ScreeningDate, m.Title, m.ReleaseDate, c.Name,m.POSTER,m.BACKDROP,m.OVERVIEW,m.TRAILER
    ORDER BY m.Title, s.ScreeningDate, s.ShowTime`;

    // advanced sql 5 join 
    const screeningsResult = await con.execute(screeningsQuery, [hallId], {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });

    console.log(screeningsResult.rows); 
    // Query to get distinct genres for the filtering dropdown
    const genresQuery = `SELECT DISTINCT GenreName FROM MovieWithGenre ORDER BY GenreName`; //basic sql (potential function)
    const genresResult = await con.execute(genresQuery, [], {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });


    const reviewsQuery = `
    SELECT NAME, COMMENTS, RATINGS
    FROM CINEMAHALLREVIEW CR JOIN PERSON P ON P.ID = CR.USERID  
    WHERE HALLID=:hallId AND P.ISACTIVE = 1
    `;
    //advanced sql
    const reviewsResult = await con.execute(reviewsQuery, [hallId], {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });


    const hallinfoQuery = `
    SELECT NAME, LOCATION, NUMBEROFROWS, SEATSPERROW, get_rating(C.HALLID, 2) AS RATING
    FROM CINEMA_HALL C
    WHERE HALLID = :hallId
    `;
    // funtion
    const hallinfoResult = await con.execute(hallinfoQuery, [hallId], {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });


    const seatinfoQuery = `
    SELECT DISTINCT(SEATTYPE) AS SEATTYPE FROM SEAT WHERE HALLID = :hallId
    `;
    //basic sql
    const seatinfoResult = await con.execute(seatinfoQuery, [hallId], {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });


    const reviewscountQuery = `
    SELECT COUNT(*)
    FROM CINEMAHALLREVIEW CR 
    WHERE HALLID = :hallId AND USERID = :userID
    `;
    //basic sql
    const userID = req.session.userID;

    const reviewscountResult = await con.execute(reviewscountQuery, { hallId, userID }, {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });

    const count = reviewscountResult.rows[0]['COUNT(*)'];
    const reviewCount = parseInt(count);

    const prevreviewsQuery = `
    SELECT 
    COALESCE(CR.COMMENTS, '') AS COMMENTS,
    NVL(CR.RATINGS, 0) AS RATING
    FROM 
    (
        SELECT :userID AS USERID, :hallId AS HALLID FROM DUAL 
    ) U
    LEFT JOIN 
    CINEMAHALLREVIEW CR ON U.USERID = CR.USERID AND U.HALLID = CR.HALLID
    `;
    //advance sql

    const prevreviewsResult = await con.execute(prevreviewsQuery, { hallId, userID }, {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });

    // Render the EJS template with the result and genres
  
    console.log(screeningsResult.rows);
    res.render("theaterScreenings", {
      screenings: screeningsResult.rows,
      genres: genresResult.rows.map((row) => row.GENRENAME), // Update to the correct field name
      hallName: screeningsResult.rows[0]
        ? screeningsResult.rows[0].HallName // Update to the correct field name
        : "Theater",
      role: req.session.userRole,
      userid: req.session.userID,
      reviews: reviewsResult.rows,
      updatereview: prevreviewsResult.rows,
      update: reviewCount,
      hall: hallinfoResult.rows,
      seat: seatinfoResult.rows,
      
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


router.post("/creview", async (req, res) => {
  const { userid, hallid, reviewDescription, reviewRating } = req.body;

  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });

    console.log(userid, hallid, reviewDescription, reviewRating);
   
    const insertreviewQuery = `
            INSERT INTO CINEMAHALLREVIEW (REVIEWID, HALLID, USERID, RATINGS, COMMENTS) 
            VALUES (cinemahallreview_seq.nextval, :hallid, :userid,:reviewRating, :reviewDescription) 
            `;
    //basic sql insert
    const result = await con.execute(
      insertreviewQuery,
      {
        hallid,
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


router.post("/updatecreview", async (req, res) => {
  const { userid, hallid, reviewDescription, reviewRating } = req.body;

  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });

    console.log(userid, hallid, reviewDescription, reviewRating);
    const updatereviewQuery = `
    UPDATE CINEMAHALLREVIEW 
    SET RATINGS = :reviewRating, COMMENTS = :reviewDescription
    WHERE HALLID = :hallid AND USERID = :userid
    `;
    //update basic sql
    const result = await con.execute(
      updatereviewQuery,
      {
        hallid,
        userid,
        reviewRating,
        reviewDescription,
      },
      { autoCommit: false }
    );

    // Commit the transaction to save changes
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

router.post("/deletecreview", async (req, res) => {
  const { userid, hallid, reviewDescription, reviewRating } = req.body;

  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });

    console.log(userid, hallid, reviewDescription, reviewRating);

    const deletereviewQuery = `
    DELETE FROM CINEMAHALLREVIEW 
    WHERE HALLID = :hallid AND USERID = :userid
    `;
    //basic sql delete
    const result = await con.execute(
      deletereviewQuery,
      {
        hallid,
        userid
      },
      { autoCommit: false }
    );

    // Commit the transaction to save changes
    await con.commit();

    res.send("delete successful");

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

