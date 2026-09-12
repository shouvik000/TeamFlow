const pool = require("../config/db");

const {
    createActivityLog
} = require("../services/activityService");

const {
    createNotification
} = require("../services/notificationService");


// ============================================
// Get all tasks for a project
// GET /api/projects/:projectId/tasks
// ============================================

exports.getTasks = async (req, res) => {

    const { projectId } = req.params;

    const organizationId =
        req.session.user.organizationId;

    try {

        // ========================================
        // Verify project
        // ========================================

        const projectResult =
            await pool.query(
                `
                SELECT
                    id,
                    name,
                    description,
                    status

                FROM projects

                WHERE id = $1
                  AND organization_id = $2
                `,
                [
                    projectId,
                    organizationId
                ]
            );


        if (projectResult.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Project not found"

            });
        }


        // ========================================
        // Get tasks
        // ========================================

        const taskResult =
            await pool.query(
                `
                SELECT

                    t.id,
                    t.project_id,
                    t.organization_id,
                    t.title,
                    t.description,
                    t.status,
                    t.priority,
                    t.assigned_to,
                    t.due_date,
                    t.created_by,
                    t.created_at,
                    t.updated_at,

                    assignee.name
                        AS assignee_name,

                    assignee.email
                        AS assignee_email,

                    creator.name
                        AS creator_name

                FROM tasks t

                LEFT JOIN users assignee
                    ON assignee.id =
                       t.assigned_to

                JOIN users creator
                    ON creator.id =
                       t.created_by

                WHERE t.project_id = $1
                  AND t.organization_id = $2

                ORDER BY
                    t.created_at DESC
                `,
                [
                    projectId,
                    organizationId
                ]
            );


        res.status(200).json({

            success: true,

            count:
                taskResult.rows.length,

            project:
                projectResult.rows[0],

            tasks:
                taskResult.rows

        });

    } catch (error) {

        console.error(
            "API get tasks error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load tasks"

        });
    }
};


// ============================================
// Get single task
// GET /api/tasks/:taskId
// ============================================

exports.getTask = async (req, res) => {

    const { taskId } = req.params;

    const organizationId =
        req.session.user.organizationId;

    try {

        const result =
            await pool.query(
                `
                SELECT

                    t.id,
                    t.project_id,
                    t.organization_id,
                    t.title,
                    t.description,
                    t.status,
                    t.priority,
                    t.assigned_to,
                    t.due_date,
                    t.created_by,
                    t.created_at,
                    t.updated_at,

                    p.name AS project_name,

                    assignee.name
                        AS assignee_name,

                    assignee.email
                        AS assignee_email,

                    creator.name
                        AS creator_name

                FROM tasks t

                JOIN projects p
                    ON p.id =
                       t.project_id

                LEFT JOIN users assignee
                    ON assignee.id =
                       t.assigned_to

                JOIN users creator
                    ON creator.id =
                       t.created_by

                WHERE t.id = $1
                  AND t.organization_id = $2
                  AND p.organization_id = $2
                `,
                [
                    taskId,
                    organizationId
                ]
            );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Task not found"

            });
        }


        res.status(200).json({

            success: true,

            task:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "API get task error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load task"

        });
    }
};


// ============================================
// Create task
// POST /api/projects/:projectId/tasks
// ============================================

exports.createTask = async (req, res) => {

    const { projectId } = req.params;

    const {
        title,
        description,
        priority,
        assignedTo,
        dueDate
    } = req.body;


    const organizationId =
        req.session.user.organizationId;

    const userId =
        req.session.user.id;


    // ========================================
    // Validate title
    // ========================================

    if (
        !title ||
        !title.trim()
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Task title is required"

        });
    }


    // ========================================
    // Validate priority
    // ========================================

    const allowedPriorities = [
        "LOW",
        "MEDIUM",
        "HIGH",
        "URGENT"
    ];


    const selectedPriority =
        priority || "MEDIUM";


    if (
        !allowedPriorities.includes(
            selectedPriority
        )
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid task priority"

        });
    }


    try {

        // ========================================
        // Verify project
        // ========================================

        const projectResult =
            await pool.query(
                `
                SELECT
                    id,
                    name

                FROM projects

                WHERE id = $1
                  AND organization_id = $2
                `,
                [
                    projectId,
                    organizationId
                ]
            );


        if (projectResult.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Project not found"

            });
        }


        const project =
            projectResult.rows[0];


        // ========================================
        // Validate assignee
        // ========================================

        let assigneeId = null;


        if (assignedTo) {

            const memberResult =
                await pool.query(
                    `
                    SELECT
                        u.id,
                        u.name,
                        u.email

                    FROM organization_members om

                    JOIN users u
                        ON u.id =
                           om.user_id

                    WHERE om.organization_id = $1
                      AND u.id = $2
                    `,
                    [
                        organizationId,
                        assignedTo
                    ]
                );


            if (
                memberResult.rows.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Selected user is not a member of this organization"

                });
            }


            assigneeId =
                memberResult.rows[0].id;
        }


        // ========================================
        // Create task
        // ========================================

        const taskResult =
            await pool.query(
                `
                INSERT INTO tasks
                (
                    project_id,
                    organization_id,
                    title,
                    description,
                    priority,
                    assigned_to,
                    due_date,
                    created_by
                )

                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8
                )

                RETURNING

                    id,
                    project_id,
                    organization_id,
                    title,
                    description,
                    status,
                    priority,
                    assigned_to,
                    due_date,
                    created_by,
                    created_at,
                    updated_at
                `,
                [
                    projectId,
                    organizationId,
                    title.trim(),
                    description
                        ? description.trim()
                        : null,
                    selectedPriority,
                    assigneeId,
                    dueDate || null,
                    userId
                ]
            );


        const task =
            taskResult.rows[0];


        // ========================================
        // Activity log
        // ========================================

        await createActivityLog({

            organizationId,

            userId,

            action:
                "TASK_CREATED",

            entityType:
                "TASK",

            entityId:
                task.id,

            description:
                `Created task "${task.title}" in project "${project.name}"`

        });


        // ========================================
        // Notification
        // ========================================

        if (assigneeId) {

            await createNotification({

                organizationId,

                userId:
                    assigneeId,

                type:
                    "TASK_ASSIGNED",

                title:
                    "New Task Assigned",

                message:
                    `You were assigned the task "${task.title}"`,

                entityType:
                    "TASK",

                entityId:
                    task.id

            });
        }


        res.status(201).json({

            success: true,

            message:
                "Task created successfully",

            task

        });

    } catch (error) {

        console.error(
            "API create task error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to create task"

        });
    }
};


// ============================================
// Update task
// PUT /api/tasks/:taskId
// ============================================

exports.updateTask = async (req, res) => {

    const { taskId } = req.params;

    const {
        title,
        description,
        status,
        priority,
        assignedTo,
        dueDate
    } = req.body;


    const organizationId =
        req.session.user.organizationId;

    const userId =
        req.session.user.id;


    // ========================================
    // Validate title
    // ========================================

    if (
        !title ||
        !title.trim()
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Task title is required"

        });
    }


    // ========================================
    // Validate status
    // ========================================

    const allowedStatuses = [
        "TODO",
        "IN_PROGRESS",
        "REVIEW",
        "DONE"
    ];


    const selectedStatus =
        status || "TODO";


    if (
        !allowedStatuses.includes(
            selectedStatus
        )
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid task status"

        });
    }


    // ========================================
    // Validate priority
    // ========================================

    const allowedPriorities = [
        "LOW",
        "MEDIUM",
        "HIGH",
        "URGENT"
    ];


    const selectedPriority =
        priority || "MEDIUM";


    if (
        !allowedPriorities.includes(
            selectedPriority
        )
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid task priority"

        });
    }


    try {

        // ========================================
        // Get old task
        // ========================================

        const oldTaskResult =
            await pool.query(
                `
                SELECT

                    id,
                    project_id,
                    title,
                    status,
                    priority,
                    assigned_to

                FROM tasks

                WHERE id = $1
                  AND organization_id = $2
                `,
                [
                    taskId,
                    organizationId
                ]
            );


        if (
            oldTaskResult.rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Task not found"

            });
        }


        const oldTask =
            oldTaskResult.rows[0];


        // ========================================
        // Validate assignee
        // ========================================

        let assigneeId = null;


        if (assignedTo) {

            const memberResult =
                await pool.query(
                    `
                    SELECT
                        u.id

                    FROM organization_members om

                    JOIN users u
                        ON u.id =
                           om.user_id

                    WHERE om.organization_id = $1
                      AND u.id = $2
                    `,
                    [
                        organizationId,
                        assignedTo
                    ]
                );


            if (
                memberResult.rows.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Selected user is not a member of this organization"

                });
            }


            assigneeId =
                memberResult.rows[0].id;
        }


        // ========================================
        // Update task
        // ========================================

        const updatedTaskResult =
            await pool.query(
                `
                UPDATE tasks

                SET

                    title = $1,
                    description = $2,
                    status = $3,
                    priority = $4,
                    assigned_to = $5,
                    due_date = $6,
                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = $7
                  AND organization_id = $8

                RETURNING

                    id,
                    project_id,
                    organization_id,
                    title,
                    description,
                    status,
                    priority,
                    assigned_to,
                    due_date,
                    created_by,
                    created_at,
                    updated_at
                `,
                [
                    title.trim(),

                    description
                        ? description.trim()
                        : null,

                    selectedStatus,

                    selectedPriority,

                    assigneeId,

                    dueDate || null,

                    taskId,

                    organizationId
                ]
            );


        const updatedTask =
            updatedTaskResult.rows[0];


        // ========================================
        // Activity log
        // ========================================

        let descriptionText =
            `Updated task "${updatedTask.title}"`;


        if (
            oldTask.status !==
            updatedTask.status
        ) {

            descriptionText +=
                ` | Status: ${oldTask.status} → ${updatedTask.status}`;
        }


        if (
            oldTask.priority !==
            updatedTask.priority
        ) {

            descriptionText +=
                ` | Priority: ${oldTask.priority} → ${updatedTask.priority}`;
        }


        await createActivityLog({

            organizationId,

            userId,

            action:
                "TASK_UPDATED",

            entityType:
                "TASK",

            entityId:
                updatedTask.id,

            description:
                descriptionText

        });


        // ========================================
        // Notification
        // ========================================

        if (
            assigneeId &&
            Number(assigneeId) !==
            Number(oldTask.assigned_to)
        ) {

            await createNotification({

                organizationId,

                userId:
                    assigneeId,

                type:
                    "TASK_ASSIGNED",

                title:
                    "Task Assigned",

                message:
                    `You were assigned the task "${updatedTask.title}"`,

                entityType:
                    "TASK",

                entityId:
                    updatedTask.id

            });
        }


        res.status(200).json({

            success: true,

            message:
                "Task updated successfully",

            task:
                updatedTask

        });

    } catch (error) {

        console.error(
            "API update task error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to update task"

        });
    }
};


// ============================================
// Delete task
// DELETE /api/tasks/:taskId
// ============================================

exports.deleteTask = async (req, res) => {

    const { taskId } = req.params;

    const organizationId =
        req.session.user.organizationId;

    const userId =
        req.session.user.id;


    try {

        // ========================================
        // Find task
        // ========================================

        const taskResult =
            await pool.query(
                `
                SELECT

                    id,
                    project_id,
                    title

                FROM tasks

                WHERE id = $1
                  AND organization_id = $2
                `,
                [
                    taskId,
                    organizationId
                ]
            );


        if (taskResult.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Task not found"

            });
        }


        const task =
            taskResult.rows[0];


        // ========================================
        // Delete
        // ========================================

        await pool.query(
            `
            DELETE FROM tasks

            WHERE id = $1
              AND organization_id = $2
            `,
            [
                taskId,
                organizationId
            ]
        );


        // ========================================
        // Activity log
        // ========================================

        await createActivityLog({

            organizationId,

            userId,

            action:
                "TASK_DELETED",

            entityType:
                "TASK",

            entityId:
                task.id,

            description:
                `Deleted task "${task.title}"`

        });


        res.status(200).json({

            success: true,

            message:
                "Task deleted successfully",

            task

        });

    } catch (error) {

        console.error(
            "API delete task error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to delete task"

        });
    }
};