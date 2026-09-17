
const pool = require("../config/db");


// ============================================
// LOAD CURRENT ORGANIZATION
// ============================================

exports.loadOrganization = async (req, res, next) => {

    try {

        // ========================================
        // User must be logged in
        // ========================================

        if (
            !req.session ||
            !req.session.user
        ) {

            return res.redirect(
                "/auth/login"
            );
        }


        const userId =
            req.session.user.id;

        const organizationId =
            req.session.user.organizationId;


        // ========================================
        // Validate active organization
        // ========================================

        if (!organizationId) {

            return res.redirect(
                "/organizations/switch"
            );
        }


        // ========================================
        // Check organization + membership
        // ========================================

        const result =
            await pool.query(
                `
                SELECT
                    o.id,
                    o.name,
                    o.owner_id,
                    o.created_at,

                    om.id AS membership_id,
                    om.user_id,
                    om.role,
                    om.joined_at

                FROM organizations o

                JOIN organization_members om
                    ON om.organization_id = o.id

                WHERE o.id = $1

                  AND om.user_id = $2

                LIMIT 1
                `,
                [
                    organizationId,
                    userId
                ]
            );


        // ========================================
        // Organization does not exist
        // OR
        // User is no longer a member
        // ========================================

        if (
            result.rows.length === 0
        ) {

            console.log(
                `⚠️ Organization access denied: user=${userId} organization=${organizationId}`
            );


            // ====================================
            // Find another organization
            // the user still belongs to
            // ====================================

            const fallbackResult =
                await pool.query(
                    `
                    SELECT
                        o.id,
                        o.name,
                        om.role

                    FROM organization_members om

                    JOIN organizations o
                        ON o.id = om.organization_id

                    WHERE om.user_id = $1

                    ORDER BY om.joined_at ASC

                    LIMIT 1
                    `,
                    [
                        userId
                    ]
                );


            // ====================================
            // User has another organization
            // ====================================

            if (
                fallbackResult.rows.length > 0
            ) {

                const fallbackOrganization =
                    fallbackResult.rows[0];


                console.log(
                    `🔄 Switching removed user ${userId} to organization ${fallbackOrganization.id}`
                );


                req.session.user.organizationId =
                    fallbackOrganization.id;


                req.session.user.organizationName =
                    fallbackOrganization.name;


                req.session.user.role =
                    fallbackOrganization.role;


                return req.session.save(
                    (err) => {

                        if (err) {

                            console.error(
                                "Fallback session save error:",
                                err
                            );


                            return res.status(500).send(
                                "Failed to update organization session"
                            );
                        }


                        return res.redirect(
                            req.originalUrl
                        );
                    }
                );
            }


            // ====================================
            // User has no organizations left
            // ====================================

            console.log(
                `🚪 User ${userId} has no organizations remaining`
            );


            // Remove invalid organization data
            // from the session

            delete req.session.user.organizationId;
            delete req.session.user.organizationName;
            delete req.session.user.role;


            return req.session.save(
                (err) => {

                    if (err) {

                        console.error(
                            "Session cleanup error:",
                            err
                        );


                        return res.status(500).send(
                            "Failed to update session"
                        );
                    }


                    return res.redirect(
                        "/dashboard"
                    );
                }
            );
        }


        // ========================================
        // Organization + membership found
        // ========================================

        const organization =
            result.rows[0];


        // ========================================
        // Keep session role synchronized
        // ========================================

        req.session.user.organizationId =
            organization.id;


        req.session.user.organizationName =
            organization.name;


        req.session.user.role =
            organization.role;


        // ========================================
        // Attach organization to request
        // ========================================

        req.organization = {

            id:
                organization.id,

            name:
                organization.name,

            owner_id:
                organization.owner_id,

            created_at:
                organization.created_at,

            membership_id:
                organization.membership_id,

            user_id:
                organization.user_id,

            role:
                organization.role,

            joined_at:
                organization.joined_at
        };


        // ========================================
        // Make organization available in EJS
        // ========================================

        res.locals.organization =
            req.organization;


        // ========================================
        // Make current user available
        // ========================================

        res.locals.user =
            req.session.user;


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


// ============================================
// ROLE AUTHORIZATION
// ============================================

exports.requireRole = (...allowedRoles) => {

    return (req, res, next) => {

        // ========================================
        // User must be logged in
        // ========================================

        if (
            !req.session ||
            !req.session.user
        ) {

            return res.redirect(
                "/auth/login"
            );
        }


        const userRole =
            req.session.user.role;


        // ========================================
        // Check role
        // ========================================

        if (
            !allowedRoles.includes(
                userRole
            )
        ) {

            return res.status(403).render(
                "errors/403",
                {
                    user:
                        req.session.user,

                    allowedRoles
                }
            );
        }


        next();
    };
};