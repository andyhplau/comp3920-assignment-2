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
    SELECT c.chatgroup_id, c.name AS group_name
    FROM chatgroup_user AS cu
    JOIN chatgroup AS c using(chatgroup_id)
    WHERE user_id = :userId;
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

module.exports = {
  createUser,
  getUser,
  addUsersToGroup,
  getAllUsers,
  createGroup,
  getAllGroups,
};
