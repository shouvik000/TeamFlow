const pool = require("../config/db");


// ============================================
// Get organization activity
// ============================================

exports.getActivities = async (req, res) => {

    const organizationId =
        req.session.user.organizationId;

    try {

        const result = await pool.query(
            `
            SELECT
                a.id,
                a.action,
                a.entity_type,
                a.entity_id,
                a.description,
                a.created_at,
                u.name AS user_name

            FROM activity_logs a

            LEFT JOIN users u
                ON u.id = a.user_id

            WHERE a.organization_id = $1

            ORDER BY a.created_at DESC

            LIMIT 100
            `,
            [organizationId]
        );

        res.render(
            "dashboard/activity",
            {
                activities: result.rows
            }
        );

    } catch (error) {

        console.error(
            "Get activities error:",
            error
        );

        res.status(500).send(
            "Failed to load activities"
        );
    }
};