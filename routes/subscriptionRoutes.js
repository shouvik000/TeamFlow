const express = require("express");

const router = express.Router();

const subscriptionController =
    require("../controllers/subscriptionController");

const {
    isAuthenticated
} = require("../middleware/authMiddleware");

const {
    loadOrganization
} = require("../middleware/tenantMiddleware");


// ============================================
// Plans
// ============================================

router.get(
    "/plans",
    isAuthenticated,
    loadOrganization,
    subscriptionController.getPlans
);


// ============================================
// Usage
// ============================================

router.get(
    "/usage",
    isAuthenticated,
    loadOrganization,
    subscriptionController.getUsage
);


// ============================================
// Create payment order
// ============================================

router.post(
    "/create-order",
    isAuthenticated,
    loadOrganization,
    subscriptionController.createOrder
);


// ============================================
// Verify payment
// ============================================

router.post(
    "/verify-payment",
    isAuthenticated,
    loadOrganization,
    subscriptionController.verifyPayment
);


module.exports = router;