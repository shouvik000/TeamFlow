/**
 * @openapi
 * /api/projects:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Get all projects
 *     description: Returns all projects in the current organization.
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Projects retrieved successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */


/**
 * @openapi
 * /api/projects:
 *   post:
 *     tags:
 *       - Projects
 *     summary: Create a project
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Mobile App
 *               description:
 *                 type: string
 *                 example: TeamFlow mobile application
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Permission denied
 *       500:
 *         description: Server error
 */




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