const express = require("express");

const router = express.Router();

const organizationController =
    require("../controllers/organizationController");

const activityController =
    require("../controllers/activityController");


const {
    isAuthenticated
} = require("../middleware/authMiddleware");

const {
    loadOrganization,
    requireRole
} = require("../middleware/tenantMiddleware");


// ============================================
// Members
// ============================================

router.get(
    "/members",
    isAuthenticated,
    loadOrganization,
    organizationController.getMembers
);


// ============================================
// Invite user - form
// OWNER / ADMIN
// ============================================

router.get(
    "/invite",
    isAuthenticated,
    loadOrganization,
    requireRole("OWNER", "ADMIN"),
    organizationController.showInviteForm
);


// ============================================
// Create invitation
// OWNER / ADMIN
// ============================================

router.post(
    "/invite",
    isAuthenticated,
    loadOrganization,
    requireRole("OWNER", "ADMIN"),
    organizationController.createInvitation
);


// ============================================
// Accept invitation page
// ============================================

router.get(
    "/invite/accept",
    organizationController.showAcceptInvitation
);




router.get(
    "/activity",
    isAuthenticated,
    loadOrganization,
    activityController.getActivities
);

// ============================================
// Accept invitation
// ============================================

router.post(
    "/invite/accept",
    isAuthenticated,
    organizationController.acceptInvitation
);


module.exports = router;