const express = require("express");
const router = express.Router();
const oracleDB = require("oracledb");


// besides admin activites , i also handle manage account information of user and hall admin
router.get("/admin/review-signups", async (req, res) => {
  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });

    // Fetch users who are pending approval
    const pendingQuery =
      "SELECT ID, Name, Email, UserRole FROM Person WHERE ISACTIVE = 0"; //basic sql
    const result = await con.execute(pendingQuery, [], {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });

    const adminQuery =
      "SELECT NAME,EMAIL,USERROLE FROM PERSON WHERE USERROLE='Admin'"; //basic sql
    const admin = await con.execute(adminQuery, [], {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });


    // Render the admin review page with the list of pending users
    res.render("admin-review", {
       pendingUsers: result.rows,
      role: "Admin",
        info: admin.rows });
  } catch (e) {
    console.error(e);
    res.status(500).send("Error retrieving pending sign-up requests.");
  } finally {
    if (con) {
      try {
        await con.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});
router.post("/admin/approve-signup", async (req, res) => {
  const { userID } = req.body; // Extracted from the submitted form
  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });

    // Update the user's Pending status to 0 (approved)
    const approveQuery = "UPDATE Person SET ISACTIVE = 1 WHERE ID = :userID";   //update 
    await con.execute(approveQuery, { userID }, { autoCommit: true });

    res.redirect("/admin/review-signups"); // Redirect back to the pending users list
  } catch (e) {
    console.error(e);
    res.status(500).send("Error approving user.");
  } finally {
    if (con) {
      try {
        await con.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

router.post("/admin/remove-signup", async (req, res) => {
  const { userID } = req.body;
  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });
    console.log(userID);
    const result = await con.execute("SELECT HALLID FROM HALLADMIN WHERE USERID= :userID", { userID });
    var hallID;
    if(result.rows.length > 0){
     hallID = result.rows[0][0]; 
    }
    console.log(hallID);

    if (hallID) {
      
      await con.execute("DELETE FROM HallAdmin WHERE USERID = :userID", { userID }, { autoCommit: false });
      await con.execute("DELETE FROM SEAT WHERE HALLID = :hallID", { hallID }, { autoCommit: false }); 
      await con.execute("DELETE FROM CINEMA_HALL WHERE HALLID = :hallID", { hallID }, { autoCommit: false });
      
    }else{
    await con.execute("DELETE FROM USERVOUCHER WHERE USERID = :userID", { userID }, { autoCommit: false });
    }
    const deletePersonQuery =
      "DELETE FROM Person WHERE ID = :userID AND ISACTIVE = 0";   //basic - delete
    await con.execute(deletePersonQuery, { userID }, { autoCommit: false });

    // Commit both deletions together
    await con.commit();

    res.redirect("/admin/review-signups"); // Redirect back to the pending users list
  } catch (e) {
    await con.rollback(); // Rollback if there's an error
    console.error(e);
    res.status(500).send("Error removing user.");
  } finally {
    if (con) {
      try {
        await con.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});
router.post("/update-info", async (req, res) => {
    const { currentPassword, email, password } = req.body;
    const adminID = req.session.userID; 
    let con;
    try {
      con = await oracleDB.getConnection({
        user: "c##showtimeDB",
        password: "showtimeDB",
        connectString: "localhost:1521/ORCL",
      });
  
      // Verify the current password
      const result = await con.execute(
        "SELECT get_user_password(:adminID) AS PASSWORD FROM DUAL",
        [adminID],
        { outFormat: oracleDB.OUT_FORMAT_OBJECT }
    );
    
  
      if (result.rows.length > 0 && result.rows[0].PASSWORD === currentPassword) {
        // Current password matches, proceed with update
        const updateFields = [];
        const updateValues = { adminID: adminID }; // Initialize with adminID
  
        if (email) {
          updateFields.push("Email = :email");
          updateValues.email = email;
        }
        if (password) {
          updateFields.push("Password = :password");
          updateValues.password = password;
        }
  
        if (updateFields.length > 0) {
          const updateQuery = `UPDATE Person SET ${updateFields.join(", ")} WHERE ID = :adminID`;  //update -basic
          await con.execute(updateQuery, updateValues, { autoCommit: true });
          res.send("Admin information updated successfully.");
        } else {
          res.send("No information to update.");
        }
      } else {
        // Current password does not match
        res.status(400).send("Current password is incorrect.");
      }
    } catch (e) {
      console.error(e);
      res.status(500).send("Error updating admin information.");
    } finally {
      if (con) {
        try {
          await con.close();
        } catch (err) {
          console.error(err);
        }
      }
    }
  });
  
router.post('/admin/replace', async (req, res) => {
    const { newName, newEmail, newPassword } = req.body;
    const currentAdminID = req.session.userID; 
    let con;
    try {
        con = await oracleDB.getConnection({
            user: "c##showtimeDB",
            password: "showtimeDB",
            connectString: "localhost:1521/ORCL",
        });

        // No need for "BEGIN"

        // Temporarily change the current admin's role
        const tempRoleUpdateQuery = "UPDATE Person SET UserRole = 'FormerAdmin' WHERE ID = :adminID";  //update- basic sql
        await con.execute(tempRoleUpdateQuery, { adminID: currentAdminID }, { autoCommit: false });

        // Insert new admin
        const insertNewAdminQuery = "INSERT INTO Person (ID, Name, Email, Password, UserRole,ISACTIVE) VALUES (person_seq.NEXTVAL, :name, :email, :password, 'Admin',1)"; //insert -basic sql
        await con.execute(insertNewAdminQuery, { name: newName, email: newEmail, password: newPassword }, { autoCommit: false });

        await con.execute("DELETE FROM USERVOUCHER WHERE USERID = :id", { id: currentAdminID }, { autoCommit: false });

        const deleteCurrentAdminQuery = "DELETE FROM Person WHERE ID = :id";  //delete - basic sql
        await con.execute(deleteCurrentAdminQuery, { id: currentAdminID }, { autoCommit: false });

        // Commit the transaction if all operations succeed
        await con.commit();

        // Logout the current admin session
        req.session.destroy();

        res.redirect("/");
    } catch (e) {
        // Rollback the transaction in case of failure
        await con.rollback();
        console.error(e);
        res.status(500).send("Error replacing admin.");
    } finally {
        if (con) {
            try {
                await con.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});
router.get('/account', (req, res) => {
  
    //change
    res.render('account', {
     role: req.session.userRole });
});

router.get("/admin/movie-review", async (req, res) => {
  let connection;
  try {
    connection = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });
    const result = await connection.execute(
      `SELECT * FROM MOVIE_STATUS_LOG S JOIN MOVIE M ON S.MOVIE_ID = M.MOVIEID WHERE STATUS = 1`, //advanced sql
      [],
      { outFormat: oracleDB.OUT_FORMAT_OBJECT }
    );

    res.render("movie-review", { movies: result.rows , role: req.session.userRole}); // Pass fetched movies to the EJS file
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching movies for review.");
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

// Update Movie Status
router.post("/admin/approve-movie", async (req, res) => {
  const { logId } = req.body; // Assuming log ID is sent in the request body

  let connection;
  try {
    connection = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });;
    await connection.execute(
      `UPDATE MOVIE_STATUS_LOG SET STATUS = 0 WHERE LOG_ID = :logId`, //basic sql- update
      [logId],
      { autoCommit: true }
    );

    res.send("Movie approved successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error approving movie.");
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

// Delete Movie
router.post("/admin/delete-movie", async (req, res) => {
  const { movieId } = req.body; // Assuming movie ID is sent in the request body

  let connection;
  try {
    connection = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });
    
    // Call the stored procedure to delete the movie and its related records
    await connection.execute(
      `BEGIN DeleteMovieCascade(:movieId,1); END;`,  //basic sql cascade
      { movieId: movieId }, // Bind parameters
      { autoCommit: true }
    );

    res.send("Movie deleted successfully.");
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send("Error deleting movie.");
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});




// Route to get movie details by movieId
router.get('/movie-details/:movieId', async (req, res) => {
    let connection;
    try {
        const { movieId } = req.params; // Extract movieId from URL parameters
        connection = await oracleDB.getConnection({
          user: "c##showtimeDB",
          password: "showtimeDB",
          connectString: "localhost:1521/ORCL",
        });

        const query = `
            SELECT MOVIEID, TITLE, POSTER, RELEASEDATE, BACKDROP, OVERVIEW, DIRECTORID, TRAILER
            FROM MOVIE
            WHERE MOVIEID = :movieId
        `; //basic sql

        const result = await connection.execute(query, [movieId], { outFormat: oracleDB.OUT_FORMAT_OBJECT });

        if (result.rows.length > 0) {
            const movie = result.rows[0];

            res.json(movie); // Send back the found movie details as JSON
        } else {
            res.status(404).send('Movie not found.');
        }
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error fetching movie details.');
    } finally {
        if (connection) {
            try {
                await connection.close(); // Ensure the database connection is closed
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

router.post('/user/delete-account', async (req, res) => {
  const { confirmPassword } = req.body;
  const userId = req.session.userID; // Assuming user ID is stored in session
  console.log(userId,confirmPassword);

  let connection;
  try {
      connection = await oracleDB.getConnection({
          user: "c##showtimeDB",
          password: "showtimeDB",
          connectString: "localhost:1521/ORCL",
      });

      // Fetch the current password from the database for verification
      const result = await connection.execute(
        "SELECT get_user_password(:userId) AS PASSWORD FROM DUAL",
        [userId],
        { outFormat: oracleDB.OUT_FORMAT_OBJECT }
    );
    

      if (result.rows.length > 0 && result.rows[0].PASSWORD === confirmPassword) {
          // Password matches, proceed with soft delete
          await connection.execute(`UPDATE Person SET ISACTIVE = 0 WHERE ID = :userId`, [userId]);
          await connection.commit();
          req.session.destroy(); // Destroy the session and log out the user
          res.send("Account successfully deleted.");
      } else {
          // Password does not match
          res.status(400).send("Incorrect password.");
      }
  } catch (err) {
      console.error('Error:', err);
      res.status(500).send("Error deleting account.");
  } finally {
      if (connection) {
          await connection.close();
      }
  }
});

router.post('/hall-admin/delete-account', async (req, res) => {
  const { confirmPassword } = req.body;
  const hallAdminId = req.session.userID; // Assuming hall admin ID is stored in session
  console.log(hallAdminId);

  let connection;
  try {
      connection = await oracleDB.getConnection({
          user: "c##showtimeDB",
          password: "showtimeDB",
          connectString: "localhost:1521/ORCL",
      });

      // Fetch the current password for verification
      const result = await connection.execute(
        "SELECT get_user_password(:hallAdminId) AS PASSWORD FROM DUAL",
        [hallAdminId],
        { outFormat: oracleDB.OUT_FORMAT_OBJECT }
    );
    

      if (result.rows.length > 0 && result.rows[0].PASSWORD === confirmPassword) {
          // Password matches, proceed with soft delete
          await connection.execute(`UPDATE Person SET ISACTIVE = 0 WHERE ID = :hallAdminId`, [hallAdminId]);

          await connection.commit();
          req.session.destroy(); // Destroy the session and log out the user
          res.send("Account successfully deleted.");
      } else {
          // Password does not match
          res.status(400).send("Incorrect password.");
      }
  } catch (err) {
      console.error('Error:', err);
      res.status(500).send("Error deleting account.");
  } finally {
      if (connection) {
          await connection.close();
      }
  }
});

module.exports = router;