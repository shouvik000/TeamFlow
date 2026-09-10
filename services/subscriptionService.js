const pool = require("../config/db");


// ============================================
// Get organization's current subscription
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

        LIMIT 1
        `,
        [organizationId]
    );

    return result.rows[0] || null;
};


// ============================================
// Get organization usage
// ============================================

exports.getOrganizationUsage = async (
    organizationId
) => {

    const result = await pool.query(
        `
        SELECT

            (
                SELECT COUNT(*)::INTEGER
                FROM projects
                WHERE organization_id = $1
            ) AS project_count,

            (
                SELECT COUNT(*)::INTEGER
                FROM organization_members
                WHERE organization_id = $1
            ) AS member_count,

            (
                SELECT COUNT(*)::INTEGER
                FROM tasks
                WHERE organization_id = $1
            ) AS task_count
        `,
        [organizationId]
    );

    return result.rows[0];
};


// ============================================
// Get subscription + usage together
// ============================================

exports.getOrganizationBillingInfo = async (
    organizationId
) => {

    const subscription =
        await exports.getOrganizationSubscription(
            organizationId
        );

    if (!subscription) {
        return null;
    }

    const usage =
        await exports.getOrganizationUsage(
            organizationId
        );

    return {
        subscription,
        usage
    };
};



// ============================================
// Change organization plan
// ============================================

exports.changeOrganizationPlan = async (
    organizationId,
    planId
) => {

    const result = await pool.query(
        `
        UPDATE subscriptions

        SET
            plan_id = $1,
            status = 'ACTIVE',
            updated_at = CURRENT_TIMESTAMP

        WHERE organization_id = $2

        RETURNING *
        `,
        [
            planId,
            organizationId
        ]
    );


    return result.rows[0] || null;
};