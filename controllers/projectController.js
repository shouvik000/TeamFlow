const pool = require("../config/db");

const {
    createActivityLog
} = require("../services/activityService");


// ============================================
// Get all projects
// ============================================

exports.getProjects = async (req, res) => {

    const organizationId =
        req.session.user.organizationId;

    try {

        const result = await pool.query(
            `
            SELECT
                p.id,
                p.name,
                p.description,
                p.status,
                p.created_at,
                u.name AS created_by_name
            FROM projects p
            JOIN users u
                ON u.id = p.created_by
            WHERE p.organization_id = $1
            ORDER BY p.created_at DESC
            `,
            [organizationId]
        );


        res.render("projects/index", {
            projects: result.rows
        });

    } catch (error) {

        console.error(
            "Get projects error:",
            error
        );

        res.status(500).send(
            "Failed to load projects"
        );
    }
};


// ============================================
// Show create project page
// ============================================

exports.showCreateProject = (req, res) => {

    res.render("projects/create");

};


// ============================================
// Create project
// ============================================

exports.createProject = async (req, res) => {

    const {
        name,
        description
    } = req.body;


    // ========================================
    // Validation
    // ========================================

    if (!name || !name.trim()) {

        return res.status(400).send(
            "Project name is required"
        );

    }


    try {

        const organizationId =
            req.session.user.organizationId;

        const userId =
            req.session.user.id;


        // ====================================
        // Create project
        // ====================================

        const projectResult = await pool.query(
            `
            INSERT INTO projects
            (
                organization_id,
                name,
                description,
                created_by
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4
            )
            RETURNING
                id,
                name,
                description,
                status
            `,
            [
                organizationId,
                name.trim(),
                description
                    ? description.trim()
                    : null,
                userId
            ]
        );


        const project =
            projectResult.rows[0];


        // ====================================
        // Activity log
        // ====================================

        await createActivityLog({

            organizationId,

            userId,

            action: "PROJECT_CREATED",

            entityType: "PROJECT",

            entityId: project.id,

            description:
                `Created project "${project.name}"`

        });


        res.redirect("/projects");

    } catch (error) {

        console.error(
            "Create project error:",
            error
        );

        res.status(500).send(
            "Failed to create project"
        );
    }
};


// ============================================
// Show edit project page
// ============================================

exports.showEditProject = async (req, res) => {

    const { projectId } = req.params;

    const organizationId =
        req.session.user.organizationId;


    try {

        const result = await pool.query(
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


        if (result.rows.length === 0) {

            return res.status(404).send(
                "Project not found"
            );

        }


        res.render("projects/edit", {
            project: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Show edit project error:",
            error
        );

        res.status(500).send(
            "Failed to load edit project page"
        );
    }
};


// ============================================
// Update project
// ============================================

exports.updateProject = async (req, res) => {

    const { projectId } = req.params;

    const {
        name,
        description,
        status
    } = req.body;


    const organizationId =
        req.session.user.organizationId;

    const userId =
        req.session.user.id;


    try {

        // ====================================
        // Validation
        // ====================================

        if (!name || !name.trim()) {

            return res.status(400).send(
                "Project name is required"
            );

        }


        const allowedStatuses = [
            "ACTIVE",
            "ARCHIVED"
        ];


        const selectedStatus =
            status || "ACTIVE";


        if (
            !allowedStatuses.includes(
                selectedStatus
            )
        ) {

            return res.status(400).send(
                "Invalid project status"
            );

        }


        // ====================================
        // Find existing project
        // ====================================

        const existingResult =
            await pool.query(
                `
                SELECT
                    id,
                    name,
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


        if (existingResult.rows.length === 0) {

            return res.status(404).send(
                "Project not found"
            );

        }


        const oldProject =
            existingResult.rows[0];


        // ====================================
        // Update project
        // ====================================

        const updatedResult =
            await pool.query(
                `
                UPDATE projects

                SET
                    name = $1,
                    description = $2,
                    status = $3,
                    updated_at = CURRENT_TIMESTAMP

                WHERE id = $4
                  AND organization_id = $5

                RETURNING
                    id,
                    name,
                    status
                `,
                [
                    name.trim(),

                    description
                        ? description.trim()
                        : null,

                    selectedStatus,

                    projectId,

                    organizationId
                ]
            );


        const updatedProject =
            updatedResult.rows[0];


        // ====================================
        // Activity log
        // ====================================

        let descriptionText =
            `Updated project "${updatedProject.name}"`;


        if (
            oldProject.status !==
            updatedProject.status
        ) {

            descriptionText +=
                ` | Status: ${oldProject.status} → ${updatedProject.status}`;

        }


        await createActivityLog({

            organizationId,

            userId,

            action: "PROJECT_UPDATED",

            entityType: "PROJECT",

            entityId: updatedProject.id,

            description: descriptionText

        });


        res.redirect("/projects");

    } catch (error) {

        console.error(
            "Update project error:",
            error
        );

        res.status(500).send(
            "Failed to update project"
        );
    }
};


// ============================================
// Delete project
// ============================================

exports.deleteProject = async (req, res) => {

    const { projectId } = req.params;

    const organizationId =
        req.session.user.organizationId;

    const userId =
        req.session.user.id;


    try {

        // ====================================
        // Find project first
        // ====================================

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

            return res.status(404).send(
                "Project not found"
            );

        }


        const project =
            projectResult.rows[0];


        // ====================================
        // Delete project
        // ====================================

        await pool.query(
            `
            DELETE FROM projects
            WHERE id = $1
              AND organization_id = $2
            `,
            [
                projectId,
                organizationId
            ]
        );


        // ====================================
        // Activity log
        // ====================================

        await createActivityLog({

            organizationId,

            userId,

            action: "PROJECT_DELETED",

            entityType: "PROJECT",

            entityId: project.id,

            description:
                `Deleted project "${project.name}"`

        });


        res.redirect("/projects");

    } catch (error) {

        console.error(
            "Delete project error:",
            error
        );

        res.status(500).send(
            "Failed to delete project"
        );
    }
};