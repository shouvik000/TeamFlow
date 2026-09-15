let io = null;


// ============================================
// Store Socket.IO instance
// ============================================

exports.setIO = (socketIO) => {

    io = socketIO;

    console.log(
        "Socket.IO service initialized"
    );

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
// Create organization room
// ============================================

exports.getOrganizationRoom = (
    organizationId
) => {

    return `organization:${organizationId}`;

};


// ============================================
// Create project room
// ============================================

exports.getProjectRoom = (
    organizationId,
    projectId
) => {

    return `organization:${organizationId}:project:${projectId}`;

};


// ============================================
// Emit notification
// ============================================

exports.emitNotification = (
    notification
) => {

    if (!io) {

        console.log(
            " Socket.IO is not initialized"
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
        " Sending real-time notification to:",
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

        console.log(
            " Socket.IO is not initialized"
        );

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


// ============================================
// Emit task created event
// ============================================

exports.emitTaskCreated = (
    task
) => {

    if (!io) {

        console.log(
            " Socket.IO is not initialized"
        );

        return;

    }


    if (!task) {

        return;

    }


    const organizationRoom =
        exports.getOrganizationRoom(
            task.organization_id
        );


    const projectRoom =
        exports.getProjectRoom(
            task.organization_id,
            task.project_id
        );


    console.log(
        " Task created:",
        task.id
    );


    // --------------------------------------------
    // Send to organization users
    // --------------------------------------------

    io.to(
        organizationRoom
    ).emit(
        "task:created",
        task
    );


    // --------------------------------------------
    // Send to project users
    // --------------------------------------------

    io.to(
        projectRoom
    ).emit(
        "task:created",
        task
    );

};


// ============================================
// Emit task updated event
// ============================================

exports.emitTaskUpdated = (
    task
) => {

    if (!io) {

        console.log(
            " Socket.IO is not initialized"
        );

        return;

    }


    if (!task) {

        return;

    }


    const organizationRoom =
        exports.getOrganizationRoom(
            task.organization_id
        );


    const projectRoom =
        exports.getProjectRoom(
            task.organization_id,
            task.project_id
        );


    console.log(
        " Task updated:",
        task.id
    );


    // --------------------------------------------
    // Send to organization users
    // --------------------------------------------

    io.to(
        organizationRoom
    ).emit(
        "task:updated",
        task
    );


    // --------------------------------------------
    // Send to project users
    // --------------------------------------------

    io.to(
        projectRoom
    ).emit(
        "task:updated",
        task
    );

};


// ============================================
// Emit task deleted event
// ============================================

exports.emitTaskDeleted = (
    task
) => {

    if (!io) {

        console.log(
            " Socket.IO is not initialized"
        );

        return;

    }


    if (!task) {

        return;

    }


    const organizationRoom =
        exports.getOrganizationRoom(
            task.organization_id
        );


    const projectRoom =
        exports.getProjectRoom(
            task.organization_id,
            task.project_id
        );


    console.log(
        "📡 Task deleted:",
        task.id
    );


    const deletedTask = {

        id:
            task.id,

        project_id:
            task.project_id,

        organization_id:
            task.organization_id

    };


    // --------------------------------------------
    // Send to organization users
    // --------------------------------------------

    io.to(
        organizationRoom
    ).emit(
        "task:deleted",
        deletedTask
    );


    // --------------------------------------------
    // Send to project users
    // --------------------------------------------

    io.to(
        projectRoom
    ).emit(
        "task:deleted",
        deletedTask
    );

};


// ============================================
// Emit project created event
// ============================================

exports.emitProjectCreated = (
    project
) => {

    if (!io) {

        console.log(
            " Socket.IO is not initialized"
        );

        return;

    }


    if (!project) {

        return;

    }


    const organizationRoom =
        exports.getOrganizationRoom(
            project.organization_id
        );


    console.log(
        " Project created:",
        project.id
    );


    io.to(
        organizationRoom
    ).emit(
        "project:created",
        project
    );

};


// ============================================
// Emit project updated event
// ============================================

exports.emitProjectUpdated = (
    project
) => {

    if (!io) {

        console.log(
            " Socket.IO is not initialized"
        );

        return;

    }


    if (!project) {

        return;

    }


    const organizationRoom =
        exports.getOrganizationRoom(
            project.organization_id
        );


    console.log(
        "📡 Project updated:",
        project.id
    );


    io.to(
        organizationRoom
    ).emit(
        "project:updated",
        project
    );

};


// ============================================
// Emit project deleted event
// ============================================

exports.emitProjectDeleted = (
    project
) => {

    if (!io) {

        console.log(
            " Socket.IO is not initialized"
        );

        return;

    }


    if (!project) {

        return;

    }


    const organizationRoom =
        exports.getOrganizationRoom(
            project.organization_id
        );


    console.log(
        " Project deleted:",
        project.id
    );


    const deletedProject = {

        id:
            project.id,

        organization_id:
            project.organization_id

    };


    io.to(
        organizationRoom
    ).emit(
        "project:deleted",
        deletedProject
    );

};


// ============================================
// Get Socket.IO instance
// Useful for advanced services
// ============================================

exports.getIO = () => {

    return io;

};