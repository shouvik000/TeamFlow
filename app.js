
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

// EJS configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Home route
app.get("/", (req, res) => {
    res.send("Welcome to TeamFlow SaaS 🚀");
});

// Server
app.listen(PORT, () => {
    console.log(`TeamFlow running at http://localhost:${PORT}`);
});