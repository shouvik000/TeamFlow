const pool = require("../config/db");


// ============================================
// Get all projects
// GET /api/projects
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
                p.updated_at,
                p.created_by,
                u.name AS created_by_name

            FROM projects p

            JOIN users u
                ON u.id = p.created_by

            WHERE p.organization_id = $1

            ORDER BY p.created_at DESC
            `,
            [
                organizationId
            ]
        );


        res.status(200).json({

            success: true,

            count: result.rows.length,

            projects: result.rows

        });

    } catch (error) {

        console.error(
            "API get projects error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load projects"

        });
    }
};


// ============================================
// Get single project
// GET /api/projects/:projectId
// ============================================

exports.getProject = async (req, res) => {

    const { projectId } =
        req.params;

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
                p.updated_at,
                p.created_by,
                u.name AS created_by_name

            FROM projects p

            JOIN users u
                ON u.id = p.created_by

            WHERE p.id = $1

              AND p.organization_id = $2
            `,
            [
                projectId,
                organizationId
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Project not found"

            });
        }


        res.status(200).json({

            success: true,

            project:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "API get project error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load project"

        });
    }
};


// ============================================
// Create project
// POST /api/projects
// ============================================

exports.createProject = async (req, res) => {

    const {
        name,
        description
    } = req.body;


    if (
        !name ||
        !name.trim()
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Project name is required"

        });
    }


    const organizationId =
        req.session.user.organizationId;

    const userId =
        req.session.user.id;


    try {

        const projectResult =
            await pool.query(
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
                    status,
                    created_at,
                    updated_at,
                    created_by
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


        res.status(201).json({

            success: true,

            message:
                "Project created successfully",

            project

        });

    } catch (error) {

        console.error(
            "API create project error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to create project"

        });
    }
};


// ============================================
// Update project
// PUT /api/projects/:projectId
// ============================================

exports.updateProject = async (req, res) => {

    const { projectId } =
        req.params;

    const {
        name,
        description,
        status
    } = req.body;


    const organizationId =
        req.session.user.organizationId;


    if (
        !name ||
        !name.trim()
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Project name is required"

        });
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

        return res.status(400).json({

            success: false,

            message:
                "Invalid project status"

        });
    }


    try {

        const result = await pool.query(
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
                description,
                status,
                created_at,
                updated_at,
                created_by
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


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Project not found"

            });
        }


        res.status(200).json({

            success: true,

            message:
                "Project updated successfully",

            project:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "API update project error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to update project"

        });
    }
};


// ============================================
// Delete project
// DELETE /api/projects/:projectId
// ============================================

exports.deleteProject = async (req, res) => {

    const { projectId } =
        req.params;

    const organizationId =
        req.session.user.organizationId;


    try {

        const result = await pool.query(
            `
            DELETE FROM projects

            WHERE id = $1

              AND organization_id = $2

            RETURNING
                id,
                name
            `,
            [
                projectId,
                organizationId
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Project not found"

            });
        }


        res.status(200).json({

            success: true,

            message:
                "Project deleted successfully",

            project:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "API delete project error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to delete project"

        });
    }
};