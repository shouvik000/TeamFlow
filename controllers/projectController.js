

const pool = require("../config/db");



// Show projects


exports.getProjects = async (req, res) => {

    try {

        const organizationId =
            req.session.user.organizationId;


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




// Show create project form


exports.showCreateProject = (req, res) => {

    res.render("projects/create");

};




// Create project


exports.createProject = async (req, res) => {

    const {
        name,
        description
    } = req.body;


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


        await pool.query(
            `
            INSERT INTO projects
            (
                organization_id,
                name,
                description,
                created_by
            )
            VALUES ($1, $2, $3, $4)
            `,
            [
                organizationId,
                name.trim(),
                description || null,
                userId
            ]
        );


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