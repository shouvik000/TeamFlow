

const express = require("express");

const router =
    express.Router();


const taskApiController =
    require("../../controllers/taskApiController");


const {
    isApiAuthenticated
} = require("../../middleware/authMiddleware");


const {
    loadOrganization,
    requireRole
} = require("../../middleware/tenantMiddleware");


const {
    checkTaskLimit
} = require("../../middleware/subscriptionMiddleware");


const ROLES =
    require("../../utils/roles");


// ============================================
// Get tasks for project
// OWNER / ADMIN / MEMBER / VIEWER
// ============================================

router.get(
    "/projects/:projectId/tasks",

    isApiAuthenticated,

    loadOrganization,

    taskApiController.getTasks
);


// ============================================
// Create task
// OWNER / ADMIN / MEMBER
// ============================================

router.post(
    "/projects/:projectId/tasks",

    isApiAuthenticated,

    loadOrganization,

    requireRole(
        ROLES.OWNER,
        ROLES.ADMIN,
        ROLES.MEMBER
    ),

    checkTaskLimit,

    taskApiController.createTask
);


// ============================================
// Get single task
// OWNER / ADMIN / MEMBER / VIEWER
// ============================================

router.get(
    "/tasks/:taskId",

    isApiAuthenticated,

    loadOrganization,

    taskApiController.getTask
);


// ============================================
// Update task
// OWNER / ADMIN / MEMBER
// ============================================

router.put(
    "/tasks/:taskId",

    isApiAuthenticated,

    loadOrganization,

    requireRole(
        ROLES.OWNER,
        ROLES.ADMIN,
        ROLES.MEMBER
    ),

    taskApiController.updateTask
);


// ============================================
// Delete task
// OWNER / ADMIN
// ============================================

router.delete(
    "/tasks/:taskId",

    isApiAuthenticated,

    loadOrganization,

    requireRole(
        ROLES.OWNER,
        ROLES.ADMIN
    ),

    taskApiController.deleteTask
);


module.exports = router;