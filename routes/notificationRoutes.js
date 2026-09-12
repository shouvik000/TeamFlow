const express = require("express");

const router = express.Router();

const notificationController =
    require("../controllers/notificationController");

const {
    isAuthenticated
} = require("../middleware/authMiddleware");

const {
    loadOrganization
} = require("../middleware/tenantMiddleware");


// View notifications
router.get(
    "/",
    isAuthenticated,
    loadOrganization,
    notificationController.getNotifications
);


// Unread count
router.get(
    "/unread-count",
    isAuthenticated,
    loadOrganization,
    notificationController.getUnreadCount
);


// Mark one as read
router.post(
    "/:notificationId/read",
    isAuthenticated,
    loadOrganization,
    notificationController.markAsRead
);


// Mark all as read
router.post(
    "/read-all",
    isAuthenticated,
    loadOrganization,
    notificationController.markAllAsRead
);


module.exports = router;