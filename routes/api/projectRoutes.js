const express = require("express");

const router = express.Router();

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

const {
    requireFields,
    validateIdParam
} = require("../../middleware/apiValidation");

const ROLES =
    require("../../utils/roles");


// ============================================
// Get all projects
// GET /api/projects
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
// GET /api/projects/:projectId
// OWNER / ADMIN / MEMBER / VIEWER
// ============================================

router.get(
    "/:projectId",

    isApiAuthenticated,

    loadOrganization,

    validateIdParam("projectId"),

    projectApiController.getProject
);


// ============================================
// Create project
// POST /api/projects
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

    requireFields("name"),

    projectApiController.createProject
);


// ============================================
// Update project
// PUT /api/projects/:projectId
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

    validateIdParam("projectId"),

    requireFields("name"),

    projectApiController.updateProject
);


// ============================================
// Delete project
// DELETE /api/projects/:projectId
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

    validateIdParam("projectId"),

    projectApiController.deleteProject
);


module.exports = router;