const pool = require("../config/db");


// ============================================
// SOCKET.IO SERVICE
// ============================================

const {
    getIO,
    getOrganizationRoom
} = require("./socketService");


// ============================================
// Create activity log
// ============================================

exports.createActivityLog = async ({
    organizationId,
    userId,
    action,
    entityType = null,
    entityId = null,
    description = null
}) => {

    try {

        // ========================================
        // Insert activity
        // ========================================

        const result =
            await pool.query(
                `
                INSERT INTO activity_logs
                (
                    organization_id,
                    user_id,
                    action,
                    entity_type,
                    entity_id,
                    description
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
                    user_id,
                    action,
                    entity_type,
                    entity_id,
                    description,
                    created_at
                `,
                [
                    organizationId,
                    userId,
                    action,
                    entityType,
                    entityId,
                    description
                ]
            );


        // ========================================
        // Get activity record
        // ========================================

        let activity =
            result.rows[0];


        // ========================================
        // Get user name
        //
        // The activity page displays the
        // user_name, so include it in the
        // real-time event as well.
        // ========================================

        if (
            activity &&
            activity.user_id
        ) {

            const userResult =
                await pool.query(
                    `
                    SELECT
                        name

                    FROM users

                    WHERE id = $1

                    LIMIT 1
                    `,
                    [
                        activity.user_id
                    ]
                );


            activity = {

                ...activity,

                user_name:
                    userResult.rows.length > 0
                        ? userResult.rows[0].name
                        : "System"

            };

        } else {

            activity = {

                ...activity,

                user_name:
                    "System"

            };

        }


        // ========================================
        // Emit real-time activity
        // ========================================

        try {

            const io =
                getIO();


            if (
                io &&
                activity
            ) {

                const organizationRoom =
                    getOrganizationRoom(
                        activity.organization_id
                    );


                io.to(
                    organizationRoom
                ).emit(
                    "activity:new",
                    activity
                );


                console.log(
                    `⚡ Real-time ACTIVITY_NEW emitted: activity=${activity.id} org=${activity.organization_id}`
                );

            }

        } catch (socketError) {

            // Socket failure should never make
            // an otherwise successful activity
            // database operation fail.

            console.error(
                "Real-time activity event error:",
                socketError
            );

        }


        // ========================================
        // Return activity
        // ========================================

        return activity;


    } catch (error) {

        console.error(
            "Activity log error:",
            error
        );


        return null;

    }

};