  

  let io = null;


// ============================================
// Store Socket.IO instance
// ============================================

exports.setIO = (socketIO) => {

    io = socketIO;

    console.log("✅ Socket.IO service initialized");

};


// ============================================
// Create user-specific room
// ============================================

exports.getUserRoom = (
    userId,
    organizationId
) => {

    return `user:${userId}:org:${organizationId}`;

};


// ============================================
// Emit notification
// ============================================

exports.emitNotification = (
    notification
) => {

    if (!io) {

        console.log(
            "⚠️ Socket.IO is not initialized"
        );

        return;

    }


    if (!notification) {

        return;

    }


    const room =
        exports.getUserRoom(
            notification.user_id,
            notification.organization_id
        );


    console.log(
        "📡 Sending real-time notification to:",
        room
    );


    io.to(room).emit(
        "notification:new",
        notification
    );

};


// ============================================
// Emit unread count refresh request
// ============================================

exports.emitUnreadCountRefresh = (
    userId,
    organizationId
) => {

    if (!io) {

        return;

    }


    const room =
        exports.getUserRoom(
            userId,
            organizationId
        );


    io.to(room).emit(
        "notification:refresh"
    );

};