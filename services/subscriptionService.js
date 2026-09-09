const pool = require("../config/db");


// ============================================
// Get organization subscription
// ============================================

exports.getOrganizationSubscription = async (
    organizationId
) => {

    const result = await pool.query(
        `
        SELECT
            s.id AS subscription_id,
            s.status,

            p.id AS plan_id,
            p.name AS plan_name,
            p.price_monthly,
            p.max_projects,
            p.max_members,
            p.max_tasks

        FROM subscriptions s

        JOIN plans p
            ON p.id = s.plan_id

        WHERE s.organization_id = $1
        `,
        [organizationId]
    );

    return result.rows[0] || null;
};