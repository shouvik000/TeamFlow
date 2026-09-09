const {
    getOrganizationSubscription,
    getOrganizationUsage
} = require("../services/subscriptionService");


// ============================================
// Get subscription safely
// ============================================

const loadBillingData = async (req) => {

    const organizationId =
        req.session.user.organizationId;

    const subscription =
        await getOrganizationSubscription(
            organizationId
        );

    if (!subscription) {
        throw new Error(
            "Organization has no subscription"
        );
    }

    return subscription;
};


// ============================================
// Check project limit
// ============================================

exports.checkProjectLimit = async (
    req,
    res,
    next
) => {

    try {

        const subscription =
            await loadBillingData(req);

        const usage =
            await getOrganizationUsage(
                req.session.user.organizationId
            );


        // NULL = unlimited
        if (
            subscription.max_projects === null
        ) {

            return next();

        }


        if (
            usage.project_count >=
            subscription.max_projects
        ) {

            return res.status(403).send(
                `Your ${subscription.plan_name} plan allows only ${subscription.max_projects} project(s). Please upgrade your plan.`
            );

        }


        next();

    } catch (error) {

        console.error(
            "Project limit error:",
            error
        );

        res.status(500).send(
            "Failed to check project limit"
        );
    }
};


// ============================================
// Check member limit
// ============================================

exports.checkMemberLimit = async (
    req,
    res,
    next
) => {

    try {

        const subscription =
            await loadBillingData(req);

        const usage =
            await getOrganizationUsage(
                req.session.user.organizationId
            );


        // NULL = unlimited
        if (
            subscription.max_members === null
        ) {

            return next();

        }


        if (
            usage.member_count >=
            subscription.max_members
        ) {

            return res.status(403).send(
                `Your ${subscription.plan_name} plan allows only ${subscription.max_members} member(s). Please upgrade your plan.`
            );

        }


        next();

    } catch (error) {

        console.error(
            "Member limit error:",
            error
        );

        res.status(500).send(
            "Failed to check member limit"
        );
    }
};


// ============================================
// Check task limit
// ============================================

exports.checkTaskLimit = async (
    req,
    res,
    next
) => {

    try {

        const subscription =
            await loadBillingData(req);

        const usage =
            await getOrganizationUsage(
                req.session.user.organizationId
            );


        // NULL = unlimited
        if (
            subscription.max_tasks === null
        ) {

            return next();

        }


        if (
            usage.task_count >=
            subscription.max_tasks
        ) {

            return res.status(403).send(
                `Your ${subscription.plan_name} plan allows only ${subscription.max_tasks} task(s). Please upgrade your plan.`
            );

        }


        next();

    } catch (error) {

        console.error(
            "Task limit error:",
            error
        );

        res.status(500).send(
            "Failed to check task limit"
        );
    }
};