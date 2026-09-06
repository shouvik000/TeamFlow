

const crypto = require("crypto");

const pool = require("../config/db");

const {
    generateInvitationToken,
    hashInvitationToken
} = require("../services/invitationService");



// Show members


exports.getMembers = async (req, res) => {

    try {

        const organizationId =
            req.session.user.organizationId;

        const result = await pool.query(
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
            [organizationId]
        );

        res.render("organizations/members", {
            members: result.rows
        });

    } catch (error) {

        console.error(
            "Get members error:",
            error
        );

        res.status(500).send(
            "Failed to load members"
        );
    }
};



// Show invitation form


exports.showInviteForm = (req, res) => {

    res.render("organizations/invite");

};


// Create invitation


exports.createInvitation = async (req, res) => {

    const {
        email,
        role
    } = req.body;

    try {

        if (!email || !role) {

            return res.status(400).send(
                "Email and role are required"
            );

        }


        const normalizedEmail =
            email.toLowerCase().trim();


        const allowedRoles = [
            "ADMIN",
            "MEMBER",
            "VIEWER"
        ];


        if (!allowedRoles.includes(role)) {

            return res.status(400).send(
                "Invalid role"
            );

        }


        const organizationId =
            req.session.user.organizationId;

        const userId =
            req.session.user.id;


        // Check whether user is already a member
        const existingMember =
            await pool.query(
                `
                SELECT u.id
                FROM users u
                JOIN organization_members om
                    ON om.user_id = u.id
                WHERE om.organization_id = $1
                AND u.email = $2
                `,
                [
                    organizationId,
                    normalizedEmail
                ]
            );


        if (existingMember.rows.length > 0) {

            return res.status(400).send(
                "This user is already a member"
            );

        }


        // Check existing pending invitation
        const existingInvitation =
            await pool.query(
                `
                SELECT id
                FROM invitations
                WHERE organization_id = $1
                AND email = $2
                AND accepted_at IS NULL
                AND expires_at > NOW()
                `,
                [
                    organizationId,
                    normalizedEmail
                ]
            );


        if (existingInvitation.rows.length > 0) {

            return res.status(400).send(
                "An active invitation already exists"
            );

        }


        // Generate raw token
        const token =
            generateInvitationToken();


        // Hash token for database
        const tokenHash =
            hashInvitationToken(token);


        // Invitation expires in 24 hours
        const expiresAt =
            new Date(
                Date.now() +
                24 * 60 * 60 * 1000
            );


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
            VALUES ($1, $2, $3, $4, $5, $6)
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


        /*
         * For development we print the invitation URL.
         Later we'll send this URL using Nodemailer.
         */

        const baseUrl =
            process.env.APP_URL ||
            `http://localhost:${process.env.PORT || 3000}`;

        const invitationUrl =
            `${baseUrl}/organizations/invite/accept?token=${token}`;


        console.log("\n================================");
        console.log("INVITATION CREATED");
        console.log("Email:", normalizedEmail);
        console.log("Role:", role);
        console.log("Invitation URL:");
        console.log(invitationUrl);
        console.log("================================\n");


        res.redirect("/organizations/members");

    } catch (error) {

        console.error(
            "Create invitation error:",
            error
        );

        res.status(500).send(
            "Failed to create invitation"
        );
    }
};



// Show invitation acceptance page


exports.showAcceptInvitation = async (req, res) => {

    const {
        token
    } = req.query;


    if (!token) {

        return res.status(400).send(
            "Invitation token is missing"
        );

    }


    try {

        const tokenHash =
            hashInvitationToken(token);


        const result = await pool.query(
            `
            SELECT
                i.id,
                i.email,
                i.role,
                i.expires_at,
                o.name AS organization_name
            FROM invitations i
            JOIN organizations o
                ON o.id = i.organization_id
            WHERE i.token_hash = $1
            AND i.accepted_at IS NULL
            AND i.expires_at > NOW()
            `,
            [tokenHash]
        );


        if (result.rows.length === 0) {

            return res.status(400).send(
                "Invalid or expired invitation"
            );

        }


        res.render(
            "organizations/accept-invite",
            {
                invitation: result.rows[0],
                token
            }
        );


    } catch (error) {

        console.error(
            "Show invitation error:",
            error
        );

        res.status(500).send(
            "Failed to process invitation"
        );
    }
};









// Accept invitation


exports.acceptInvitation = async (req, res) => {

    const {
        invitationId
    } = req.body;


    if (!invitationId) {

        return res.status(400).send(
            "Invitation ID is required"
        );

    }


    if (!req.session || !req.session.user) {

        return res.redirect("/auth/login");

    }


    try {

        const currentUser =
            req.session.user;


        const client =
            await pool.connect();


        try {

            await client.query("BEGIN");


            // Find invitation
            const invitationResult =
                await client.query(
                    `
                    SELECT
                        i.id,
                        i.organization_id,
                        i.email,
                        i.role,
                        o.name AS organization_name
                    FROM invitations i
                    JOIN organizations o
                        ON o.id = i.organization_id
                    WHERE i.id = $1
                      AND i.accepted_at IS NULL
                      AND i.expires_at > NOW()
                    FOR UPDATE
                    `,
                    [invitationId]
                );


            if (invitationResult.rows.length === 0) {

                await client.query("ROLLBACK");

                return res.status(400).send(
                    "Invalid or expired invitation"
                );

            }


            const invitation =
                invitationResult.rows[0];


            // Verify invitation belongs to logged-in user
            if (
                currentUser.email.toLowerCase() !==
                invitation.email.toLowerCase()
            ) {

                await client.query("ROLLBACK");

                return res.status(403).send(
                    "This invitation belongs to a different email address"
                );

            }


            // Check existing membership
            const memberResult =
                await client.query(
                    `
                    SELECT id
                    FROM organization_members
                    WHERE organization_id = $1
                      AND user_id = $2
                    `,
                    [
                        invitation.organization_id,
                        currentUser.id
                    ]
                );


            // Add member if not already a member
            if (memberResult.rows.length === 0) {

                await client.query(
                    `
                    INSERT INTO organization_members
                    (
                        organization_id,
                        user_id,
                        role
                    )
                    VALUES ($1, $2, $3)
                    `,
                    [
                        invitation.organization_id,
                        currentUser.id,
                        invitation.role
                    ]
                );

            }


            // Mark invitation as accepted
            await client.query(
                `
                UPDATE invitations
                SET accepted_at = NOW()
                WHERE id = $1
                `,
                [invitation.id]
            );


            await client.query("COMMIT");


            // ==========================================
            // SWITCH CURRENT SESSION TO NEW ORGANIZATION
            // ==========================================

            req.session.user.organizationId =
                invitation.organization_id;

            req.session.user.organizationName =
                invitation.organization_name;

            req.session.user.role =
                invitation.role;


            req.session.save((err) => {

                if (err) {

                    console.error(
                        "Session save error:",
                        err
                    );

                    return res.status(500).send(
                        "Could not save session"
                    );

                }

                res.redirect("/dashboard");

            });


        } catch (error) {

            await client.query("ROLLBACK");

            throw error;

        } finally {

            client.release();

        }


    } catch (error) {

        console.error(
            "Accept invitation error:",
            error
        );

        res.status(500).send(
            "Failed to accept invitation"
        );

    }

};