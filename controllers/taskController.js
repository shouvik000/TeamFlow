const pool = require("../config/db");


// ============================================
// Get tasks for a project
// ============================================

exports.getTasks = async (req, res) => {

    const { projectId } = req.params;

    const organizationId =
        req.session.user.organizationId;

    try {

        // Verify project belongs to current organization
        const projectResult = await pool.query(
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

            return res.status(404).send(
                "Project not found"
            );

        }

        const project = projectResult.rows[0];


        // Get tasks belonging to project + organization
        const taskResult = await pool.query(
            `
            SELECT
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.due_date,
                t.created_at,

                assignee.name AS assignee_name,

                creator.name AS creator_name

            FROM tasks t

            LEFT JOIN users assignee
                ON assignee.id = t.assigned_to

            JOIN users creator
                ON creator.id = t.created_by

            WHERE t.project_id = $1
              AND t.organization_id = $2

            ORDER BY t.created_at DESC
            `,
            [
                projectId,
                organizationId
            ]
        );


        res.render("tasks/index", {

            project: project,

            tasks: taskResult.rows

        });


    } catch (error) {

        console.error(
            "Get tasks error:",
            error
        );

        res.status(500).send(
            "Failed to load tasks"
        );
    }
};



// ============================================
// Show create task page
// ============================================

exports.showCreateTask = async (req, res) => {

    const { projectId } = req.params;

    const organizationId =
        req.session.user.organizationId;

    try {

        // Verify project belongs to organization
        const projectResult = await pool.query(
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

            return res.status(404).send(
                "Project not found"
            );

        }


        // Get organization members
        const membersResult = await pool.query(
            `
            SELECT
                u.id,
                u.name,
                u.email,
                om.role
            FROM organization_members om

            JOIN users u
                ON u.id = om.user_id

            WHERE om.organization_id = $1

            ORDER BY u.name ASC
            `,
            [organizationId]
        );


        res.render("tasks/create", {

            project: projectResult.rows[0],

            members: membersResult.rows

        });


    } catch (error) {

        console.error(
            "Show create task error:",
            error
        );

        res.status(500).send(
            "Failed to load task form"
        );
    }
};



// ============================================
// Create task
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


    if (!title || !title.trim()) {

        return res.status(400).send(
            "Task title is required"
        );

    }


    try {

        const organizationId =
            req.session.user.organizationId;

        const userId =
            req.session.user.id;


        // ====================================
        // Verify project belongs to tenant
        // ====================================

        const projectResult = await pool.query(
            `
            SELECT id
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

            return res.status(404).send(
                "Project not found"
            );

        }


        // ====================================
        // Validate assignee
        // ====================================

        let assigneeId = null;

        if (assignedTo) {

            const memberResult =
                await pool.query(
                    `
                    SELECT u.id
                    FROM organization_members om

                    JOIN users u
                        ON u.id = om.user_id

                    WHERE om.organization_id = $1
                      AND u.id = $2
                    `,
                    [
                        organizationId,
                        assignedTo
                    ]
                );


            if (memberResult.rows.length === 0) {

                return res.status(400).send(
                    "Selected user is not a member of this organization"
                );

            }


            assigneeId = memberResult.rows[0].id;
        }


        // ====================================
        // Validate priority
        // ====================================

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

            return res.status(400).send(
                "Invalid priority"
            );

        }


        // ====================================
        // Create task
        // ====================================

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
            `,
            [
                projectId,
                organizationId,
                title.trim(),
                description || null,
                selectedPriority,
                assigneeId,
                dueDate || null,
                userId
            ]
        );


        res.redirect(
            `/projects/${projectId}/tasks`
        );


    } catch (error) {

        console.error(
            "Create task error:",
            error
        );

        res.status(500).send(
            "Failed to create task"
        );
    }
};


// ============================================
// Show edit task page
// ============================================

exports.showEditTask = async (req, res) => {

    const { taskId } = req.params;

    const organizationId =
        req.session.user.organizationId;

    try {

        // Get task only from current organization
        const taskResult = await pool.query(
            `
            SELECT
                t.id,
                t.project_id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.assigned_to,
                t.due_date,
                p.name AS project_name
            FROM tasks t
            JOIN projects p
                ON p.id = t.project_id
            WHERE t.id = $1
              AND t.organization_id = $2
            `,
            [
                taskId,
                organizationId
            ]
        );

        if (taskResult.rows.length === 0) {
            return res.status(404).send("Task not found");
        }

        const task = taskResult.rows[0];

        // Get organization members
        const membersResult = await pool.query(
            `
            SELECT
                u.id,
                u.name,
                u.email,
                om.role
            FROM organization_members om
            JOIN users u
                ON u.id = om.user_id
            WHERE om.organization_id = $1
            ORDER BY u.name ASC
            `,
            [organizationId]
        );

        res.render("tasks/edit", {
            task,
            members: membersResult.rows
        });

    } catch (error) {

        console.error(
            "Show edit task error:",
            error
        );

        res.status(500).send(
            "Failed to load edit task page"
        );
    }
};


// ============================================
// Update task
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

    try {

        if (!title || !title.trim()) {
            return res.status(400).send(
                "Task title is required"
            );
        }

        const allowedStatuses = [
            "TODO",
            "IN_PROGRESS",
            "REVIEW",
            "DONE"
        ];

        const allowedPriorities = [
            "LOW",
            "MEDIUM",
            "HIGH",
            "URGENT"
        ];

        const selectedStatus = status || "TODO";
        const selectedPriority = priority || "MEDIUM";

        if (!allowedStatuses.includes(selectedStatus)) {
            return res.status(400).send(
                "Invalid task status"
            );
        }

        if (!allowedPriorities.includes(selectedPriority)) {
            return res.status(400).send(
                "Invalid task priority"
            );
        }

        // Verify task belongs to current organization
        const taskResult = await pool.query(
            `
            SELECT project_id
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
            return res.status(404).send(
                "Task not found"
            );
        }

        const projectId =
            taskResult.rows[0].project_id;

        // Validate assignee
        let assigneeId = null;

        if (assignedTo) {

            const memberResult = await pool.query(
                `
                SELECT u.id
                FROM organization_members om
                JOIN users u
                    ON u.id = om.user_id
                WHERE om.organization_id = $1
                  AND u.id = $2
                `,
                [
                    organizationId,
                    assignedTo
                ]
            );

            if (memberResult.rows.length === 0) {
                return res.status(400).send(
                    "Selected user is not a member of this organization"
                );
            }

            assigneeId = memberResult.rows[0].id;
        }

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
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
              AND organization_id = $8
            `,
            [
                title.trim(),
                description || null,
                selectedStatus,
                selectedPriority,
                assigneeId,
                dueDate || null,
                taskId,
                organizationId
            ]
        );

        res.redirect(
            `/projects/${projectId}/tasks`
        );

    } catch (error) {

        console.error(
            "Update task error:",
            error
        );

        res.status(500).send(
            "Failed to update task"
        );
    }
};


// ============================================
// Delete task
// ============================================

exports.deleteTask = async (req, res) => {

    const { taskId } = req.params;

    const organizationId =
        req.session.user.organizationId;

    try {

        const result = await pool.query(
            `
            DELETE FROM tasks
            WHERE id = $1
              AND organization_id = $2
            RETURNING project_id
            `,
            [
                taskId,
                organizationId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).send(
                "Task not found"
            );
        }

        res.redirect(
            `/projects/${result.rows[0].project_id}/tasks`
        );

    } catch (error) {

        console.error(
            "Delete task error:",
            error
        );

        res.status(500).send(
            "Failed to delete task"
        );
    }
};