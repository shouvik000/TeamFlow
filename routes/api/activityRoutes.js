const express = require("express");

const router =
    express.Router();


const activityApiController =
    require("../../controllers/activityApiController");


const {
    isApiAuthenticated
} = require("../../middleware/authMiddleware");


// ============================================
// Get organization activity
// ============================================

router.get(
    "/",

    isApiAuthenticated,

    activityApiController.getActivities
);


module.exports = router;