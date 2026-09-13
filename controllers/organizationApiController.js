const pool = require("../config/db");

const {
    generateInvitationToken,
    hashInvitationToken
} = require("../services/invitationService");


// ============================================
// Get user's organizations
// GET /api/organizations
// ============================================

exports.getMyOrganizations = async (req, res) => {

    const userId =
        req.session.user.id;

    try {

        const result =
            await pool.query(
                `
                SELECT
                    o.id,
                    o.name,
                    o.owner_id,
                    o.created_at,
                    om.role

                FROM organization_members om

                JOIN organizations o
                    ON o.id = om.organization_id

                WHERE om.user_id = $1

                ORDER BY o.name ASC
                `,
                [
                    userId
                ]
            );


        res.status(200).json({

            success: true,

            count:
                result.rows.length,

            activeOrganizationId:
                req.session.user.organizationId,

            organizations:
                result.rows

        });

    } catch (error) {

        console.error(
            "API get organizations error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load organizations"

        });
    }
};


// ============================================
// Get current organization's members
// GET /api/organizations/members
// ============================================

exports.getMembers = async (req, res) => {

    const organizationId =
        req.session.user.organizationId;

    try {

        const result =
            await pool.query(
                `
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    om.role,
                    om.joined_at

                FROM organization_members om

                JOIN users u
                    ON u.id = om.user_id

                WHERE om.organization_id = $1

                ORDER BY om.joined_at ASC
                `,
                [
                    organizationId
                ]
            );


        res.status(200).json({

            success: true,

            organizationId,

            count:
                result.rows.length,

            members:
                result.rows

        });

    } catch (error) {

        console.error(
            "API get members error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load organization members"

        });
    }
};


// ============================================
// Create invitation
// POST /api/organizations/invite
// OWNER / ADMIN
// ============================================

exports.createInvitation = async (req, res) => {

    const {
        email,
        role
    } = req.body;


    // ========================================
    // Validate input
    // ========================================

    if (
        !email ||
        !role
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Email and role are required"

        });
    }


    const normalizedEmail =
        email.toLowerCase().trim();


    const allowedRoles = [
        "ADMIN",
        "MEMBER",
        "VIEWER"
    ];


    if (
        !allowedRoles.includes(role)
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Invalid role"

        });
    }


    const organizationId =
        req.session.user.organizationId;

    const userId =
        req.session.user.id;


    try {

        // ========================================
        // Check existing member
        // ========================================

        const existingMember =
            await pool.query(
                `
                SELECT
                    u.id

                FROM users u

                JOIN organization_members om
                    ON om.user_id = u.id

                WHERE om.organization_id = $1
                  AND LOWER(u.email) = LOWER($2)
                `,
                [
                    organizationId,
                    normalizedEmail
                ]
            );


        if (
            existingMember.rows.length > 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This user is already a member"

            });
        }


        // ========================================
        // Check existing invitation
        // ========================================

        const existingInvitation =
            await pool.query(
                `
                SELECT
                    id

                FROM invitations

                WHERE organization_id = $1
                  AND LOWER(email) = LOWER($2)
                  AND accepted_at IS NULL
                  AND expires_at > NOW()
                `,
                [
                    organizationId,
                    normalizedEmail
                ]
            );


        if (
            existingInvitation.rows.length > 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "An active invitation already exists"

            });
        }


        // ========================================
        // Generate token
        // ========================================

        const token =
            generateInvitationToken();


        const tokenHash =
            hashInvitationToken(token);


        // 24-hour expiry
        const expiresAt =
            new Date(
                Date.now() +
                24 * 60 * 60 * 1000
            );


        // ========================================
        // Insert invitation
        // ========================================

        const invitationResult =
            await pool.query(
                `
                INSERT INTO invitations
                (
                    organization_id,
                    email,
                    role,
                    token_hash,
                    expires_at,
                    created_by
                )

                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6
                )

                RETURNING
                    id,
                    organization_id,
                    email,
                    role,
                    expires_at,
                    created_at
                `,
                [
                    organizationId,
                    normalizedEmail,
                    role,
                    tokenHash,
                    expiresAt,
                    userId
                ]
            );


        const invitation =
            invitationResult.rows[0];


        // ========================================
        // Create invitation URL
        // ========================================

        const baseUrl =
            process.env.APP_URL ||
            `http://localhost:${process.env.PORT || 3000}`;


        const invitationUrl =
            `${baseUrl}/organizations/invite/accept?token=${token}`;


        console.log(
            "\n================================"
        );

        console.log(
            "API INVITATION CREATED"
        );

        console.log(
            "Email:",
            normalizedEmail
        );

        console.log(
            "Role:",
            role
        );

        console.log(
            "Invitation URL:"
        );

        console.log(
            invitationUrl
        );

        console.log(
            "================================\n"
        );


        // ========================================
        // Return JSON
        // ========================================

        res.status(201).json({

            success: true,

            message:
                "Invitation created successfully",

            invitation: {

                id:
                    invitation.id,

                organizationId:
                    invitation.organization_id,

                email:
                    invitation.email,

                role:
                    invitation.role,

                expiresAt:
                    invitation.expires_at,

                createdAt:
                    invitation.created_at,

                invitationUrl

            }

        });

    } catch (error) {

        console.error(
            "API create invitation error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to create invitation"

        });
    }
};


// ============================================
// Switch active organization
// POST /api/organizations/switch
// ============================================

exports.switchOrganization = async (req, res) => {

    const {
        organizationId
    } = req.body;


    const userId =
        req.session.user.id;


    if (!organizationId) {

        return res.status(400).json({

            success: false,

            message:
                "Organization ID is required"

        });
    }


    try {

        const membershipResult =
            await pool.query(
                `
                SELECT
                    om.organization_id,
                    om.role,
                    o.name AS organization_name

                FROM organization_members om

                JOIN organizations o
                    ON o.id = om.organization_id

                WHERE om.user_id = $1
                  AND om.organization_id = $2
                `,
                [
                    userId,
                    organizationId
                ]
            );


        if (
            membershipResult.rows.length === 0
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "You are not a member of this organization"

            });
        }


        const organization =
            membershipResult.rows[0];


        // ========================================
        // Update active organization
        // ========================================

        req.session.user.organizationId =
            organization.organization_id;

        req.session.user.organizationName =
            organization.organization_name;

        req.session.user.role =
            organization.role;


        req.session.save((err) => {

            if (err) {

                console.error(
                    "API session save error:",
                    err
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to save organization session"

                });
            }


            res.status(200).json({

                success: true,

                message:
                    "Organization switched successfully",

                activeOrganization: {

                    id:
                        organization.organization_id,

                    name:
                        organization.organization_name,

                    role:
                        organization.role

                }

            });

        });

    } catch (error) {

        console.error(
            "API switch organization error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to switch organization"

        });
    }
};