let io = null;

// ============================================
// Initialize Socket.IO
// ============================================

exports.setIO = (socketIO) => {
    io = socketIO;
    console.log("Socket.IO service initialized");
};

// ============================================
// Get Socket.IO instance
// ============================================

exports.getIO = () => io;

// ============================================
// Rooms
// ============================================

exports.getUserRoom = (userId, organizationId) =>
    `user:${userId}:org:${organizationId}`;

exports.getOrganizationRoom = (organizationId) =>
    `organization:${organizationId}`;

exports.getProjectRoom = (organizationId, projectId) =>
    `organization:${organizationId}:project:${projectId}`;

// ============================================
// Internal helper
// ============================================

function emitToRooms(organizationId, projectId, event, payload) {

    if (!io) {
        console.log("Socket.IO is not initialized");
        return;
    }

    io.to(exports.getOrganizationRoom(organizationId))
        .emit(event, payload);

    if (projectId) {
        io.to(exports.getProjectRoom(organizationId, projectId))
            .emit(event, payload);
    }
}

// ============================================
// Notifications
// ============================================

exports.emitNotification = (notification) => {

    if (!io || !notification) return;

    io.to(
        exports.getUserRoom(
            notification.user_id,
            notification.organization_id
        )
    ).emit("notification:new", notification);
};

exports.emitUnreadCountRefresh = (userId, organizationId) => {

    if (!io) return;

    io.to(
        exports.getUserRoom(userId, organizationId)
    ).emit("notification:refresh");
};

// ============================================
// Task Events
// ============================================

exports.emitTaskCreated = (task) => {

    if (!task) return;

    console.log("Task created:", task.id);

    emitToRooms(
        task.organization_id,
        task.project_id,
        "task:created",
        task
    );
};

exports.emitTaskUpdated = (task) => {

    if (!task) return;

    console.log("Task updated:", task.id);

    emitToRooms(
        task.organization_id,
        task.project_id,
        "task:updated",
        task
    );
};

exports.emitTaskDeleted = (task) => {

    if (!task) return;

    console.log("Task deleted:", task.id);

    emitToRooms(
        task.organization_id,
        task.project_id,
        "task:deleted",
        {
            id: task.id,
            project_id: task.project_id,
            organization_id: task.organization_id
        }
    );
};

// ============================================
// Project Events
// ============================================

exports.emitProjectCreated = (project) => {

    if (!project) return;

    console.log("Project created:", project.id);

    emitToRooms(
        project.organization_id,
        null,
        "project:created",
        project
    );
};

exports.emitProjectUpdated = (project) => {

    if (!project) return;

    console.log("Project updated:", project.id);

    emitToRooms(
        project.organization_id,
        null,
        "project:updated",
        project
    );
};

exports.emitProjectDeleted = (project) => {

    if (!project) return;

    console.log("Project deleted:", project.id);

    emitToRooms(
        project.organization_id,
        null,
        "project:deleted",
        {
            id: project.id,
            organization_id: project.organization_id
        }
    );
};