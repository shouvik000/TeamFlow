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
// SOCKET.IO SERVICE
// ============================================

const {
    getIO,
    getUserRoom,
    getOrganizationRoom
} = require("../services/socketService");


// ============================================
// Show members
// ============================================

exports.getMembers = async (req, res) => {

    try {

        const organizationId =
            req.session.user.organizationId;


        const result =
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


        res.render(
            "organizations/members",
            {
                members:
                    result.rows
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
// Show invitation form
// ============================================

exports.showInviteForm = (
    req,
    res
) => {

    res.render(
        "organizations/invite"
    );

};


// ============================================
// Create invitation
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
            !allowedRoles.includes(
                role
            )
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
        // Check existing pending invitation
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


        // ========================================
        // Development invitation URL
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
            "INVITATION CREATED"
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
// Show invitation acceptance page
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
// Accept invitation
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

        let memberWasAdded = false;


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
        // Get complete member information
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
        // REAL-TIME MEMBER ADDED EVENT
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
        // TO NEW ORGANIZATION
        // ========================================

        req.session.user.organizationId =
            invitation.organization_id;


        req.session.user.organizationName =
            invitation.organization_name;


        req.session.user.role =
            invitation.role;


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
// Update member role
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
            !allowedRoles.includes(
                role
            )
        ) {

            return res.status(400).send(
                "Invalid member role"
            );

        }


        // ========================================
        // Validate membership ID
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
        // Cannot change your own role
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
        // ADMIN permissions
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
        // Real-time member update
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
        // Update connected socket user role
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
                    await io.in(
                        targetUserRoom
                    ).fetchSockets();


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
// Remove member
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
        // Real-time member removed event
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
                "Real-time member removal error:",
                socketError
            );

        }


        // ========================================
        // Remove target user from organization
        // socket rooms
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
                    await io.in(
                        targetUserRoom
                    ).fetchSockets();


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
// Get user's organizations
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
// Switch active organization
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