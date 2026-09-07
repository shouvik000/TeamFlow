const pool = require("../config/db");

exports.createActivityLog = async ({
    organizationId,
    userId,
    action,
    entityType = null,
    entityId = null,
    description = null
}) => {

    try {

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
            VALUES ($1, $2, $3, $4, $5, $6)
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

    } catch (error) {

        console.error(
            "Activity log error:",
            error
        );

    }
};