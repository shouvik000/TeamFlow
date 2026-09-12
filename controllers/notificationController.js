const pool = require("../config/db");


// ============================================
// Get notifications
// ============================================

exports.getNotifications = async (req, res) => {

    const userId = req.session.user.id;

    // Use organization loaded by tenant middleware
    const organizationId =
        req.organization?.id ||
        req.session.user.organizationId;

    console.log("================================");
    console.log("NOTIFICATIONS PAGE");
    console.log("User ID:", userId);
    console.log("Organization ID:", organizationId);
    console.log("================================");

    try {

        const result = await pool.query(
            `
            SELECT
                id,
                type,
                title,
                message,
                entity_type,
                entity_id,
                is_read,
                created_at
            FROM notifications
            WHERE user_id = $1
              AND organization_id = $2
            ORDER BY created_at DESC
            LIMIT 50
            `,
            [
                userId,
                organizationId
            ]
        );

        console.log(
            "Notifications found:",
            result.rows.length
        );

        console.log(
            result.rows
        );


        res.render(
            "notifications/index",
            {
                notifications: result.rows
            }
        );

    } catch (error) {

        console.error(
            "Get notifications error:",
            error
        );

        res.status(500).send(
            "Failed to load notifications"
        );
    }
};


// ============================================
// Mark one notification as read
// ============================================

exports.markAsRead = async (req, res) => {

    const { notificationId } = req.params;

    const userId =
        req.session.user.id;

    const organizationId =
        req.organization?.id ||
        req.session.user.organizationId;

    try {

        await pool.query(
            `
            UPDATE notifications
            SET
                is_read = TRUE
            WHERE id = $1
              AND user_id = $2
              AND organization_id = $3
            `,
            [
                notificationId,
                userId,
                organizationId
            ]
        );


        res.redirect(
            "/notifications"
        );

    } catch (error) {

        console.error(
            "Mark notification error:",
            error
        );

        res.status(500).send(
            "Failed to update notification"
        );
    }
};


// ============================================
// Mark all notifications as read
// ============================================

exports.markAllAsRead = async (req, res) => {

    const userId =
        req.session.user.id;

    const organizationId =
        req.organization?.id ||
        req.session.user.organizationId;

    try {

        await pool.query(
            `
            UPDATE notifications
            SET
                is_read = TRUE
            WHERE user_id = $1
              AND organization_id = $2
              AND is_read = FALSE
            `,
            [
                userId,
                organizationId
            ]
        );


        res.redirect(
            "/notifications"
        );

    } catch (error) {

        console.error(
            "Mark all notifications error:",
            error
        );

        res.status(500).send(
            "Failed to update notifications"
        );
    }
};


// ============================================
// Get unread count
// ============================================

exports.getUnreadCount = async (req, res) => {

    const userId =
        req.session.user.id;

    const organizationId =
        req.organization?.id ||
        req.session.user.organizationId;

    try {

        const result = await pool.query(
            `
            SELECT
                COUNT(*)::INTEGER AS count

            FROM notifications

            WHERE user_id = $1
              AND organization_id = $2
              AND is_read = FALSE
            `,
            [
                userId,
                organizationId
            ]
        );


        res.json({
            success: true,
            count: result.rows[0].count
        });

    } catch (error) {

        console.error(
            "Unread count error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to get unread count"
        });
    }
};