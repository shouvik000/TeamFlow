const express = require("express");

const router =
    express.Router();


const subscriptionApiController =
    require("../../controllers/subscriptionApiController");


const {
    isApiAuthenticated
} = require("../../middleware/authMiddleware");


// ============================================
// Plans
// ============================================

router.get(
    "/plans",

    isApiAuthenticated,

    subscriptionApiController.getPlans
);


// ============================================
// Current subscription
// ============================================

router.get(
    "/current",

    isApiAuthenticated,

    subscriptionApiController.getCurrentBilling
);


// ============================================
// Usage
// ============================================

router.get(
    "/usage",

    isApiAuthenticated,

    subscriptionApiController.getUsage
);


// ============================================
// Create Razorpay order
// ============================================

router.post(
    "/create-order",

    isApiAuthenticated,

    subscriptionApiController.createOrder
);


// ============================================
// Verify Razorpay payment
// ============================================

router.post(
    "/verify-payment",

    isApiAuthenticated,

    subscriptionApiController.verifyPayment
);


module.exports = router;