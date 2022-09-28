const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const databasePath = path.join(__dirname, "twitterClone.db");

const app = express();

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//Authenticate Token

const authenticateToken = (request, response, next) => {
  let jwtToken;
  console.log(request.headers.authorization);
  let authHeader = request.headers.authorization;
  console.log(authHeader);
  if (authHeader !== undefined) {
    jwtToken = request.headers.authorization.split(" ")[1];
  }
  console.log(jwtToken);
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

//Register API1

app.post("/register/", async (request, response) => {
  const { username, name, password, gender } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}'
        );`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.send(`User created successfully`);
    }
  } else {
    response.status = 400;
    response.send("User already exists");
  }
});

//Login API2

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const q = `
    SELECT * FROM user WHERE username='${username}';`;
  const dbRes = await db.get(q);
  if (dbRes === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    let isPasswordMatched = await bcrypt.compare(password, dbRes.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_SECRET_KEY");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//Get user API3

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const q = `
    SELECT username,tweet,date_time FROM 
    user INNER JOIN tweet ON user.user_id=tweet.user_id 
    ORDER BY date_time LIMIT ${4};`;
  const dbRes = await db.all(q);
  response.send(dbRes);
});

module.exports = app;
