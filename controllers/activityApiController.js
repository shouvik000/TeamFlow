const pool = require("../config/db");


// ============================================
// Get organization activity
//
// GET /api/v1/activity
//
// Query parameters:
// ?action=TASK_CREATED
// ?entityType=TASK
// ?userId=8
// ?search=dashboard
// ?page=1
// ?limit=20
// ?sortOrder=desc
// ============================================

exports.getActivities = async (req, res) => {

    const organizationId =
        req.session.user.organizationId;


    try {

        // ========================================
        // Pagination
        // ========================================

        const page =
            Math.max(
                parseInt(req.query.page, 10) || 1,
                1
            );


        const limit =
            Math.min(
                Math.max(
                    parseInt(req.query.limit, 10) || 20,
                    1
                ),
                100
            );


        const offset =
            (page - 1) * limit;


        // ========================================
        // Filters
        // ========================================

        const action =
            req.query.action
                ? req.query.action.trim().toUpperCase()
                : "";


        const entityType =
            req.query.entityType
                ? req.query.entityType.trim().toUpperCase()
                : "";


        const userId =
            req.query.userId
                ? parseInt(
                    req.query.userId,
                    10
                )
                : null;


        if (
            req.query.userId &&
            (
                !Number.isInteger(userId) ||
                userId <= 0
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid userId"

            });
        }


        const search =
            req.query.search
                ? req.query.search.trim()
                : "";


        // ========================================
        // Sort order
        // ========================================

        const sortOrder =
            String(
                req.query.sortOrder || "desc"
            ).toLowerCase();


        if (
            !["asc", "desc"].includes(sortOrder)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid sort order"

            });
        }


        // ========================================
        // Build conditions
        // ========================================

        const conditions = [
            "a.organization_id = $1"
        ];


        const values = [
            organizationId
        ];


        let parameterIndex = 2;


        // Filter by action
        if (action) {

            conditions.push(
                `a.action = $${parameterIndex}`
            );

            values.push(
                action
            );

            parameterIndex++;

        }


        // Filter by entity type
        if (entityType) {

            conditions.push(
                `a.entity_type = $${parameterIndex}`
            );

            values.push(
                entityType
            );

            parameterIndex++;

        }


        // Filter by user
        if (userId) {

            conditions.push(
                `a.user_id = $${parameterIndex}`
            );

            values.push(
                userId
            );

            parameterIndex++;

        }


        // Search description
        if (search) {

            conditions.push(
                `
                a.description ILIKE
                $${parameterIndex}
                `
            );

            values.push(
                `%${search}%`
            );

            parameterIndex++;

        }


        const whereClause =
            conditions.join(
                " AND "
            );


        // ========================================
        // Total count
        // ========================================

        const countResult =
            await pool.query(
                `
                SELECT
                    COUNT(*)::INTEGER AS total

                FROM activity_logs a

                WHERE ${whereClause}
                `,
                values
            );


        const total =
            countResult.rows[0].total;


        // ========================================
        // Get activity logs
        // ========================================

        const activityValues = [

            ...values,

            limit,

            offset

        ];


        const result =
            await pool.query(
                `
                SELECT

                    a.id,
                    a.action,
                    a.entity_type,
                    a.entity_id,
                    a.description,
                    a.created_at,
                    a.user_id,

                    u.name AS user_name,
                    u.email AS user_email

                FROM activity_logs a

                LEFT JOIN users u
                    ON u.id = a.user_id

                WHERE ${whereClause}

                ORDER BY
                    a.created_at
                    ${sortOrder.toUpperCase()}

                LIMIT $${parameterIndex}

                OFFSET $${parameterIndex + 1}
                `,
                activityValues
            );


        const totalPages =
            total === 0
                ? 0
                : Math.ceil(
                    total / limit
                );


        res.status(200).json({

            success: true,

            count:
                result.rows.length,

            pagination: {

                page,

                limit,

                total,

                totalPages,

                hasNextPage:
                    page < totalPages,

                hasPreviousPage:
                    page > 1

            },

            filters: {

                action:
                    action || null,

                entityType:
                    entityType || null,

                userId:
                    userId || null,

                search:
                    search || null,

                sortOrder

            },

            activities:
                result.rows

        });

    } catch (error) {

        console.error(
            "API get activities error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load activity logs"

        });

    }
};