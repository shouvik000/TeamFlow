const pool = require("../config/db");

const {
    getOrganizationBillingInfo
} = require("../services/subscriptionService");


// ============================================
// Show plans
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


        const billing =
            await getOrganizationBillingInfo(
                organizationId
            );


        if (!billing) {

            return res.status(404).send(
                "Subscription not found"
            );

        }


        res.render(
            "billing/plans",
            {
                plans: plansResult.rows,

                subscription:
                    billing.subscription,

                usage:
                    billing.usage
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


// ============================================
// Get usage as JSON
// ============================================

exports.getUsage = async (req, res) => {

    const organizationId =
        req.session.user.organizationId;

    try {

        const billing =
            await getOrganizationBillingInfo(
                organizationId
            );


        if (!billing) {

            return res.status(404).json({
                success: false,
                message: "Subscription not found"
            });

        }


        res.json({

            success: true,

            subscription:
                billing.subscription,

            usage:
                billing.usage

        });

    } catch (error) {

        console.error(
            "Get usage error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load billing usage"

        });
    }
};