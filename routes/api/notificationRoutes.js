const express = require("express");

const router =
    express.Router();


const notificationApiController =
    require("../../controllers/notificationApiController");


const {
    isApiAuthenticated
} = require("../../middleware/authMiddleware");


// ============================================
// Get notifications
// ============================================

router.get(
    "/",
    isApiAuthenticated,
    notificationApiController.getNotifications
);


// ============================================
// Get unread count
// ============================================

router.get(
    "/unread-count",
    isApiAuthenticated,
    notificationApiController.getUnreadCount
);


// ============================================
// Mark one as read
// ============================================

router.put(
    "/:notificationId/read",
    isApiAuthenticated,
    notificationApiController.markAsRead
);


// ============================================
// Mark all as read
// ============================================

router.put(
    "/read-all",
    isApiAuthenticated,
    notificationApiController.markAllAsRead
);


module.exports = router;