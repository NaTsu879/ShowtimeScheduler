const express = require("express");
const router = express.Router();
const oracleDB = require("oracledb");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });

    // Adjusted to select ID instead of UserID
    const userQuery = `SELECT ID, Email, get_user_password(ID) as password, UserRole FROM Person WHERE Email = :email AND ISACTIVE <> 0`;  //Basic
    const result = await con.execute(userQuery, [email], {
      outFormat: oracleDB.OUT_FORMAT_OBJECT,
    });

    if (result.rows.length > 0) {
      const user = result.rows[0];
        if (password === user.PASSWORD) {
          // Password is correct, set user session
          req.session.userID = user.ID; // Correctly uses ID from the table
          req.session.userRole = user.USERROLE;

          // Redirect user based on their role
          // Additional logic for HallAdmin to fetch HALLID
          if (user.USERROLE === "HallAdmin") {
            const HALL_ADMIN_QUERY = `SELECT HALLID FROM HALLADMIN WHERE USERID = :userId`;   //basic
            const hallAdminResult = await con.execute(HALL_ADMIN_QUERY, [user.ID], { outFormat: oracleDB.OUT_FORMAT_OBJECT });

            if (hallAdminResult.rows.length > 0) {
              const hallAdmin = hallAdminResult.rows[0];
              req.session.hallID = hallAdmin.HALLID; 
              console.log(req.session.hallID); // Store HALLID in session
              res.redirect("/hall_admin/screening");
            } else {
              // Handle case where HallAdmin does not have a hall assigned
              res.status(404).send("No hall assigned to this HallAdmin.");
            }
          } else {
            // Redirect based on user role
            switch (user.USERROLE) {
              case "Admin":
                res.redirect("/admin/review-signups");
                break;
              default:
                res.redirect("/home");
            }
          }
        } else {
          res.status(400).send("Invalid password.");
        }
    } else {
      res.status(404).send("User not found/Your account is pending approval");
    }
  } catch (e) {
    console.error(e);
    res.status(500).send("Error during DB operation.");
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

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            return res.status(500).send('Could not log out, please try again.');
        }
        // Redirect to login page 
        res.redirect('/');
    });
});



// Route for User Signup
router.get("/signup/user", (req, res) => {
  res.render("signup", { role: "User" });
});





// Route for Hall Admin Signup
router.get("/signup/hall-admin", (req, res) => {
  res.render("signup", { role: "HallAdmin" });
});

router.post("/signup", async (req, res) => {
  const { name, email, password, role, hallName, location, numberOfRows, seatsPerRow } = req.body;
  console.log( password, role, hallName, location);
  let con;
  try {
    con = await oracleDB.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });

    // INSERT into PERSON table i
    const insertPersonQuery = `
            INSERT INTO PERSON (ID, NAME, EMAIL, PASSWORD, USERROLE ) 
            VALUES (PERSON_SEQ.NEXTVAL, :name, :email, :password, :role ) 
            RETURNING ID INTO :id`;                                           //Insert

    const result = await con.execute(
      insertPersonQuery,
      {
        name,
        email,
        password,
        role,
        id: { dir: oracleDB.BIND_OUT, type: oracleDB.NUMBER },
      },
      { autoCommit: false }
    );

    const newUserId = result.outBinds.id[0];
    await con.commit();

    // If signing up as HallAdmin, call the procedure to handle the rest
    if (role === "HallAdmin") {
      console.log("Yes");
      console.log(newUserId,hallName);
      await con.execute(  //Procedure,Cascade insert -Pl/sql
        `BEGIN
           REGISTER_HALL_ADMIN(:userId, :hallName, :location, :numberOfRows, :seatsPerRow);   
         END;`,
        {
          userId: newUserId,
          hallName,
          location,
          numberOfRows,
          seatsPerRow,
        },
        { autoCommit: false }
      );
      await con.commit();
    } 
    res.send("Signup successful");
  } catch (e) {
    // ROLLBACK in case of errors
    await con.rollback();
    console.error(e);
    res.status(500).send("Error during signup process.");
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

router.get("/restore", (req, res) => {
  res.render("restore-account");
});

router.post('/restore-account', async (req, res) => {
  const { email, password } = req.body;

  let connection;
  try {
      connection = await oracleDB.getConnection({
          user: "c##showtimeDB",
          password: "showtimeDB",
          connectString: "localhost:1521/ORCL",
      });

      // Check if there's a matching inactive account with the provided email and password
      const result = await connection.execute(
          `SELECT ID FROM Person WHERE EMAIL = :email AND PASSWORD = :password AND ISACTIVE = 0`,
          [email, password],
          { outFormat: oracleDB.OUT_FORMAT_OBJECT }
      );

      if (result.rows.length > 0) {
          // Restore the account by setting ISACTIVE to 1
          await connection.execute(
              `UPDATE Person SET ISACTIVE = 1 WHERE EMAIL = :email`,   //update - basic
              [email],
              { autoCommit: true }
          );
          res.send("Account successfully restored.");
      } else {
          res.status(400).send("No matching inactive account found, or incorrect credentials provided.");
      }
  } catch (err) {
      console.error('Error:', err);
      res.status(500).send("Error restoring account.");
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



module.exports = router;
