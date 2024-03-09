const express = require('express');
const bodyParser = require('body-parser');
const oracleDB = require('oracledb');
const movieRoutes = require('./routes/movieRoutes');
const theaterRoutes = require('./routes/theaterRoutes');
const authRoutes = require('./routes/authRoutes'); 
const  adminactivitiesRoutes = require('./routes/adminactivitiesRoutes'); 
const session = require('express-session');
const bookingRoute = require('./routes/bookingRoute');
const hallAdminRoutes = require('./routes/hallAdminRoutes');

const app = express();


app.set('view engine', 'ejs'); // Tell Express to use EJS as the templating engine
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files from the public directory


app.get('/', (req, res) => {
    res.render('login', function(err, html) {
        if (err) {
            console.log(err);
            res.send("Error rendering the main page.");
        } else {
            res.send(html);
        }
    });
});

app.use(session({
    secret: 'f3b8b3e92c9e62ec8c14a2d71c4c59a3b6f9b3e2c9d1e2f3a4b5c6d7e8f9a0b1c2d3e4f567890123456789abcdef0123456',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: !true } // Use true in production
}));

app.use(authRoutes);

function ensureAuthenticated(req, res, next) {
    if (req.session.userID) {
        next();
    } else {
        res.redirect('/');
    }
}


app.use(ensureAuthenticated);

app.use(movieRoutes);
app.use(theaterRoutes);
app.use(adminactivitiesRoutes)
app.use(bookingRoute);
app.use(hallAdminRoutes);


app.get('/home',ensureAuthenticated,(req, res) => {
    res.render('main',{
        role: req.session.userRole }, function(err, html) {
        if (err) {
            console.log(err);
            res.send("Error rendering the main page.");
        } else {
            res.send(html);
        }
    });
});


app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

