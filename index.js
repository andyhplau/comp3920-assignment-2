//#region INITIAL SETUP
require("./utils");
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
saltRounds = 12;
const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
//#end region INITIAL SETUP

//#region MONGODB SETUP
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@assignment-2.w9g8g2s.mongodb.net/sessions`,
  crypto: {
    secret: mongodb_session_secret,
  },
});
//#end region MONGODB SETUP

//#region SESSION SETUP
const node_session_secret = process.env.NODE_SESSION_SECRET;
app.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
  })
);
//#end region SESSION SETUP

// Routes
app.get("/", (req, res) => {
  res.render("index", { title: "Hello, World!" });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
