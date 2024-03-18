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
const db = require("./databaseUtils");
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

//#region MIDDLEWARES
app.use(express.urlencoded({ extended: false }));

//#region Routes
app.get("/", (req, res) => {
  res.render("index", { title: "Hello, World!" });
});

app.get("/signup", (req, res) => {
  var missingUsername = req.query.missingUsername;
  var missingPassword = req.query.missingPassword;
  res.render("signup", {
    missingUsername: missingUsername,
    missingPassword: missingPassword,
  });
});

//#end region Routes

//#region APIs
app.post("/api/signup", async (req, res) => {
  var username = req.body.username;
  var password = req.body.password;
  if (!username && !password) {
    res.redirect("/signup?missingUsername=1&missingPassword=1");
    return;
  } else if (!username) {
    res.redirect("/signup?missingUsername=1");
    return;
  } else if (!password) {
    res.redirect("/signup?missingPassword=1");
    return;
  } else {
    var hashedPassword = bcrypt.hashSync(password, saltRounds);
    var success = await db.createUser({
      user: username,
      hashedPassword: hashedPassword,
    });

    if (success) {
      res.redirect("/");
      return;
    } else {
      res.render("error", { error: "Failed to create user." });
      return;
    }
  }
});
//#end region APIs

// Always the last route to catch all not found pages
app.get("*", (req, res) => {
  res.status(404);
  res.send("Page not found - 404");
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
