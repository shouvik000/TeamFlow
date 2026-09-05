
const express = require("express");
const path = require("path");
require("dotenv").config();

const pool = require("./config/db");

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


app.get("/db-test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            success: true,
            message: "Database connected successfully",
            time: result.rows[0].now
        });

    } catch (error) {
        console.error("Database test error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});








// Server
app.listen(PORT, () => {
    console.log(`TeamFlow running at http://localhost:${PORT}`);
});