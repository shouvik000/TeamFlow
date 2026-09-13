const express = require("express");

const router =
    express.Router();


const organizationApiController =
    require("../../controllers/organizationApiController");


const {
    isApiAuthenticated
} = require("../../middleware/authMiddleware");


const {
    loadOrganization,
    requireRole
} = require("../../middleware/tenantMiddleware");


const {
    checkMemberLimit
} = require("../../middleware/subscriptionMiddleware");


const ROLES =
    require("../../utils/roles");


// ============================================
// Get user's organizations
// ============================================

router.get(
    "/",

    isApiAuthenticated,

    organizationApiController.getMyOrganizations
);


// ============================================
// Get current organization members
// ============================================

router.get(
    "/members",

    isApiAuthenticated,

    loadOrganization,

    organizationApiController.getMembers
);


// ============================================
// Create invitation
// OWNER / ADMIN
// ============================================

router.post(
    "/invite",

    isApiAuthenticated,

    loadOrganization,

    requireRole(
        ROLES.OWNER,
        ROLES.ADMIN
    ),

    checkMemberLimit,

    organizationApiController.createInvitation
);


// ============================================
// Switch active organization
// ============================================

router.post(
    "/switch",

    isApiAuthenticated,

    organizationApiController.switchOrganization
);


module.exports = router;