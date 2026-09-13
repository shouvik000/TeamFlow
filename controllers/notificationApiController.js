const pool = require("../config/db");


// ============================================
// Get notifications
// GET /api/notifications
// ============================================

exports.getNotifications = async (req, res) => {

    const userId =
        req.session.user.id;

    const organizationId =
        req.session.user.organizationId;

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


        res.status(200).json({

            success: true,

            count: result.rows.length,

            unreadCount:
                result.rows.filter(
                    notification =>
                        !notification.is_read
                ).length,

            notifications:
                result.rows

        });

    } catch (error) {

        console.error(
            "API get notifications error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load notifications"

        });
    }
};


// ============================================
// Get unread count
// GET /api/notifications/unread-count
// ============================================

exports.getUnreadCount = async (req, res) => {

    const userId =
        req.session.user.id;

    const organizationId =
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


        res.status(200).json({

            success: true,

            count:
                result.rows[0].count

        });

    } catch (error) {

        console.error(
            "API unread count error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to get unread count"

        });
    }
};


// ============================================
// Mark one notification as read
// PUT /api/notifications/:notificationId/read
// ============================================

exports.markAsRead = async (req, res) => {

    const {
        notificationId
    } = req.params;

    const userId =
        req.session.user.id;

    const organizationId =
        req.session.user.organizationId;

    try {

        const result = await pool.query(
            `
            UPDATE notifications

            SET
                is_read = TRUE

            WHERE id = $1
              AND user_id = $2
              AND organization_id = $3

            RETURNING
                id,
                type,
                title,
                is_read,
                created_at
            `,
            [
                notificationId,
                userId,
                organizationId
            ]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Notification not found"

            });
        }


        res.status(200).json({

            success: true,

            message:
                "Notification marked as read",

            notification:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "API mark notification error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to update notification"

        });
    }
};


// ============================================
// Mark all notifications as read
// PUT /api/notifications/read-all
// ============================================

exports.markAllAsRead = async (req, res) => {

    const userId =
        req.session.user.id;

    const organizationId =
        req.session.user.organizationId;

    try {

        const result = await pool.query(
            `
            UPDATE notifications

            SET
                is_read = TRUE

            WHERE user_id = $1
              AND organization_id = $2
              AND is_read = FALSE

            RETURNING id
            `,
            [
                userId,
                organizationId
            ]
        );


        res.status(200).json({

            success: true,

            message:
                "All notifications marked as read",

            updatedCount:
                result.rows.length

        });

    } catch (error) {

        console.error(
            "API mark all notifications error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to update notifications"

        });
    }
};