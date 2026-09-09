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


router.get(
    "/plans",
    isAuthenticated,
    loadOrganization,
    subscriptionController.getPlans
);


module.exports = router;