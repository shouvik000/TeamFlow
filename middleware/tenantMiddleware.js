


const pool = require("../config/db");



// Load current organization


exports.loadOrganization = async (req, res, next) => {

    try {

        // User must be logged in
        if (!req.session || !req.session.user) {
            return res.redirect("/auth/login");
        }

        const organizationId =
            req.session.user.organizationId;

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                owner_id,
                created_at
            FROM organizations
            WHERE id = $1
            `,
            [organizationId]
        );

        if (result.rows.length === 0) {
            return res.status(404).send(
                "Organization not found"
            );
        }

        req.organization = result.rows[0];

        res.locals.organization = result.rows[0];

        next();

    } catch (error) {

        console.error(
            "Organization middleware error:",
            error
        );

        res.status(500).send(
            "Failed to load organization"
        );
    }
};



// Role authorization


exports.requireRole = (...allowedRoles) => {

    return (req, res, next) => {

        if (!req.session || !req.session.user) {
            return res.redirect("/auth/login");
        }

        const userRole =
            req.session.user.role;

        if (!allowedRoles.includes(userRole)) {

            return res.status(403).render(
                "errors/403",
                {
                    user: req.session.user,
                    allowedRoles
                }
            );
        }

        next();
    };
};