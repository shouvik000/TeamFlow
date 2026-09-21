const pool = require("../config/db");


// ============================================
// ACTION LABELS
// ============================================

const ACTION_LABELS = {

    INVITATION_CREATED:
        "Invitation Created",

    INVITATION_RESENT:
        "Invitation Resent",

    INVITATION_CANCELLED:
        "Invitation Cancelled",

    MEMBER_ROLE_UPDATED:
        "Member Role Updated",

    MEMBER_REMOVED:
        "Member Removed",

    MEMBER_ADDED:
        "Member Added",

    PROJECT_CREATED:
        "Project Created",

    PROJECT_UPDATED:
        "Project Updated",

    PROJECT_DELETED:
        "Project Deleted",

    TASK_CREATED:
        "Task Created",

    TASK_UPDATED:
        "Task Updated",

    TASK_DELETED:
        "Task Deleted"

};


// ============================================
// ENTITY LABELS
// ============================================

const ENTITY_LABELS = {

    INVITATION:
        "Invitation",

    ORGANIZATION_MEMBER:
        "Organization Member",

    PROJECT:
        "Project",

    TASK:
        "Task",

    ORGANIZATION:
        "Organization"

};


// ============================================
// GET ORGANIZATION ACTIVITY
// ============================================

exports.getActivities = async (req, res) => {

    try {

        // ========================================
        // ACTIVE ORGANIZATION
        // ========================================

        const organizationId =
            req.session.user.organizationId;


        // ========================================
        // QUERY PARAMETERS
        // ========================================

        const search =
            typeof req.query.search === "string"
                ? req.query.search.trim()
                : "";


        const action =
            typeof req.query.action === "string"
                ? req.query.action.trim().toUpperCase()
                : "";


        const entityType =
            typeof req.query.entityType === "string"
                ? req.query.entityType.trim().toUpperCase()
                : "";


        let page =
            Number.parseInt(
                req.query.page,
                10
            );


        if (
            !Number.isInteger(page) ||
            page < 1
        ) {

            page = 1;
        }


        let limit =
            Number.parseInt(
                req.query.limit,
                10
            );


        if (
            !Number.isInteger(limit) ||
            limit < 1
        ) {

            limit = 25;
        }


        // Prevent excessively large requests
        if (limit > 100) {

            limit = 100;
        }


        const offset =
            (page - 1) * limit;


        // ========================================
        // BUILD WHERE CLAUSE
        // ========================================

        const conditions = [
            "a.organization_id = $1"
        ];


        const values = [
            organizationId
        ];


        let parameterIndex = 2;


        // ========================================
        // SEARCH
        // ========================================

        if (search) {

            conditions.push(
                `
                (
                    a.description ILIKE $${parameterIndex}

                    OR
                    a.action ILIKE $${parameterIndex}

                    OR
                    a.entity_type ILIKE $${parameterIndex}

                    OR
                    COALESCE(u.name, '') ILIKE $${parameterIndex}

                    OR
                    COALESCE(u.email, '') ILIKE $${parameterIndex}
                )
                `
            );


            values.push(
                `%${search}%`
            );


            parameterIndex++;
        }


        // ========================================
        // ACTION FILTER
        // ========================================

        if (action) {

            conditions.push(
                `a.action = $${parameterIndex}`
            );


            values.push(
                action
            );


            parameterIndex++;
        }


        // ========================================
        // ENTITY TYPE FILTER
        // ========================================

        if (entityType) {

            conditions.push(
                `a.entity_type = $${parameterIndex}`
            );


            values.push(
                entityType
            );


            parameterIndex++;
        }


        const whereClause =
            conditions.join(
                " AND "
            );


        // ========================================
        // COUNT TOTAL RESULTS
        // ========================================

        const countResult =
            await pool.query(
                `
                SELECT
                    COUNT(*)::INTEGER AS total

                FROM activity_logs a

                LEFT JOIN users u
                    ON u.id = a.user_id

                WHERE ${whereClause}
                `,
                values
            );


        const total =
            countResult.rows[0]?.total || 0;


        const totalPages =
            total === 0
                ? 0
                : Math.ceil(
                    total / limit
                );


        // ========================================
        // GET ACTIVITIES
        // ========================================

        const activityValues = [
            ...values,
            limit,
            offset
        ];


        const limitParameter =
            parameterIndex;


        const offsetParameter =
            parameterIndex + 1;


        const result =
            await pool.query(
                `
                SELECT

                    a.id,

                    a.organization_id,

                    a.user_id,

                    a.action,

                    a.entity_type,

                    a.entity_id,

                    a.description,

                    a.created_at,


                    -- Actor information

                    COALESCE(
                        u.name,
                        'System'
                    ) AS user_name,

                    COALESCE(
                        u.email,
                        ''
                    ) AS user_email,


                    -- Human-readable action

                    CASE

                        WHEN a.action = 'INVITATION_CREATED'
                        THEN 'Invitation Created'

                        WHEN a.action = 'INVITATION_RESENT'
                        THEN 'Invitation Resent'

                        WHEN a.action = 'INVITATION_CANCELLED'
                        THEN 'Invitation Cancelled'

                        WHEN a.action = 'MEMBER_ROLE_UPDATED'
                        THEN 'Member Role Updated'

                        WHEN a.action = 'MEMBER_REMOVED'
                        THEN 'Member Removed'

                        WHEN a.action = 'MEMBER_ADDED'
                        THEN 'Member Added'

                        WHEN a.action = 'PROJECT_CREATED'
                        THEN 'Project Created'

                        WHEN a.action = 'PROJECT_UPDATED'
                        THEN 'Project Updated'

                        WHEN a.action = 'PROJECT_DELETED'
                        THEN 'Project Deleted'

                        WHEN a.action = 'TASK_CREATED'
                        THEN 'Task Created'

                        WHEN a.action = 'TASK_UPDATED'
                        THEN 'Task Updated'

                        WHEN a.action = 'TASK_DELETED'
                        THEN 'Task Deleted'

                        ELSE
                            REPLACE(
                                INITCAP(
                                    LOWER(a.action)
                                ),
                                '_',
                                ' '
                            )

                    END AS action_label,


                    -- Human-readable entity

                    CASE

                        WHEN a.entity_type = 'INVITATION'
                        THEN 'Invitation'

                        WHEN a.entity_type = 'ORGANIZATION_MEMBER'
                        THEN 'Organization Member'

                        WHEN a.entity_type = 'PROJECT'
                        THEN 'Project'

                        WHEN a.entity_type = 'TASK'
                        THEN 'Task'

                        WHEN a.entity_type = 'ORGANIZATION'
                        THEN 'Organization'

                        ELSE
                            COALESCE(
                                a.entity_type,
                                'Activity'
                            )

                    END AS entity_label,


                    -- Project name when available

                    p.name AS project_name,


                    -- Task title when available

                    t.title AS task_title,


                    -- Entity display name

                    CASE

                        WHEN a.entity_type = 'PROJECT'
                        THEN p.name

                        WHEN a.entity_type = 'TASK'
                        THEN t.title

                        ELSE NULL

                    END AS entity_name


                FROM activity_logs a


                LEFT JOIN users u
                    ON u.id = a.user_id


                LEFT JOIN projects p
                    ON a.entity_type = 'PROJECT'
                    AND p.id = a.entity_id
                    AND p.organization_id = a.organization_id


                LEFT JOIN tasks t
                    ON a.entity_type = 'TASK'
                    AND t.id = a.entity_id
                    AND t.organization_id = a.organization_id


                WHERE ${whereClause}


                ORDER BY
                    a.created_at DESC,
                    a.id DESC


                LIMIT $${limitParameter}

                OFFSET $${offsetParameter}
                `,
                activityValues
            );


        // ========================================
        // PREPARE ACTIVITY DATA
        // ========================================

        const activities =
            result.rows.map(
                (activity) => {

                    return {

                        ...activity,

                        action_label:
                            actionLabel(
                                activity.action
                            ),

                        entity_label:
                            entityLabel(
                                activity.entity_type
                            )

                    };

                }
            );


        // ========================================
        // AVAILABLE FILTER OPTIONS
        // ========================================

        const filterResult =
            await pool.query(
                `
                SELECT
                    ARRAY_AGG(
                        DISTINCT action
                        ORDER BY action
                    ) AS actions,

                    ARRAY_AGG(
                        DISTINCT entity_type
                        ORDER BY entity_type
                    ) AS entity_types

                FROM activity_logs

                WHERE organization_id = $1
                `,
                [
                    organizationId
                ]
            );


        const filterData =
            filterResult.rows[0] || {};


        const availableActions =
            filterData.actions || [];


        const availableEntityTypes =
            filterData.entity_types || [];


        // ========================================
        // RENDER ACTIVITY PAGE
        // ========================================

        res.render(
            "dashboard/activity",
            {

                activities,

                search,

                selectedAction:
                    action,

                selectedEntityType:
                    entityType,

                page,

                limit,

                total,

                totalPages,

                availableActions,

                availableEntityTypes

            }
        );


    } catch (error) {

        console.error(
            "Get activities error:",
            error
        );


        res.status(500).send(
            "Failed to load activities"
        );
    }
};


// ============================================
// ACTION LABEL HELPER
// ============================================

function actionLabel(
    action
) {

    if (
        ACTION_LABELS[action]
    ) {

        return ACTION_LABELS[action];
    }


    if (
        !action
    ) {

        return "Activity";
    }


    return action
        .split("_")
        .map(
            word =>
                word.charAt(0).toUpperCase() +
                word.slice(1).toLowerCase()
        )
        .join(" ");

}


// ============================================
// ENTITY LABEL HELPER
// ============================================

function entityLabel(
    entityType
) {

    if (
        ENTITY_LABELS[entityType]
    ) {

        return ENTITY_LABELS[entityType];
    }


    if (
        !entityType
    ) {

        return "Activity";
    }


    return entityType
        .split("_")
        .map(
            word =>
                word.charAt(0).toUpperCase() +
                word.slice(1).toLowerCase()
        )
        .join(" ");

}