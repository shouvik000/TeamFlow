const pool = require("../config/db");


// ============================================
// Show pricing / current plan
// ============================================

exports.getPlans = async (req, res) => {

    const organizationId =
        req.session.user.organizationId;

    try {

        const plansResult = await pool.query(
            `
            SELECT
                id,
                name,
                price_monthly,
                max_projects,
                max_members,
                max_tasks
            FROM plans
            ORDER BY price_monthly ASC
            `
        );


        const subscriptionResult =
            await pool.query(
                `
                SELECT
                    s.id,
                    s.status,
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


        res.render(
            "billing/plans",
            {
                plans: plansResult.rows,
                subscription:
                    subscriptionResult.rows[0] || null
            }
        );

    } catch (error) {

        console.error(
            "Get plans error:",
            error
        );

        res.status(500).send(
            "Failed to load subscription plans"
        );
    }
};