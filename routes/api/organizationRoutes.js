const express = require("express");

const router = express.Router();


// ============================================
// CONTROLLERS
// ============================================

const organizationController =
    require("../../controllers/organizationController");

const activityController =
    require("../../controllers/activityController");


// ============================================
// AUTH MIDDLEWARE
// ============================================

const {
    isAuthenticated
} = require("../../middleware/authMiddleware");


// ============================================
// TENANT / RBAC MIDDLEWARE
// ============================================

const {
    loadOrganization,
    requireRole
} = require("../../middleware/tenantMiddleware");


// ============================================
// SUBSCRIPTION MIDDLEWARE
// ============================================

const {
    checkMemberLimit
} = require("../../middleware/subscriptionMiddleware");


// ============================================
// MEMBERS
// ============================================

// --------------------------------------------
// View organization members
// --------------------------------------------

router.get(
    "/members",

    isAuthenticated,

    loadOrganization,

    organizationController.getMembers
);


// ============================================
// INVITATIONS
// ============================================

// --------------------------------------------
// Show invite form
// OWNER / ADMIN
// --------------------------------------------

router.get(
    "/invite",

    isAuthenticated,

    loadOrganization,

    requireRole(
        "OWNER",
        "ADMIN"
    ),

    organizationController.showInviteForm
);


// --------------------------------------------
// Create invitation
// OWNER / ADMIN
// --------------------------------------------

router.post(
    "/invite",

    isAuthenticated,

    loadOrganization,

    requireRole(
        "OWNER",
        "ADMIN"
    ),

    checkMemberLimit,

    organizationController.createInvitation
);


// --------------------------------------------
// Accept invitation page
// Public
// --------------------------------------------

router.get(
    "/invite/accept",

    organizationController.showAcceptInvitation
);


// --------------------------------------------
// Accept invitation
// Logged-in user
// --------------------------------------------

router.post(
    "/invite/accept",

    isAuthenticated,

    organizationController.acceptInvitation
);


// ============================================
// MEMBER ROLE MANAGEMENT
// ============================================

// --------------------------------------------
// Update member role
//
// OWNER / ADMIN only
//
// Expected body:
// {
//     role: "ADMIN" | "MEMBER" | "VIEWER"
// }
// --------------------------------------------

router.post(
    "/members/:memberId/role",

    isAuthenticated,

    loadOrganization,

    requireRole(
        "OWNER",
        "ADMIN"
    ),

    organizationController.updateMemberRole
);


// ============================================
// MEMBER REMOVAL
// ============================================

// --------------------------------------------
// Remove member
//
// OWNER / ADMIN only
// --------------------------------------------

router.post(
    "/members/:memberId/remove",

    isAuthenticated,

    loadOrganization,

    requireRole(
        "OWNER",
        "ADMIN"
    ),

    organizationController.removeMember
);


// ============================================
// ACTIVITY
// ============================================

router.get(
    "/activity",

    isAuthenticated,

    loadOrganization,

    activityController.getActivities
);


// ============================================
// ORGANIZATION SWITCHING
// ============================================

// --------------------------------------------
// Show user's organizations
// --------------------------------------------

router.get(
    "/switch",

    isAuthenticated,

    organizationController.getMyOrganizations
);


// --------------------------------------------
// Switch active organization
// --------------------------------------------

router.post(
    "/switch",

    isAuthenticated,

    organizationController.switchOrganization
);


// ============================================
// EXPORT ROUTER
// ============================================

module.exports = router;