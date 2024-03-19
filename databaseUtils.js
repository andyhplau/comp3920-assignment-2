const database = include("databaseConnection");

const createUser = async (postData) => {
  let createUserSQL = `
		INSERT INTO user
		(username, password)
		VALUES
		(:user, :passwordHash);
	`;

  let params = {
    user: postData.user,
    passwordHash: postData.hashedPassword,
  };

  try {
    const results = await database.query(createUserSQL, params);

    console.log("Successfully created user");
    console.log(results[0]);
    return true;
  } catch (err) {
    console.log("Error inserting user");
    console.log(err);
    return false;
  }
};

const getUser = async (postData) => {
  let getUserSQL = `
		SELECT user_id, username, password
		FROM user
		WHERE username = :user;
	`;

  let params = {
    user: postData.user,
  };

  try {
    const results = await database.query(getUserSQL, params);

    console.log("Successfully found user");
    console.log(results[0]);
    return results[0];
  } catch (err) {
    console.log("Error trying to find user");
    console.log(err);
    return false;
  }
};

const getAllUsers = async () => {
  let getAllUsersSQL = `
    SELECT user_id, username
    FROM user
  `;

  try {
    const results = await database.query(getAllUsersSQL);

    console.log("Successfully found all users");
    console.log(results[0]);
    return results[0];
  } catch (err) {
    console.log("Error trying to find all users");
    console.log(err);
    return false;
  }
};

const addUsersToGroup = async (postData) => {
  let addUsersToGroupSQL = `
    INSERT INTO chatgroup_user
    (user_id, chatgroup_id)
    VALUES
    (:userId, :chatgroupId);
  `;

  let params = {
    userId: postData.userId,
    chatgroupId: postData.chatgroupId,
  };

  try {
    const results = await database.query(addUsersToGroupSQL, params);

    console.log("Successfully added users to group");
    console.log(results[0]);
    return true;
  } catch (err) {
    console.log("Error adding users to group");
    console.log(err);
    return false;
  }
};

const createGroup = async (postData) => {
  let createGroupSQL = `
    INSERT INTO chatgroup
    (name, created_date)
    VALUES
    (:groupName, NOW());
  `;
  let params = { groupName: postData.groupName };
  try {
    const createGroupResults = await database.query(createGroupSQL, params);
    const chatgroupId = createGroupResults[0].insertId;
    const addUserResult = addUsersToGroup({
      userId: postData.userId,
      chatgroupId: chatgroupId,
    });
    if (!addUserResult) {
      return false;
    }
    const otherUsers =
      postData.users.length > 1 ? postData.users : [postData.users];
    otherUsers.forEach(async (userId) => {
      const addOtherUsersResult = addUsersToGroup({
        userId: userId,
        chatgroupId: chatgroupId,
      });
      if (!addOtherUsersResult) {
        return false;
      }
    });

    console.log("Successfully created group");
    console.log(createGroupResults[0]);
    return true;
  } catch (err) {
    console.log("Error creating group");
    console.log(err);
    return false;
  }
};

const getAllGroups = async (postData) => {
  let getAllGroupsSQL = `
  SELECT c.chatgroup_id, c.name AS group_name, cu.last_read_message_id, m.sent_time AS last_message_time, unread_count.num_messages_behind
  FROM chatgroup_user AS cu
  JOIN chatgroup AS c using(chatgroup_id)
  LEFT JOIN message AS m
  ON m.message_id = cu.last_read_message_id
  LEFT JOIN (
    SELECT  ocu.chatgroup_user_id, ocu.user_id, ocu.chatgroup_id, COUNT(unread_message.message_id) AS num_messages_behind
    FROM chatgroup_user AS ocu
    JOIN (
      SELECT *
      FROM chatgroup_user AS icu
      JOIN message AS m USING (chatgroup_user_id)
      WHERE icu.last_read_message_id < m.message_id
    ) AS unread_message USING (chatgroup_user_id)
    GROUP BY ocu.chatgroup_user_id
  ) AS unread_count USING (user_id, chatgroup_id)
  WHERE cu.user_id = :userId;
  `;

  let params = {
    userId: postData.userId,
  };

  try {
    const results = await database.query(getAllGroupsSQL, params);

    console.log(`Successfully found all groups for user ${postData.userId}`);
    console.log(results[0]);
    return results[0];
  } catch (err) {
    console.log(`Error trying to find all groups for user ${postData.userId}`);
    console.log(err);
    return false;
  }
};

const getAllMessages = async (postData) => {
  let getAllMessagesSQL = `
    SELECT u.user_id, u.username, cu.chatgroup_user_id, m.message_id, m.text, m.sent_time, cu.last_read_message_id
    FROM message AS m
    JOIN chatgroup_user AS cu USING (chatgroup_user_id)
    JOIN user AS u USING (user_id)
    WHERE cu.chatgroup_id = :chatgroupId
    ORDER BY m.sent_time ASC;
  `;

  let params = {
    chatgroupId: postData.chatgroupId,
  };

  try {
    const results = await database.query(getAllMessagesSQL, params);

    console.log(
      `Successfully found all messages for group ${postData.chatgroupId}`
    );
    console.log(results[0]);
    return results[0];
  } catch (err) {
    console.log(
      `Error trying to find all messages for group ${postData.chatgroupId}`
    );
    console.log(err);
    return false;
  }
};

const getChatgroupUserId = async (postData) => {
  let getChatgroupUserIdSQL = `
    SELECT chatgroup_user_id
    FROM chatgroup_user
    WHERE user_id = :userId AND chatgroup_id = :chatgroupId;
  `;

  let params = {
    userId: postData.userId,
    chatgroupId: postData.chatgroupId,
  };

  try {
    const results = await database.query(getChatgroupUserIdSQL, params);

    console.log(
      `Successfully found chatgroup_user_id for user ${postData.userId} and group ${postData.chatgroupId}`
    );
    console.log(results[0]);
    return results[0];
  } catch (err) {
    console.log(
      `Error trying to find chatgroup_user_id for user ${postData.userId} and group ${postData.chatgroupId}`
    );
    console.log(err);
    return false;
  }
};

const sendMessage = async (postData) => {
  let sendMessageSQL = `
    INSERT INTO message
    (chatgroup_user_id, text, sent_time)
    VALUES
    (:chatgroupUserId, :text, NOW());
  `;

  let params = {
    chatgroupUserId: postData.chatgroupUserId,
    text: postData.text,
  };

  try {
    const results = await database.query(sendMessageSQL, params);

    console.log("Successfully sent message");
    console.log(results[0]);
    return true;
  } catch (err) {
    console.log("Error sending message");
    console.log(err);
    return false;
  }
};

const updateLastReadMessage = async (postData) => {
  let updateLastReadMessageSQL = `
    UPDATE chatgroup_user
    SET last_read_message_id = :lastReadMessageId
    WHERE chatgroup_user_id = :chatgroupUserId;
  `;

  let params = {
    lastReadMessageId: postData.lastReadMessageId,
    chatgroupUserId: postData.chatgroupUserId,
  };

  try {
    const results = await database.query(updateLastReadMessageSQL, params);

    console.log("Successfully updated last read message");
    console.log(results[0]);
    return true;
  } catch (err) {
    console.log("Error updating last read message");
    console.log(err);
    return false;
  }
};

module.exports = {
  createUser,
  getUser,
  addUsersToGroup,
  getAllUsers,
  createGroup,
  getAllGroups,
  getAllMessages,
  getChatgroupUserId,
  sendMessage,
  updateLastReadMessage,
};
