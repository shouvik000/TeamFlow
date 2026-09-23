const pool = require("../config/db");
const activityService = require("../services/activityService");
const socketService = require("../services/socketService");

// ============================================
// GET KANBAN BOARD
// ============================================

exports.getKanbanBoard = async (req, res) => {

    try {

        const projectId = Number(req.params.projectId);
        const organizationId = req.organization.id;

        const projectResult = await pool.query(
            `
            SELECT *
            FROM projects
            WHERE id=$1
              AND organization_id=$2
            LIMIT 1
            `,
            [projectId, organizationId]
        );

        if (projectResult.rows.length === 0) {

            return res.status(404).send("Project not found.");

        }

        const tasksResult = await pool.query(
            `
            SELECT
                t.*,
                u.name AS assignee_name
            FROM tasks t
            LEFT JOIN users u
                ON u.id=t.assigned_to
            WHERE t.project_id=$1
            ORDER BY t.created_at DESC
            `,
            [projectId]
        );

        const tasks = tasksResult.rows;

        // ============================================
        // LOAD ORGANIZATION MEMBERS
        // ============================================

        const membersResult = await pool.query(
            `
            SELECT
                u.id,
                u.name
            FROM organization_members om
            JOIN users u
                ON u.id = om.user_id
            WHERE om.organization_id = $1
            ORDER BY u.name ASC
            `,
            [organizationId]
        );

        res.render("tasks/kanban", {

            user: req.session.user,

            organization: req.organization,

            project: projectResult.rows[0],

            members: membersResult.rows,

            todoTasks: tasks.filter(
                t => t.status === "TODO"
            ),

            inProgressTasks: tasks.filter(
                t => t.status === "IN_PROGRESS"
            ),

            reviewTasks: tasks.filter(
                t => t.status === "REVIEW"
            ),

            doneTasks: tasks.filter(
                t => t.status === "DONE"
            )

        });

    } catch (error) {

        console.error("Kanban board error:", error);

        res.status(500).send(
            "Failed to load Kanban board."
        );

    }

};


// ============================================
// CREATE TASK
// ============================================

exports.createTask = async (req, res) => {

    try {

        const projectId = Number(req.params.projectId);

        const organizationId = req.organization.id;

        const userId = req.session.user.id;

        const {
            title,
            description,
            priority,
            status
        } = req.body;

        if (!title || !title.trim()) {

            return res.json({

                success: false,

                message: "Task title is required."

            });

        }

        // ----------------------------------------
        // Verify project belongs to organization
        // ----------------------------------------

        const projectCheck = await pool.query(
            `
            SELECT id
            FROM projects
            WHERE id=$1
              AND organization_id=$2
            LIMIT 1
            `,
            [projectId, organizationId]
        );

        if (projectCheck.rows.length === 0) {

            return res.status(403).json({

                success: false,

                message: "Project not found."

            });

        }

        // ----------------------------------------
        // Create task
        // ----------------------------------------

        const result = await pool.query(
            `
            INSERT INTO tasks(
                project_id,
                title,
                description,
                priority,
                status,
                created_by
            )
            VALUES($1,$2,$3,$4,$5,$6)
            RETURNING *
            `,
            [
                projectId,
                title.trim(),
                description || null,
                priority || "MEDIUM",
                status || "TODO",
                userId
            ]
        );

        const task = result.rows[0];

        // Add organization_id for real-time updates
        task.organization_id = organizationId;

        // ----------------------------------------
        // Activity log
        // ----------------------------------------

        await activityService.createActivityLog({

            organizationId,

            userId,

            action: "TASK_CREATED",

            entityType: "TASK",

            entityId: task.id,

            details: `Created task "${task.title}"`

        });

        // ----------------------------------------
        // Real-time update
        // ----------------------------------------

        socketService.emitTaskCreated(task);

        res.json({

            success: true,

            task

        });

    } catch (error) {

        console.error("Create task error:", error);

        res.status(500).json({

            success: false,

            message: "Failed to create task."

        });

    }

};


// ============================================
// MOVE TASK
// ============================================

exports.moveTask = async (req, res) => {

    try {

        const taskId = Number(req.params.taskId);

        const { status } = req.body;

        const validStatuses = [

            "TODO",

            "IN_PROGRESS",

            "REVIEW",

            "DONE"

        ];

        if (!validStatuses.includes(status)) {

            return res.json({

                success: false,

                message: "Invalid task status."

            });

        }

        // ----------------------------------------
        // Find task and verify organization
        // ----------------------------------------

        const taskResult = await pool.query(
            `
            SELECT
                t.*,
                p.organization_id
            FROM tasks t
            JOIN projects p
                ON p.id=t.project_id
            WHERE t.id=$1
            LIMIT 1
            `,
            [taskId]
        );

        if (taskResult.rows.length === 0) {

            return res.json({

                success: false,

                message: "Task not found."

            });

        }

        const task = taskResult.rows[0];

        if (task.organization_id !== req.organization.id) {

            return res.status(403).json({

                success: false,

                message: "Unauthorized."

            });

        }

        // ----------------------------------------
        // Update task status
        // ----------------------------------------

        await pool.query(
            `
            UPDATE tasks
            SET status=$1
            WHERE id=$2
            `,
            [status, taskId]
        );

        // ----------------------------------------
        // Get complete updated task
        // Includes assignee_name
        // ----------------------------------------

        const updatedTaskResult = await pool.query(
            `
            SELECT
                t.*,
                u.name AS assignee_name
            FROM tasks t
            LEFT JOIN users u
                ON u.id=t.assigned_to
            WHERE t.id=$1
            `,
            [taskId]
        );

        const updatedTask = {

            ...updatedTaskResult.rows[0],

            organization_id: task.organization_id

        };

        // ----------------------------------------
        // Activity log
        // ----------------------------------------

        await activityService.createActivityLog({

            organizationId: req.organization.id,

            userId: req.session.user.id,

            action: "TASK_UPDATED",

            entityType: "TASK",

            entityId: taskId,

            details: `Moved task to ${status}`

        });

        // ----------------------------------------
        // Real-time update
        // ----------------------------------------

        socketService.emitTaskUpdated(updatedTask);

        res.json({

            success: true,

            task: updatedTask

        });

    } catch (error) {

        console.error("Move task error:", error);

        res.status(500).json({

            success: false,

            message: "Failed to move task."

        });

    }

};


// ============================================
// UPDATE TASK
// ============================================

exports.updateTask = async (req, res) => {

    try {

        const taskId = Number(req.params.taskId);

        const organizationId = req.organization.id;

        const {
            title,
            description,
            priority,
            status,
            due_date,
            assigned_to
        } = req.body;

        // ----------------------------------------
        // Find task and verify organization
        // ----------------------------------------

        const taskResult = await pool.query(
            `
            SELECT
                t.*,
                p.organization_id
            FROM tasks t
            JOIN projects p
                ON p.id=t.project_id
            WHERE t.id=$1
            LIMIT 1
            `,
            [taskId]
        );

        if (taskResult.rows.length === 0) {

            return res.json({

                success: false,

                message: "Task not found."

            });

        }

        const task = taskResult.rows[0];

        if (task.organization_id !== organizationId) {

            return res.status(403).json({

                success: false,

                message: "Unauthorized."

            });

        }

        // ----------------------------------------
        // Update task
        // ----------------------------------------

        const updated = await pool.query(
            `
            UPDATE tasks
            SET
                title=$1,
                description=$2,
                priority=$3,
                status=$4,
                due_date=$5,
                assigned_to=$6
            WHERE id=$7
            RETURNING *
            `,
            [
                title,
                description,
                priority,
                status,
                due_date || null,
                assigned_to || null,
                taskId
            ]
        );

        // ----------------------------------------
        // Get complete updated task
        // Includes assignee_name
        // ----------------------------------------

        const updatedTaskResult = await pool.query(
            `
            SELECT
                t.*,
                u.name AS assignee_name
            FROM tasks t
            LEFT JOIN users u
                ON u.id=t.assigned_to
            WHERE t.id=$1
            `,
            [taskId]
        );

        const updatedTask = {

            ...updatedTaskResult.rows[0],

            organization_id: organizationId

        };

        // ----------------------------------------
        // Activity log
        // ----------------------------------------

        await activityService.createActivityLog({

            organizationId,

            userId: req.session.user.id,

            action: "TASK_UPDATED",

            entityType: "TASK",

            entityId: taskId,

            details: `Updated task "${title}"`

        });

        // ----------------------------------------
        // Real-time update
        // ----------------------------------------

        socketService.emitTaskUpdated(updatedTask);

        res.json({

            success: true,

            task: updatedTask

        });

    } catch (error) {

        console.error("Update task error:", error);

        res.status(500).json({

            success: false,

            message: "Failed to update task."

        });

    }

};


// ============================================
// DELETE TASK
// ============================================

exports.deleteTask = async (req, res) => {

    try {

        const taskId = Number(req.params.taskId);

        // ----------------------------------------
        // Find task and verify organization
        // ----------------------------------------

        const taskResult = await pool.query(
            `
            SELECT
                t.id,
                t.title,
                t.project_id,
                p.organization_id
            FROM tasks t
            JOIN projects p
                ON p.id=t.project_id
            WHERE t.id=$1
            LIMIT 1
            `,
            [taskId]
        );

        if (taskResult.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Task not found."

            });

        }

        const task = taskResult.rows[0];

        if (task.organization_id !== req.organization.id) {

            return res.status(403).json({

                success: false,

                message: "Unauthorized."

            });

        }

        // ----------------------------------------
        // Delete task
        // ----------------------------------------

        await pool.query(
            `
            DELETE FROM tasks
            WHERE id=$1
            `,
            [taskId]
        );

        // ----------------------------------------
        // Activity log
        // ----------------------------------------

        await activityService.createActivityLog({

            organizationId: req.organization.id,

            userId: req.session.user.id,

            action: "TASK_DELETED",

            entityType: "TASK",

            entityId: task.id,

            details: `Deleted task "${task.title}"`

        });

        // ----------------------------------------
        // Real-time update
        // ----------------------------------------

        socketService.emitTaskDeleted(task);

        res.json({

            success: true

        });

    } catch (error) {

        console.error("Delete task error:", error);

        res.status(500).json({

            success: false,

            message: "Failed to delete task."

        });

    }

};