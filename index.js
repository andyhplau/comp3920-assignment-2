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
  if (isValidSession(req)) {
    res.redirect("/user");
    return;
  } else {
    res.render("index", { username: req.session.username });
  }
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

app.get("/user", async (req, res) => {
  try {
    const groups = await db.getAllGroups({ userId: req.session.user_id });
    await Promise.all(
      groups.map(async (group, i) => {
        await db
          .getLatestMessage({
            chatgroupId: group.chatgroup_id,
          })
          .then((message) => {
            if (message.length > 0) {
              group.last_message_time = message[0].sent_time;
            }
          });
        await db
          .getUnreadMessagesCount({
            lastReadMessageId: group.last_read_message_id,
            chatgroupId: group.chatgroup_id,
          })
          .then((count) => {
            group.unread_count = count[0].unread_count;
          });
      })
    );
    res.render("user", { username: req.session.username, groups: groups });
  } catch (error) {
    console.error(error);
    res.render("error", {
      error: "Failed to get groups.",
      username: req.session.username,
    });
  }
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

app.get("/user/chatgroup/:chatgroupId", async (req, res) => {
  let lastReadMessageId;
  db.getChatgroupUser({
    userId: req.session.user_id,
    chatgroupId: req.params.chatgroupId,
  }).then(async (user) => {
    await db
      .getAllMessages({ chatgroupId: req.params.chatgroupId })
      .then(async (messages) => {
        lastReadMessageId = user[0].last_read_message_id;
        let emojiReactions = [];
        if (messages.length > 0) {
          await db.updateLastReadMessage({
            lastReadMessageId: messages[messages.length - 1].message_id,
            chatgroupUserId: user[0].chatgroup_user_id,
          });
          try {
            await Promise.all(
              await messages.map(async (message) => {
                await db
                  .getEmojiInMessage({
                    messageId: message.message_id,
                  })
                  .then((emojis) => {
                    emojiReactions.push({
                      messageId: message.message_id,
                      emojis,
                    });
                  });
              })
            );
            res.render("group", {
              username: req.session.username,
              userId: req.session.user_id,
              chatgroupId: req.params.chatgroupId,
              messages: messages,
              chatgroupUserId: user[0].chatgroup_user_id,
              lastReadMessageId: lastReadMessageId,
              emojiReactions,
            });
          } catch (err) {
            console.log(err);
            res.render("error", {
              error: "Failed to get emoji reactions.",
              username: req.session.username,
            });
          }
        } else {
          res.render("group", {
            username: req.session.username,
            userId: req.session.user_id,
            chatgroupId: req.params.chatgroupId,
            messages: messages,
            chatgroupUserId: user[0].chatgroup_user_id,
            lastReadMessageId: lastReadMessageId,
            emojiReactions,
          });
        }
      });
  });
});

app.get("/user/invite/:chatgroupId", (req, res) => {
  db.getAllUsers().then((users) => {
    db.getAllUsersNotInGroup({ chatgroupId: req.params.chatgroupId }).then(
      (otherUsers) => {
        groupUsers = users.filter((user) => !otherUsers.includes(user));
        res.render("invite", {
          username: req.session.username,
          otherUsers,
          groupUsers,
          chatgroupId: req.params.chatgroupId,
          lastReadMessageId: req.query.lastReadMessageId,
        });
      }
    );
  });
});

app.get("/user/emoji/:chatgroupId/:messageId", (req, res) => {
  db.getAllEmojis().then((emojis) => {
    res.render("emoji", {
      username: req.session.username,
      emojis: emojis,
      chatgroupId: req.params.chatgroupId,
      messageId: req.params.messageId,
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
  req.session.destroy(() => {
    res.redirect("/");
    return;
  });
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

app.post("/user/api/sendMessage/:chatgroupId", async (req, res) => {
  db.getChatgroupUser({
    userId: req.session.user_id,
    chatgroupId: req.params.chatgroupId,
  }).then((id) => {
    const result = db.sendMessage({
      chatgroupUserId: id[0].chatgroup_user_id,
      text: req.body.text,
    });
    if (result) {
      res.redirect(`/user/chatgroup/${req.params.chatgroupId}`);
    } else {
      res.render("error", {
        error: "Failed to send message.",
        username: req.session.username,
      });
    }
  });
});

app.get(
  "/user/api/updateLastReadMessage/:chatgroupId/:chatgroupUserId",
  async (req, res) => {
    await db
      .getAllMessages({ chatgroupId: req.params.chatgroupId })
      .then(async (messages) => {
        let result = 1;
        if (messages.length > 0) {
          result = await db.updateLastReadMessage({
            lastReadMessageId: messages[messages.length - 1].message_id,
            chatgroupUserId: req.params.chatgroupUserId,
          });
        }
        if (result) {
          res.redirect("/user");
        } else {
          res.redirect("/error", {
            error: "Failed to update last read message.",
            username: req.session.username,
          });
        }
      });
  }
);

app.post("/user/api/invite/:chatgroupId", async (req, res) => {
  if (req.body.invitedUsers) {
    try {
      let result;
      if (req.body.invitedUsers.length > 1) {
        result = await Promise.all(
          req.body.invitedUsers.forEach(async (userId) => {
            await db.addUserToGroup({
              userId: userId,
              chatgroupId: req.params.chatgroupId,
              lastReadMessageId: req.query.lastReadMessageId,
            });
          })
        );
      } else {
        result = await db.addUserToGroup({
          userId: req.body.invitedUsers,
          chatgroupId: req.params.chatgroupId,
          lastReadMessageId: req.query.lastReadMessageId,
        });
      }
      if (result) {
        res.redirect(`/user/chatgroup/${req.params.chatgroupId}`);
      }
    } catch (err) {
      console.log(err);
      res.render("error", {
        error: "Failed to invite users.",
        username: req.session.username,
      });
    }
  } else {
    res.redirect(`/user/chatgroup/${req.params.chatgroupId}`);
  }
});

app.post("/user/api/reactEmoji/:chatgroupId/:messageId", async (req, res) => {
  db.reactEmojiToMessage({
    messageId: req.params.messageId,
    userId: req.session.user_id,
    emojiId: req.body.emojis,
  }).then((result) => {
    if (result) {
      res.redirect(`/user/chatgroup/${req.params.chatgroupId}`);
    } else {
      res.render("error", {
        error: "Failed to react emoji.",
        username: req.session.username,
      });
    }
  });
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
