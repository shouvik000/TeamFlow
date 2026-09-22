const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const tenantMiddleware = require("../middleware/tenantMiddleware");

const kanbanController = require("../controllers/kanbanController");

// ============================================
// All Kanban routes require:
// 1. User login
// 2. Organization loaded
// ============================================

router.use(authMiddleware.isAuthenticated);
router.use(tenantMiddleware.loadOrganization);

// ============================================
// Kanban Board
// GET /kanban/project/:projectId
// ============================================

router.get(
    "/project/:projectId",
    kanbanController.getKanbanBoard
);

// ============================================
// Create Task
// POST /kanban/project/:projectId/task
// ============================================

router.post(
    "/project/:projectId/task",
    kanbanController.createTask
);

// ============================================
// Move Task
// POST /kanban/task/:taskId/move
// ============================================

router.post(
    "/task/:taskId/move",
    kanbanController.moveTask
);

// ============================================
// Update Task
// POST /kanban/task/:taskId/update
// ============================================

router.post(
    "/task/:taskId/update",
    kanbanController.updateTask
);

// ============================================
// Delete Task
// POST /kanban/task/:taskId/delete
// ============================================

router.post(
    "/task/:taskId/delete",
    kanbanController.deleteTask
);

module.exports = router;