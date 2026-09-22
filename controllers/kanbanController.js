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

        res.render("tasks/kanban", {
            user: req.session.user,
            organization: req.organization,
            project: projectResult.rows[0],

            todoTasks: tasks.filter(t => t.status === "TODO"),
            inProgressTasks: tasks.filter(t => t.status === "IN_PROGRESS"),
            reviewTasks: tasks.filter(t => t.status === "REVIEW"),
            doneTasks: tasks.filter(t => t.status === "DONE")
        });

    } catch (error) {
        console.error("Kanban board error:", error);
        res.status(500).send("Failed to load Kanban board.");
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

        task.organization_id = organizationId;

        await activityService.createActivityLog({
            organizationId,
            userId,
            action: "TASK_CREATED",
            entityType: "TASK",
            entityId: task.id,
            details: `Created task "${task.title}"`
        });

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

        const updated = await pool.query(
            `
            UPDATE tasks
            SET status=$1
            WHERE id=$2
            RETURNING *
            `,
            [status, taskId]
        );

        const updatedTask = {
            ...updated.rows[0],
            organization_id: task.organization_id
        };

        await activityService.createActivityLog({
            organizationId: req.organization.id,
            userId: req.session.user.id,
            action: "TASK_UPDATED",
            entityType: "TASK",
            entityId: taskId,
            details: `Moved task to ${status}`
        });

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
            due_date
        } = req.body;

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

        const updated = await pool.query(
            `
            UPDATE tasks
            SET
                title=$1,
                description=$2,
                priority=$3,
                status=$4,
                due_date=$5
            WHERE id=$6
            RETURNING *
            `,
            [
                title,
                description,
                priority,
                status,
                due_date || null,
                taskId
            ]
        );

        const updatedTask = {
            ...updated.rows[0],
            organization_id: organizationId
        };

        await activityService.createActivityLog({
            organizationId,
            userId: req.session.user.id,
            action: "TASK_UPDATED",
            entityType: "TASK",
            entityId: taskId,
            details: `Updated task "${title}"`
        });

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

        await pool.query(
            `DELETE FROM tasks WHERE id=$1`,
            [taskId]
        );

        await activityService.createActivityLog({
            organizationId: req.organization.id,
            userId: req.session.user.id,
            action: "TASK_DELETED",
            entityType: "TASK",
            entityId: task.id,
            details: `Deleted task "${task.title}"`
        });

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