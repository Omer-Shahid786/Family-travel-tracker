import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "World",
  password: "1122",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

async function currentUser(currentUserId) {
  try {
    const user = await db.query("SELECT * FROM users");
    const data = user.rows;

    for (var i = 0; i < data.length; i++) {
      if (data[i].id == currentUserId) {
        return data[i];
      }
    }

    return null; // Return null if the user is not found
  } catch (err) {
    console.error("Error executing query", err.stack);
    throw err; // Re-throw the error for proper handling in the calling code
  }
}


async function checkVisited() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN users ON users.id = visited_countries.user_id WHERE visited_countries.user_id = $1;", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
let error_status = "false"
app.get("/", async (req, res) => {
  try {
    const countries = await checkVisited();
    const user = await currentUser(currentUserId); // Pass currentUserId here
    if (!user) {
      throw new Error("User not found"); // Handle case where user is null
    }
    if (error_status == "true") {
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users: users,
        color: user.color,
        error: "Already visited"
      });
    } else if (error_status == "true1") {
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users: users,
        color: user.color,
        error: "There is no such country"
      });
    }
    else if (error_status == "false") {
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users: users,
        color: user.color,
        error: null
      });

    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});
error_status = "false";
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code,user_id) VALUES ($1,$2)",
        [countryCode, currentUserId]
      );
      error_status = "false";
      res.redirect("/");
    } catch (err) {
      console.log(err);
      error_status = "true";
      res.redirect("/");
    }
  } catch (err) {
    console.log(err);
    error_status = "true1"
    res.redirect("/")
  }
});
app.post("/user", async (req, res) => {
  if (req.body.add == "new") {
    res.render("new.ejs")
  } else {
    currentUserId = req.body.user;
    res.redirect('/');
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;
  const result = await db.query("INSERT INTO users(name,color) VALUES ($1,$2) RETURNING *;", [name, color]);
  users.push(result.rows[0]);
  currentUserId = result.rows[0].id;
  error_status = "false"
  res.redirect("/");
});

//Hint: The RETURNING keyword can return the data that was inserted.
//https://www.postgresql.org/docs/current/dml-returning.html


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
