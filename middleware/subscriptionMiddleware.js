const pool = require("../config/db");


// ============================================
// Check project limit
// ============================================

exports.checkProjectLimit = async (
    req,
    res,
    next
) => {

    try {

        const organizationId =
            req.session.user.organizationId;


        // Get plan limit
        const subscriptionResult =
            await pool.query(
                `
                SELECT
                    p.max_projects,
                    p.name AS plan_name

                FROM subscriptions s

                JOIN plans p
                    ON p.id = s.plan_id

                WHERE s.organization_id = $1
                `,
                [organizationId]
            );


        if (
            subscriptionResult.rows.length === 0
        ) {

            return res.status(403).send(
                "No active subscription found"
            );

        }


        const subscription =
            subscriptionResult.rows[0];


        // NULL means unlimited
        if (
            subscription.max_projects === null
        ) {

            return next();

        }


        // Count projects
        const projectResult =
            await pool.query(
                `
                SELECT COUNT(*)::INTEGER AS count

                FROM projects

                WHERE organization_id = $1
                `,
                [organizationId]
            );


        const projectCount =
            projectResult.rows[0].count;


        if (
            projectCount >=
            subscription.max_projects
        ) {

            return res.status(403).send(
                `Your ${subscription.plan_name} plan allows only ${subscription.max_projects} project(s). Please upgrade your plan.`
            );

        }


        next();

    } catch (error) {

        console.error(
            "Project subscription check error:",
            error
        );

        res.status(500).send(
            "Failed to check subscription"
        );
    }
};