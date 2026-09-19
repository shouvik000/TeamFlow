const pool = require("../config/db");


// ============================================
// INVITATION SERVICE
// ============================================

const {
    generateInvitationToken,
    hashInvitationToken
} = require("../services/invitationService");


// ============================================
// ACTIVITY SERVICE
// ============================================

const {
    createActivityLog
} = require("../services/activityService");


// ============================================
// NOTIFICATION SERVICE
// ============================================

const {
    createNotification
} = require("../services/notificationService");


// ============================================
// EMAIL SERVICE
// ============================================

const {
    sendInvitationEmail
} = require("../services/emailService");


// ============================================
// SOCKET.IO SERVICE
// ============================================

const {
    getIO,
    getUserRoom,
    getOrganizationRoom
} = require("../services/socketService");


// ============================================
// SHOW MEMBERS
// ============================================

exports.getMembers = async (req, res) => {

    try {

        const organizationId =
            req.session.user.organizationId;


        // ========================================
        // Get organization members
        // ========================================

        const memberResult =
            await pool.query(
                `
                SELECT
                    u.id,
                    om.id AS membership_id,
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


        // ========================================
        // Get pending invitations
        // ========================================

        const invitationResult =
            await pool.query(
                `
                SELECT
                    i.id,
                    i.organization_id,
                    i.email,
                    i.role,
                    i.expires_at,
                    i.created_at,

                    CASE
                        WHEN i.expires_at <= NOW()
                        THEN TRUE
                        ELSE FALSE
                    END AS is_expired,

                    u.name AS created_by_name

                FROM invitations i

                LEFT JOIN users u
                    ON u.id = i.created_by

                WHERE i.organization_id = $1

                  AND i.accepted_at IS NULL

                ORDER BY i.created_at DESC
                `,
                [
                    organizationId
                ]
            );


        // ========================================
        // Render members page
        // ========================================

        res.render(
            "organizations/members",
            {
                members:
                    memberResult.rows,

                pendingInvitations:
                    invitationResult.rows
            }
        );


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


// ============================================
// SHOW INVITATION FORM
// ============================================

exports.showInviteForm = (req, res) => {

    res.render(
        "organizations/invite"
    );

};


// ============================================
// CREATE INVITATION
// ============================================

exports.createInvitation = async (req, res) => {

    const {
        email,
        role
    } = req.body;


    try {

        // ========================================
        // Validate input
        // ========================================

        if (
            !email ||
            !role
        ) {

            return res.status(400).send(
                "Email and role are required"
            );
        }


        const normalizedEmail =
            email
                .toLowerCase()
                .trim();


        const allowedRoles = [
            "ADMIN",
            "MEMBER",
            "VIEWER"
        ];


        if (
            !allowedRoles.includes(role)
        ) {

            return res.status(400).send(
                "Invalid role"
            );
        }


        const organizationId =
            req.session.user.organizationId;


        const userId =
            req.session.user.id;


        // ========================================
        // Organization name
        // ========================================

        let organizationName =
            req.organization?.name;


        if (!organizationName) {

            const organizationResult =
                await pool.query(
                    `
                    SELECT
                        name

                    FROM organizations

                    WHERE id = $1

                    LIMIT 1
                    `,
                    [
                        organizationId
                    ]
                );


            if (
                organizationResult.rows.length > 0
            ) {

                organizationName =
                    organizationResult.rows[0].name;
            }
        }


        organizationName =
            organizationName ||
            "TeamFlow Organization";


        // ========================================
        // Check existing membership
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

            return res.status(400).send(
                "This user is already a member"
            );
        }


        // ========================================
        // Check existing active invitation
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

            return res.status(400).send(
                "An active invitation already exists"
            );
        }


        // ========================================
        // Generate invitation token
        // ========================================

        const token =
            generateInvitationToken();


        const tokenHash =
            hashInvitationToken(
                token
            );


        // ========================================
        // Invitation expires in 24 hours
        // ========================================

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
                    id
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


        const invitationId =
            invitationResult.rows[0].id;


        // ========================================
        // Create invitation URL
        // ========================================

        const baseUrl =
            process.env.APP_URL ||
            `http://localhost:${process.env.PORT || 3000}`;


        const invitationUrl =
            `${baseUrl}/organizations/invite/accept?token=${token}`;


        console.log(
            "\n========================================"
        );

        console.log(
            "📨 INVITATION CREATED"
        );

        console.log(
            "Recipient:",
            normalizedEmail
        );

        console.log(
            "Organization:",
            organizationName
        );

        console.log(
            "Role:",
            role
        );

        console.log(
            "Invitation URL:",
            invitationUrl
        );

        console.log(
            "========================================"
        );


        // ========================================
        // Send invitation email
        // ========================================

        try {

            console.log(
                "📧 Sending invitation email..."
            );


            await sendInvitationEmail({

                to:
                    normalizedEmail,

                organizationName,

                role,

                invitationUrl
            });


            console.log(
                "✅ Invitation email sent successfully"
            );


        } catch (emailError) {

            console.error(
                "❌ Invitation email failed:",
                emailError
            );


            // ====================================
            // Delete invitation when email fails
            // ====================================

            try {

                await pool.query(
                    `
                    DELETE FROM invitations

                    WHERE id = $1
                    `,
                    [
                        invitationId
                    ]
                );


                console.log(
                    "🗑️ Failed invitation record removed"
                );


            } catch (deleteError) {

                console.error(
                    "❌ Failed to remove invitation:",
                    deleteError
                );
            }


            return res.status(500).send(
                "Invitation was not sent. Please check your email configuration and try again."
            );
        }


        // ========================================
        // Activity log
        // ========================================

        await createActivityLog({

            organizationId,

            userId,

            action:
                "INVITATION_CREATED",

            entityType:
                "INVITATION",

            entityId:
                invitationId,

            description:
                `Invited ${normalizedEmail} as ${role}`
        });


        // ========================================
        // Success
        // ========================================

        res.redirect(
            "/organizations/members"
        );


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


// ============================================
// RESEND INVITATION
// ============================================

exports.resendInvitation = async (req, res) => {

    const {
        invitationId
    } = req.params;


    const organizationId =
        req.session.user.organizationId;


    const currentUserId =
        req.session.user.id;


    try {

        // ========================================
        // Validate invitation ID
        // ========================================

        if (
            !invitationId ||
            !/^\d+$/.test(
                String(invitationId)
            )
        ) {

            return res.status(400).send(
                "Invalid invitation ID"
            );
        }


        // ========================================
        // Get existing invitation
        // ========================================

        const invitationResult =
            await pool.query(
                `
                SELECT
                    i.id,
                    i.organization_id,
                    i.email,
                    i.role,
                    i.token_hash,
                    i.expires_at,
                    o.name AS organization_name

                FROM invitations i

                JOIN organizations o
                    ON o.id = i.organization_id

                WHERE i.id = $1

                  AND i.organization_id = $2

                  AND i.accepted_at IS NULL

                LIMIT 1
                `,
                [
                    invitationId,
                    organizationId
                ]
            );


        if (
            invitationResult.rows.length === 0
        ) {

            return res.status(404).send(
                "Pending invitation not found"
            );
        }


        const invitation =
            invitationResult.rows[0];


        // ========================================
        // Save old values in case email fails
        // ========================================

        const oldTokenHash =
            invitation.token_hash;


        const oldExpiresAt =
            invitation.expires_at;


        // ========================================
        // Generate new token
        // ========================================

        const token =
            generateInvitationToken();


        const tokenHash =
            hashInvitationToken(
                token
            );


        const newExpiresAt =
            new Date(
                Date.now() +
                24 * 60 * 60 * 1000
            );


        // ========================================
        // Update invitation
        // ========================================

        await pool.query(
            `
            UPDATE invitations

            SET
                token_hash = $1,
                expires_at = $2

            WHERE id = $3

              AND organization_id = $4

              AND accepted_at IS NULL
            `,
            [
                tokenHash,
                newExpiresAt,
                invitation.id,
                organizationId
            ]
        );


        // ========================================
        // Build new invitation URL
        // ========================================

        const baseUrl =
            process.env.APP_URL ||
            `http://localhost:${process.env.PORT || 3000}`;


        const invitationUrl =
            `${baseUrl}/organizations/invite/accept?token=${token}`;


        // ========================================
        // Send email
        // ========================================

        try {

            console.log(
                "📧 Resending invitation email..."
            );


            await sendInvitationEmail({

                to:
                    invitation.email,

                organizationName:
                    invitation.organization_name,

                role:
                    invitation.role,

                invitationUrl
            });


            console.log(
                "✅ Invitation resent successfully"
            );


        } catch (emailError) {

            console.error(
                "❌ Resend invitation email failed:",
                emailError
            );


            // ====================================
            // Restore previous invitation
            // ====================================

            try {

                await pool.query(
                    `
                    UPDATE invitations

                    SET
                        token_hash = $1,
                        expires_at = $2

                    WHERE id = $3

                      AND organization_id = $4

                      AND accepted_at IS NULL
                    `,
                    [
                        oldTokenHash,
                        oldExpiresAt,
                        invitation.id,
                        organizationId
                    ]
                );


                console.log(
                    "↩️ Previous invitation token restored"
                );


            } catch (restoreError) {

                console.error(
                    "❌ Failed to restore previous invitation:",
                    restoreError
                );
            }


            return res.status(500).send(
                "Invitation could not be resent. Please check your email configuration."
            );
        }


        // ========================================
        // Activity log
        // ========================================

        await createActivityLog({

            organizationId,

            userId:
                currentUserId,

            action:
                "INVITATION_RESENT",

            entityType:
                "INVITATION",

            entityId:
                invitation.id,

            description:
                `Resent invitation to ${invitation.email}`
        });


        res.redirect(
            "/organizations/members"
        );


    } catch (error) {

        console.error(
            "Resend invitation error:",
            error
        );


        res.status(500).send(
            "Failed to resend invitation"
        );
    }
};


// ============================================
// CANCEL INVITATION
// ============================================

exports.cancelInvitation = async (req, res) => {

    const {
        invitationId
    } = req.params;


    const organizationId =
        req.session.user.organizationId;


    const currentUserId =
        req.session.user.id;


    try {

        // ========================================
        // Validate invitation ID
        // ========================================

        if (
            !invitationId ||
            !/^\d+$/.test(
                String(invitationId)
            )
        ) {

            return res.status(400).send(
                "Invalid invitation ID"
            );
        }


        // ========================================
        // Delete invitation
        // ========================================

        const deleteResult =
            await pool.query(
                `
                DELETE FROM invitations

                WHERE id = $1

                  AND organization_id = $2

                  AND accepted_at IS NULL

                RETURNING
                    id,
                    email,
                    role,
                    organization_id
                `,
                [
                    invitationId,
                    organizationId
                ]
            );


        if (
            deleteResult.rows.length === 0
        ) {

            return res.status(404).send(
                "Pending invitation not found"
            );
        }


        const cancelledInvitation =
            deleteResult.rows[0];


        console.log(
            "🗑️ Invitation cancelled:",
            cancelledInvitation
        );


        // ========================================
        // Activity log
        // ========================================

        await createActivityLog({

            organizationId,

            userId:
                currentUserId,

            action:
                "INVITATION_CANCELLED",

            entityType:
                "INVITATION",

            entityId:
                cancelledInvitation.id,

            description:
                `Cancelled invitation for ${cancelledInvitation.email}`
        });


        res.redirect(
            "/organizations/members"
        );


    } catch (error) {

        console.error(
            "Cancel invitation error:",
            error
        );


        res.status(500).send(
            "Failed to cancel invitation"
        );
    }
};


// ============================================
// SHOW ACCEPT INVITATION
// ============================================

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
            hashInvitationToken(
                token
            );


        const result =
            await pool.query(
                `
                SELECT
                    i.id,
                    i.organization_id,
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
                [
                    tokenHash
                ]
            );


        if (
            result.rows.length === 0
        ) {

            return res.status(400).send(
                "Invalid or expired invitation"
            );
        }


        res.render(
            "organizations/accept-invite",
            {
                invitation:
                    result.rows[0],

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


// ============================================
// ACCEPT INVITATION
// ============================================

exports.acceptInvitation = async (req, res) => {

    const {
        invitationId
    } = req.body;


    if (!invitationId) {

        return res.status(400).send(
            "Invitation ID is required"
        );
    }


    if (
        !req.session ||
        !req.session.user
    ) {

        return res.redirect(
            "/auth/login"
        );
    }


    let client;


    try {

        const currentUser =
            req.session.user;


        client =
            await pool.connect();


        await client.query(
            "BEGIN"
        );


        // ========================================
        // Find invitation
        // ========================================

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
                [
                    invitationId
                ]
            );


        if (
            invitationResult.rows.length === 0
        ) {

            await client.query(
                "ROLLBACK"
            );


            return res.status(400).send(
                "Invalid or expired invitation"
            );
        }


        const invitation =
            invitationResult.rows[0];


        // ========================================
        // Verify invitation email
        // ========================================

        if (
            currentUser.email.toLowerCase() !==
            invitation.email.toLowerCase()
        ) {

            await client.query(
                "ROLLBACK"
            );


            return res.status(403).send(
                "This invitation belongs to a different email address"
            );
        }


        // ========================================
        // Check existing membership
        // ========================================

        const memberResult =
            await client.query(
                `
                SELECT
                    id,
                    user_id,
                    organization_id,
                    role,
                    joined_at

                FROM organization_members

                WHERE organization_id = $1

                  AND user_id = $2

                LIMIT 1
                `,
                [
                    invitation.organization_id,
                    currentUser.id
                ]
            );


        let member;

        let memberWasAdded =
            false;


        // ========================================
        // Add member if not already a member
        // ========================================

        if (
            memberResult.rows.length === 0
        ) {

            const insertedMemberResult =
                await client.query(
                    `
                    INSERT INTO organization_members
                    (
                        organization_id,
                        user_id,
                        role
                    )

                    VALUES
                    (
                        $1,
                        $2,
                        $3
                    )

                    RETURNING
                        id,
                        user_id,
                        organization_id,
                        role,
                        joined_at
                    `,
                    [
                        invitation.organization_id,
                        currentUser.id,
                        invitation.role
                    ]
                );


            member =
                insertedMemberResult.rows[0];


            memberWasAdded =
                true;

        } else {

            member =
                memberResult.rows[0];
        }


        // ========================================
        // Mark invitation accepted
        // ========================================

        await client.query(
            `
            UPDATE invitations

            SET
                accepted_at = NOW()

            WHERE id = $1
            `,
            [
                invitation.id
            ]
        );


        await client.query(
            "COMMIT"
        );


        // ========================================
        // Get complete member
        // ========================================

        const completeMemberResult =
            await pool.query(
                `
                SELECT
                    u.id,
                    om.id AS membership_id,
                    u.name,
                    u.email,
                    om.role,
                    om.joined_at

                FROM organization_members om

                JOIN users u
                    ON u.id = om.user_id

                WHERE om.organization_id = $1

                  AND om.user_id = $2

                LIMIT 1
                `,
                [
                    invitation.organization_id,
                    currentUser.id
                ]
            );


        const completeMember =
            completeMemberResult.rows[0];


        // ========================================
        // REAL-TIME MEMBER ADDED
        // ========================================

        if (
            memberWasAdded
        ) {

            try {

                const io =
                    getIO();


                if (
                    io &&
                    completeMember
                ) {

                    const organizationRoom =
                        getOrganizationRoom(
                            invitation.organization_id
                        );


                    io.to(
                        organizationRoom
                    ).emit(
                        "member:added",
                        completeMember
                    );


                    console.log(
                        `⚡ Real-time MEMBER_ADDED emitted: user=${completeMember.id} org=${invitation.organization_id}`
                    );
                }

            } catch (socketError) {

                console.error(
                    "Real-time member event error:",
                    socketError
                );
            }
        }


        // ========================================
        // SWITCH CURRENT SESSION
        // ========================================

        req.session.user.organizationId =
            invitation.organization_id;


        req.session.user.organizationName =
            invitation.organization_name;


        req.session.user.role =
            invitation.role;


        // ========================================
        // SAVE SESSION
        // ========================================

        req.session.save(
            (err) => {

                if (err) {

                    console.error(
                        "Session save error:",
                        err
                    );


                    return res.status(500).send(
                        "Could not save session"
                    );
                }


                res.redirect(
                    "/dashboard"
                );
            }
        );


    } catch (error) {

        try {

            if (client) {

                await client.query(
                    "ROLLBACK"
                );
            }

        } catch (rollbackError) {

            console.error(
                "Rollback error:",
                rollbackError
            );
        }


        console.error(
            "Accept invitation error:",
            error
        );


        res.status(500).send(
            "Failed to accept invitation"
        );


    } finally {

        if (client) {

            client.release();
        }
    }
};


// ============================================
// UPDATE MEMBER ROLE
// ============================================

exports.updateMemberRole = async (req, res) => {

    const {
        memberId
    } = req.params;


    const {
        role
    } = req.body;


    const organizationId =
        req.session.user.organizationId;


    const currentUserId =
        req.session.user.id;


    const currentUserRole =
        req.session.user.role;


    try {

        // ========================================
        // Validate role
        // ========================================

        const allowedRoles = [
            "ADMIN",
            "MEMBER",
            "VIEWER"
        ];


        if (
            !allowedRoles.includes(role)
        ) {

            return res.status(400).send(
                "Invalid member role"
            );
        }


        // ========================================
        // Validate member ID
        // ========================================

        if (
            !memberId ||
            !/^\d+$/.test(
                String(memberId)
            )
        ) {

            return res.status(400).send(
                "Invalid member ID"
            );
        }


        // ========================================
        // Get target member
        // ========================================

        const memberResult =
            await pool.query(
                `
                SELECT
                    om.id AS membership_id,
                    om.user_id,
                    om.organization_id,
                    om.role,
                    u.name,
                    u.email

                FROM organization_members om

                JOIN users u
                    ON u.id = om.user_id

                WHERE om.id = $1

                  AND om.organization_id = $2

                LIMIT 1
                `,
                [
                    memberId,
                    organizationId
                ]
            );


        if (
            memberResult.rows.length === 0
        ) {

            return res.status(404).send(
                "Organization member not found"
            );
        }


        const member =
            memberResult.rows[0];


        // ========================================
        // Cannot change own role
        // ========================================

        if (
            Number(member.user_id) ===
            Number(currentUserId)
        ) {

            return res.status(400).send(
                "You cannot change your own organization role"
            );
        }


        // ========================================
        // OWNER cannot be modified
        // ========================================

        if (
            member.role === "OWNER"
        ) {

            return res.status(403).send(
                "The organization owner cannot be modified"
            );
        }


        // ========================================
        // ADMIN restrictions
        // ========================================

        if (
            currentUserRole === "ADMIN" &&
            member.role === "ADMIN"
        ) {

            return res.status(403).send(
                "Administrators cannot change another administrator's role"
            );
        }


        const oldRole =
            member.role;


        // ========================================
        // Update role
        // ========================================

        const updatedResult =
            await pool.query(
                `
                UPDATE organization_members

                SET
                    role = $1

                WHERE id = $2

                  AND organization_id = $3

                RETURNING
                    id,
                    user_id,
                    organization_id,
                    role
                `,
                [
                    role,
                    member.membership_id,
                    organizationId
                ]
            );


        if (
            updatedResult.rows.length === 0
        ) {

            return res.status(404).send(
                "Member role could not be updated"
            );
        }


        const updatedMembership =
            updatedResult.rows[0];


        // ========================================
        // Activity log
        // ========================================

        await createActivityLog({

            organizationId,

            userId:
                currentUserId,

            action:
                "MEMBER_ROLE_UPDATED",

            entityType:
                "ORGANIZATION_MEMBER",

            entityId:
                updatedMembership.id,

            description:
                `Changed ${member.name}'s role from ${oldRole} to ${role}`
        });


        // ========================================
        // Get complete updated member
        // ========================================

        const updatedMemberResult =
            await pool.query(
                `
                SELECT
                    u.id,
                    om.id AS membership_id,
                    u.name,
                    u.email,
                    om.role,
                    om.joined_at

                FROM organization_members om

                JOIN users u
                    ON u.id = om.user_id

                WHERE om.id = $1

                  AND om.organization_id = $2

                LIMIT 1
                `,
                [
                    updatedMembership.id,
                    organizationId
                ]
            );


        const updatedMember =
            updatedMemberResult.rows[0];


        // ========================================
        // PERSONAL NOTIFICATION
        // ========================================

        if (
            updatedMember
        ) {

            try {

                const notification =
                    await createNotification({

                        organizationId,

                        userId:
                            updatedMember.id,

                        type:
                            "MEMBER_ROLE_UPDATED",

                        title:
                            "Organization Role Updated",

                        message:
                            `Your role in the organization was changed from ${oldRole} to ${role}.`,

                        entityType:
                            "ORGANIZATION_MEMBER",

                        entityId:
                            updatedMembership.id
                    });


                console.log(
                    "✅ Role notification result:",
                    notification
                );


            } catch (notificationError) {

                console.error(
                    "❌ Role notification error:",
                    notificationError
                );
            }
        }


        // ========================================
        // REAL-TIME MEMBER UPDATE
        // ========================================

        try {

            const io =
                getIO();


            if (
                io &&
                updatedMember
            ) {

                const organizationRoom =
                    getOrganizationRoom(
                        organizationId
                    );


                io.to(
                    organizationRoom
                ).emit(
                    "member:updated",
                    updatedMember
                );


                console.log(
                    `⚡ Real-time MEMBER_UPDATED emitted: user=${updatedMember.id} org=${organizationId}`
                );
            }

        } catch (socketError) {

            console.error(
                "Real-time member update error:",
                socketError
            );
        }


        // ========================================
        // UPDATE CONNECTED SOCKET USER ROLE
        // ========================================

        try {

            const io =
                getIO();


            if (
                io &&
                updatedMember
            ) {

                const targetUserRoom =
                    getUserRoom(
                        updatedMember.id,
                        organizationId
                    );


                const targetSockets =
                    await io
                        .in(targetUserRoom)
                        .fetchSockets();


                for (
                    const targetSocket of targetSockets
                ) {

                    if (
                        targetSocket.user
                    ) {

                        targetSocket.user.role =
                            role;
                    }
                }


                console.log(
                    `⚡ Socket role refreshed: user=${updatedMember.id} role=${role}`
                );
            }

        } catch (socketError) {

            console.error(
                "Socket role refresh error:",
                socketError
            );
        }


        res.redirect(
            "/organizations/members"
        );


    } catch (error) {

        console.error(
            "Update member role error:",
            error
        );


        res.status(500).send(
            "Failed to update member role"
        );
    }
};


// ============================================
// REMOVE MEMBER
// ============================================

exports.removeMember = async (req, res) => {

    const {
        memberId
    } = req.params;


    const organizationId =
        req.session.user.organizationId;


    const currentUserId =
        req.session.user.id;


    const currentUserRole =
        req.session.user.role;


    try {

        // ========================================
        // Validate member ID
        // ========================================

        if (
            !memberId ||
            !/^\d+$/.test(
                String(memberId)
            )
        ) {

            return res.status(400).send(
                "Invalid member ID"
            );
        }


        // ========================================
        // Get target member
        // ========================================

        const memberResult =
            await pool.query(
                `
                SELECT
                    om.id AS membership_id,
                    om.user_id,
                    om.organization_id,
                    om.role,
                    u.name,
                    u.email

                FROM organization_members om

                JOIN users u
                    ON u.id = om.user_id

                WHERE om.id = $1

                  AND om.organization_id = $2

                LIMIT 1
                `,
                [
                    memberId,
                    organizationId
                ]
            );


        if (
            memberResult.rows.length === 0
        ) {

            return res.status(404).send(
                "Organization member not found"
            );
        }


        const member =
            memberResult.rows[0];


        // ========================================
        // Cannot remove yourself
        // ========================================

        if (
            Number(member.user_id) ===
            Number(currentUserId)
        ) {

            return res.status(400).send(
                "You cannot remove yourself from the organization"
            );
        }


        // ========================================
        // OWNER cannot be removed
        // ========================================

        if (
            member.role === "OWNER"
        ) {

            return res.status(403).send(
                "The organization owner cannot be removed"
            );
        }


        // ========================================
        // ADMIN restrictions
        // ========================================

        if (
            currentUserRole === "ADMIN" &&
            member.role === "ADMIN"
        ) {

            return res.status(403).send(
                "Administrators cannot remove another administrator"
            );
        }


        // ========================================
        // Remove member
        // ========================================

        const deleteResult =
            await pool.query(
                `
                DELETE FROM organization_members

                WHERE id = $1

                  AND organization_id = $2

                RETURNING
                    id,
                    user_id,
                    organization_id,
                    role
                `,
                [
                    member.membership_id,
                    organizationId
                ]
            );


        if (
            deleteResult.rows.length === 0
        ) {

            return res.status(404).send(
                "Member could not be removed"
            );
        }


        const removedMembership =
            deleteResult.rows[0];


        // ========================================
        // Activity log
        // ========================================

        await createActivityLog({

            organizationId,

            userId:
                currentUserId,

            action:
                "MEMBER_REMOVED",

            entityType:
                "ORGANIZATION_MEMBER",

            entityId:
                removedMembership.id,

            description:
                `Removed ${member.name} from the organization`
        });


        // ========================================
        // PERSONAL NOTIFICATION
        // ========================================

        try {

            const notification =
                await createNotification({

                    organizationId,

                    userId:
                        member.user_id,

                    type:
                        "MEMBER_REMOVED",

                    title:
                        "Removed from Organization",

                    message:
                        "You were removed from the organization.",

                    entityType:
                        "ORGANIZATION_MEMBER",

                    entityId:
                        removedMembership.id
                });


            console.log(
                "✅ Removal notification result:",
                notification
            );


        } catch (notificationError) {

            console.error(
                "❌ Member removal notification error:",
                notificationError
            );
        }


        // ========================================
        // REAL-TIME MEMBER REMOVED
        // ========================================

        try {

            const io =
                getIO();


            if (io) {

                const organizationRoom =
                    getOrganizationRoom(
                        organizationId
                    );


                io.to(
                    organizationRoom
                ).emit(
                    "member:removed",
                    {
                        id:
                            member.user_id,

                        user_id:
                            member.user_id,

                        membership_id:
                            removedMembership.id,

                        organization_id:
                            organizationId,

                        role:
                            member.role
                    }
                );


                console.log(
                    `⚡ Real-time MEMBER_REMOVED emitted: user=${member.user_id} org=${organizationId}`
                );
            }

        } catch (socketError) {

            console.error(
                "Real-time member removal event error:",
                socketError
            );
        }


        // ========================================
        // REMOVE TARGET FROM SOCKET ROOMS
        // ========================================

        try {

            const io =
                getIO();


            if (io) {

                const targetUserRoom =
                    getUserRoom(
                        member.user_id,
                        organizationId
                    );


                const targetSockets =
                    await io
                        .in(targetUserRoom)
                        .fetchSockets();


                const organizationRoom =
                    getOrganizationRoom(
                        organizationId
                    );


                for (
                    const targetSocket of targetSockets
                ) {

                    targetSocket.leave(
                        organizationRoom
                    );


                    targetSocket.leave(
                        targetUserRoom
                    );


                    console.log(
                        `🔌 Removed user ${member.user_id} from organization socket rooms`
                    );
                }
            }

        } catch (socketError) {

            console.error(
                "Socket member removal error:",
                socketError
            );
        }


        res.redirect(
            "/organizations/members"
        );


    } catch (error) {

        console.error(
            "Remove member error:",
            error
        );


        res.status(500).send(
            "Failed to remove member"
        );
    }
};


// ============================================
// GET USER ORGANIZATIONS
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


        res.render(
            "organizations/switcher",
            {
                organizations:
                    result.rows
            }
        );


    } catch (error) {

        console.error(
            "Get organizations error:",
            error
        );


        res.status(500).send(
            "Failed to load organizations"
        );
    }
};


// ============================================
// SWITCH ACTIVE ORGANIZATION
// ============================================

exports.switchOrganization = async (req, res) => {

    const {
        organizationId
    } = req.body;


    const userId =
        req.session.user.id;


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

            return res.status(403).send(
                "You are not a member of this organization"
            );
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


        // ========================================
        // Save session
        // ========================================

        req.session.save(
            (err) => {

                if (err) {

                    console.error(
                        "Session save error:",
                        err
                    );


                    return res.status(500).send(
                        "Failed to switch organization"
                    );
                }


                res.redirect(
                    "/dashboard"
                );
            }
        );


    } catch (error) {

        console.error(
            "Switch organization error:",
            error
        );


        res.status(500).send(
            "Failed to switch organization"
        );
    }
};