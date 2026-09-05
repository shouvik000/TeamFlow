
const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

// Registration page
router.get("/register", authController.showRegister);

// Register user
router.post("/register", authController.register);

module.exports = router;