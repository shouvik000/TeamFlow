const express = require("express");

const router =
    express.Router();


const projectApiController =
    require("../../controllers/projectApiController");


const {
    isApiAuthenticated
} = require("../../middleware/authMiddleware");


const {
    loadOrganization,
    requireRole
} = require("../../middleware/tenantMiddleware");


const {
    checkProjectLimit
} = require("../../middleware/subscriptionMiddleware");


const ROLES =
    require("../../utils/roles");


// ============================================
// Get all projects
// OWNER / ADMIN / MEMBER / VIEWER
// ============================================

router.get(
    "/",
    isApiAuthenticated,
    loadOrganization,
    projectApiController.getProjects
);


// ============================================
// Get single project
// OWNER / ADMIN / MEMBER / VIEWER
// ============================================

router.get(
    "/:projectId",
    isApiAuthenticated,
    loadOrganization,
    projectApiController.getProject
);


// ============================================
// Create project
// OWNER / ADMIN
// ============================================

router.post(
    "/",
    isApiAuthenticated,
    loadOrganization,
    requireRole(
        ROLES.OWNER,
        ROLES.ADMIN
    ),
    checkProjectLimit,
    projectApiController.createProject
);


// ============================================
// Update project
// OWNER / ADMIN
// ============================================

router.put(
    "/:projectId",
    isApiAuthenticated,
    loadOrganization,
    requireRole(
        ROLES.OWNER,
        ROLES.ADMIN
    ),
    projectApiController.updateProject
);


// ============================================
// Delete project
// OWNER / ADMIN
// ============================================

router.delete(
    "/:projectId",
    isApiAuthenticated,
    loadOrganization,
    requireRole(
        ROLES.OWNER,
        ROLES.ADMIN
    ),
    projectApiController.deleteProject
);


module.exports = router;