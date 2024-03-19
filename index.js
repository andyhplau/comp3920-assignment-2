//#region INITIAL SETUP
require("./utils");
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const app = express();
const port = process.env.PORT || 3000;
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
const db = require("./databaseUtils");
saltRounds = 12;
const expireTime = 60 * 60 * 1000;
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

const isValidSession = (req) => {
  if (req.session.authenticated) {
    return true;
  } else {
    return false;
  }
};

const sessionValidation = (req, res, next) => {
  if (!isValidSession(req)) {
    req.session.destroy();
    res.redirect("/");
    return;
  } else {
    next();
  }
};

app.use("/user", sessionValidation);
//#end region MIDDLEWARES

//#region Routes
app.get("/", (req, res) => {
  res.render("index", { username: req.session.username });
});

app.get("/signup", (req, res) => {
  var missingUsername = req.query.missingUsername;
  var missingPassword = req.query.missingPassword;
  res.render("signup", {
    username: req.session.username,
    missingUsername: missingUsername,
    missingPassword: missingPassword,
  });
});

app.get("/login", (req, res) => {
  var missingUsername = req.query.missingUsername;
  var missingPassword = req.query.missingPassword;
  var incorrectUsername = req.query.incorrectUsername;
  var incorrectPassword = req.query.incorrectPassword;
  res.render("login", {
    username: req.session.username,
    missingUsername: missingUsername,
    missingPassword: missingPassword,
    incorrectUsername: incorrectUsername,
    incorrectPassword: incorrectPassword,
  });
});

app.get("/user", (req, res) => {
  console.log(req.session.user_id);
  db.getAllGroups({ userId: req.session.user_id }).then((groups) =>
    res.render("user", { username: req.session.username, groups: groups })
  );
});

app.get("/user/createGroup", (req, res) => {
  db.getAllUsers().then((users) => {
    otherUsers = users.filter((user) => user.user_id != req.session.user_id);
    res.render("createGroup", {
      username: req.session.username,
      users: otherUsers,
    });
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
      res.render("error", {
        error: "Failed to create user.",
        username: req.session.username,
      });
      return;
    }
  }
});

app.post("/api/login", async (req, res) => {
  var username = req.body.username;
  var password = req.body.password;

  if (!username && !password) {
    res.redirect("/login?missingUsername=1&missingPassword=1");
    return;
  } else if (!username) {
    res.redirect("/login?missingUsername=1");
    return;
  } else if (!password) {
    res.redirect("/login?missingPassword=1");
    return;
  } else {
    var results = await db.getUser({
      user: username,
      hashedPassword: password,
    });

    if (results) {
      if (results.length == 1) {
        if (bcrypt.compareSync(password, results[0].password)) {
          req.session.authenticated = true;
          req.session.username = username;
          req.session.user_id = results[0].user_id;
          req.session.cookie.maxAge = expireTime;
          res.redirect("/user");
          return;
        } else {
          res.redirect("/login?incorrectPassword=1");
          return;
        }
      }
    } else {
      res.redirect("/login?incorrectUsername=1");
      return;
    }
  }
});

app.get("/api/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
  return;
});

app.post("/user/api/createGroup", async (req, res) => {
  var result = await db.createGroup({
    groupName: req.body.groupName,
    users: req.body.users,
    userId: req.session.user_id,
  });
  if (result) {
    console.log("Successfully created group");
    res.redirect("/user");
    return;
  } else {
    console.log("Failed to create group");
    res.render("error", {
      error: "Failed to create group.",
      username: req.session.username,
    });
    return;
  }
});
//#end region APIs

// Catch all not found pages
app.get("*", (req, res) => {
  res.status(404);
  res.send("Page not found - 404");
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
