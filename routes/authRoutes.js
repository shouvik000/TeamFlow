const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");


// ============================
// REGISTER
// ============================

// Show registration page
router.get(
    "/register",
    authController.showRegister
);

// Process registration
router.post(
    "/register",
    authController.register
);


// ============================
// LOGIN
// ============================

// Show login page
router.get(
    "/login",
    authController.showLogin
);

// Process login
router.post(
    "/login",
    authController.login
);


// ============================
// LOGOUT
// ============================

router.post(
    "/logout",
    authController.logout
);


module.exports = router;