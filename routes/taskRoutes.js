
const express = require("express");

const router = express.Router();

const taskController =
    require("../controllers/taskController");

const {
    isAuthenticated
} = require("../middleware/authMiddleware");

const {
    loadOrganization,
    requireRole
} = require("../middleware/tenantMiddleware");

const {
    checkTaskLimit
} = require("../middleware/subscriptionMiddleware");


// ============================================
// View tasks
// All organization members
// ============================================

router.get(
    "/projects/:projectId/tasks",
    isAuthenticated,
    loadOrganization,
    taskController.getTasks
);


// ============================================
// Create task page
// OWNER / ADMIN / MEMBER
// ============================================

router.get(
    "/projects/:projectId/tasks/create",
    isAuthenticated,
    loadOrganization,
    requireRole("OWNER", "ADMIN", "MEMBER"),
    taskController.showCreateTask
);


// ============================================
// Create task
// OWNER / ADMIN / MEMBER
// ============================================

router.post(
    "/projects/:projectId/tasks/create",
    isAuthenticated,
    loadOrganization,
    requireRole("OWNER", "ADMIN", "MEMBER"),
    checkTaskLimit,
    taskController.createTask
);


// ============================================
// Edit task page
// OWNER / ADMIN / MEMBER
// ============================================

router.get(
    "/tasks/:taskId/edit",
    isAuthenticated,
    loadOrganization,
    requireRole("OWNER", "ADMIN", "MEMBER"),
    taskController.showEditTask
);


// ============================================
// Update task
// OWNER / ADMIN / MEMBER
// ============================================

router.post(
    "/tasks/:taskId/edit",
    isAuthenticated,
    loadOrganization,
    requireRole("OWNER", "ADMIN", "MEMBER"),
    taskController.updateTask
);


// ============================================
// Delete task
// OWNER / ADMIN only
// ============================================

router.post(
    "/tasks/:taskId/delete",
    isAuthenticated,
    loadOrganization,
    requireRole("OWNER", "ADMIN"),
    taskController.deleteTask
);


module.exports = router;