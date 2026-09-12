const pool = require("../config/db");


// ============================================
// Create notification
// ============================================

exports.createNotification = async ({
    organizationId,
    userId,
    type,
    title,
    message,
    entityType = null,
    entityId = null
}) => {

    try {

        console.log("🔔 Creating notification...");
        console.log("Organization ID:", organizationId);
        console.log("User ID:", userId);
        console.log("Type:", type);
        console.log("Title:", title);


        const result = await pool.query(
            `
            INSERT INTO notifications
            (
                organization_id,
                user_id,
                type,
                title,
                message,
                entity_type,
                entity_id
            )

            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7
            )

            RETURNING
                id,
                organization_id,
                user_id,
                type,
                title
            `,
            [
                organizationId,
                userId,
                type,
                title,
                message,
                entityType,
                entityId
            ]
        );


        console.log(
            "Notification created:",
            result.rows[0]
        );


        return result.rows[0];

    } catch (error) {

        console.error(
            "Notification creation error:",
            error.message
        );

        console.error(
            error
        );

        return null;
    }
};