// bookingRoute.js
const express = require("express");
const oracledb = require("oracledb");
const router = express.Router();

router.get("/booking/:hallId/:screeningId", async (req, res) => {
  const { hallId, screeningId } = req.params;
  let connection;

  try {
    connection = await oracledb.getConnection({
      user: "c##showtimeDB",
      password: "showtimeDB",
      connectString: "localhost:1521/ORCL",
    });

    const seatsQuery = `
    SELECT s.SeatID, s.RowLabel, s.SeatNumber, REPLACE(s.SeatType,' ','') as "SEATTYPE",
           CASE WHEN t.TicketID IS NULL THEN 'available' ELSE 'reserved' END AS Status
    FROM Seat s
    LEFT JOIN Ticket t ON s.SeatID = t.SeatID AND t.ScreeningID = :screeningId
    WHERE s.HallID = :hallId
    ORDER BY s.RowLabel, s.SeatNumber 
`;         // advanced sql

    const seatsResult = await connection.execute(
      seatsQuery,
      [screeningId, hallId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const seats = seatsResult.rows.map((row) => ({
      seatID: row.SEATID,
      rowLabel: row.ROWLABEL,
      seatNumber: row.SEATNUMBER,
      seatType: row.SEATTYPE,
      status: row.STATUS,
    }));

    res.render("seat-map", {
      seats: seats,
      hallId: hallId,
      screeningId: screeningId,
      role: req.session.userRole,
    });
  } catch (err) {
    console.error("Error fetching seats data", err);
    res.status(500).send("Error fetching seats data");
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing database connection", err);
      }
    }
  }
});
let tempStorage = {};
router.post("/payment-processing", async (req, res) => {
    const { hallId, screeningId, selectedSeats } = req.body;
    console.log(selectedSeats);
    const userId = req.session.userID; // Assuming the user's ID is stored in the session
    let connection;
  
    try {
      connection = await oracledb.getConnection({
        user: "c##showtimeDB",
        password: "showtimeDB",
        connectString: "localhost:1521/ORCL",
      });
  
      // Fetch user name
      const userQuery = `SELECT NAME FROM PERSON WHERE ID = :userId`;   //basic
      const userResult = await connection.execute(userQuery, [userId], {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });
      const userName = userResult.rows[0].NAME;
  
      // Fetch hall name, movie name, show time, and date
      const hallMovieQuery = `SELECT CH.NAME AS HALLNAME, M.TITLE AS MOVIENAME, 
                                      S.SHOWTIME, S.SCREENINGDATE 
                              FROM CINEMA_HALL CH
                              JOIN SCREENING S ON CH.HALLID = S.HALLID
                              JOIN MOVIE M ON S.MOVIEID = M.MOVIEID
                              WHERE S.SCREENINGID = :screeningId AND S.HALLID = :hallId`;       //advanced sql
      const hallMovieResult = await connection.execute(hallMovieQuery, { screeningId, hallId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const { HALLNAME, MOVIENAME, SHOWTIME, SCREENINGDATE } = hallMovieResult.rows[0];
  
      // Fetch seat details
      let seatDetails = [];
      for (let seatId of selectedSeats.map((seat) => seat.seatID)) {
        const seatQuery = `SELECT SEATID, ROWLABEL, SEATNUMBER, SEATTYPE, 
                           (SELECT PRICE FROM SEATPRICE WHERE SEATTYPE = S.SEATTYPE) AS PRICE
                           FROM SEAT S WHERE SEATID = :seatId`;       //advanced sql
        const result = await connection.execute(seatQuery, { seatId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (result.rows.length > 0) {
          seatDetails.push(result.rows[0]);
        }
      }
  
      // Fetch available vouchers
      const voucherQuery = `SELECT V.DESCRIPTION, V.DISCOUNTRATE,V.VOUCHERID,REMAININGUSES FROM USERVOUCHER UV 
                            JOIN VOUCHER V ON UV.VOUCHERID = V.VOUCHERID 
                            WHERE UV.USERID = :userId AND REMAININGUSES > 0 AND UV.EXPIRYDATE >= SYSDATE`; //advanced sql
      const voucherResult = await connection.execute(voucherQuery, [userId], {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const availableVouchers = voucherResult.rows;
      console.log(seatDetails);
      console.log(availableVouchers);
      tempStorage[req.sessionID] = {
        userName: userName,
        seatDetails: seatDetails,
        availableVouchers: availableVouchers,
        hallId: hallId,
        hallName: HALLNAME,
        screeningId: screeningId,
        movieName: MOVIENAME,
        showTime: SHOWTIME, 
        screeningDate: SCREENINGDATE 
      };
      res.json({ redirectURL: '/booking/payment' });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send("Error processing payment");
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error closing database connection", err);
        }
      }
    }
  });
  router.get('/booking/payment', (req, res) => {
    // Retrieve stored data using sessionID
    const data = tempStorage[req.sessionID];
    if (data) {
        // Optionally, clean up the tempStorage to prevent memory leaks
        delete tempStorage[req.sessionID];

        res.render('payment-page', data);
    } else {
        res.status(404).send('Session data not found or payment processing not completed.');
    }
});

router.post('/booking-processing', async (req, res) => {
  console.log(req.body);
  const { hallId, screeningId, selectedSeats, voucherId, voucherApplications } = req.body;
  const userId = req.session.userID;

  let connection;

  try {
      connection = await oracledb.getConnection({
          user: "c##showtimeDB",
          password: "showtimeDB",
          connectString: "localhost:1521/ORCL",
      });

      for (const seatId of selectedSeats) {   //procedure - pl-sql (cascade insert)
        await connection.execute(
          `BEGIN
             process_ticket_purchase(:SCREENINGID, :USERID, :SEATID);
           END;`,    
          { SCREENINGID: screeningId, USERID: userId, SEATID: seatId },
          { autoCommit: true }
        );
      }

      if (voucherId && voucherApplications && voucherApplications.length > 0) {
        await connection.execute(
          `UPDATE USERVOUCHER SET REMAININGUSES = REMAININGUSES - :VOUCHERAPPLICATIONS 
           WHERE VOUCHERID = :VOUCHERID AND USERID = :USERID AND REMAININGUSES >= :VOUCHERAPPLICATIONS`,   //update -basic sql
          {
              VOUCHERID: voucherId,
              USERID: userId,
              VOUCHERAPPLICATIONS: voucherApplications.length, 
          },
          { autoCommit: true }
        );
      }

      res.json({ message: 'Booking successful' });
  } catch (error) {
      console.error('Error:', error);
      if (error.message.includes('Seat is already booked')) {
          return res.status(400).json({ error: 'Transaction failed. At least one seat is already booked.' });
      }
      res.status(500).json({ error: error.message });
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
