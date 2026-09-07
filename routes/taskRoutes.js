const express = require("express");

const router = express.Router();

const taskController =
    require("../controllers/taskController");

const {
    isAuthenticated
} = require("../middleware/authMiddleware");

const {
    loadOrganization
} = require("../middleware/tenantMiddleware");


// ============================================
// View project tasks
// ============================================

router.get(
    "/projects/:projectId/tasks",
    isAuthenticated,
    loadOrganization,
    taskController.getTasks
);


// ============================================
// Create task page
// ============================================

router.get(
    "/projects/:projectId/tasks/create",
    isAuthenticated,
    loadOrganization,
    taskController.showCreateTask
);


// ============================================
// Create task
// ============================================

router.post(
    "/projects/:projectId/tasks/create",
    isAuthenticated,
    loadOrganization,
    taskController.createTask
);


module.exports = router;