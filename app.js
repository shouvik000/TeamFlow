const express = require("express");

const path = require("path");

const session =
    require("express-session");

const pgSession =
    require("connect-pg-simple")(session);

require("dotenv").config();


const pool =
    require("./config/db");


const webhookController =
    require("./controllers/webhookController");


const authRoutes =
    require("./routes/authRoutes");


const projectRoutes =
    require("./routes/projectRoutes");


const projectApiRoutes =
    require("./routes/api/projectRoutes");


const taskApiRoutes =
    require("./routes/api/taskRoutes");


const organizationRoutes =
    require("./routes/organizationRoutes");


const taskRoutes =
    require("./routes/taskRoutes");


const subscriptionRoutes =
    require("./routes/subscriptionRoutes");


const notificationRoutes =
    require("./routes/notificationRoutes");


const app =
    express();


const PORT =
    process.env.PORT || 3000;


// ============================================
// EJS CONFIGURATION
// ============================================

app.set(
    "view engine",
    "ejs"
);

app.set(
    "views",
    path.join(
        __dirname,
        "views"
    )
);


// ============================================
// RAZORPAY WEBHOOK
// Must come before express.json()
// ============================================

app.post(
    "/webhooks/razorpay",

    express.raw({
        type: "application/json"
    }),

    webhookController.razorpayWebhook
);


// ============================================
// GENERAL MIDDLEWARE
// ============================================

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    express.json()
);


// ============================================
// STATIC FILES
// ============================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// ============================================
// SESSION
// ============================================

app.use(
    session({

        store:
            new pgSession({

                pool: pool,

                tableName: "session"

            }),

        secret:
            process.env.SESSION_SECRET,

        resave:
            false,

        saveUninitialized:
            false,

        cookie: {

            maxAge:
                1000 *
                60 *
                60 *
                24

        }

    })
);


// ============================================
// GLOBAL USER
// ============================================

app.use(
    (req, res, next) => {

        res.locals.user =
            req.session.user || null;

        next();

    }
);


// ============================================
// AUTH
// ============================================

app.use(
    "/auth",
    authRoutes
);


// ============================================
// WEB PROJECT ROUTES
// ============================================

app.use(
    "/projects",
    projectRoutes
);


// ============================================
// PROJECT REST API
// ============================================

app.use(
    "/api/projects",
    projectApiRoutes
);


// ============================================
// TASK REST API
// ============================================

app.use(
    "/api",
    taskApiRoutes
);


// ============================================
// ORGANIZATION
// ============================================

app.use(
    "/organizations",
    organizationRoutes
);


// ============================================
// BILLING
// ============================================

app.use(
    "/billing",
    subscriptionRoutes
);


// ============================================
// WEB TASK ROUTES
// ============================================

app.use(
    "/",
    taskRoutes
);


// ============================================
// NOTIFICATIONS
// ============================================

app.use(
    "/notifications",
    notificationRoutes
);


// ============================================
// HOME
// ============================================

app.get(
    "/",
    (req, res) => {

        if (
            req.session.user
        ) {

            return res.redirect(
                "/dashboard"
            );

        }

        res.redirect(
            "/auth/login"
        );

    }
);


// ============================================
// DASHBOARD
// ============================================

app.get(
    "/dashboard",

    async (req, res) => {

        if (
            !req.session ||
            !req.session.user
        ) {

            return res.redirect(
                "/auth/login"
            );

        }


        try {

            const user =
                req.session.user;


            const organizationId =
                user.organizationId;


            // ========================================
            // Invitations
            // ========================================

            const invitationResult =
                await pool.query(
                    `
                    SELECT

                        i.id,
                        i.email,
                        i.role,
                        i.expires_at,

                        o.name
                            AS organization_name

                    FROM invitations i

                    JOIN organizations o
                        ON o.id =
                           i.organization_id

                    WHERE LOWER(i.email)
                          = LOWER($1)

                      AND i.accepted_at IS NULL

                      AND i.expires_at > NOW()

                    ORDER BY
                        i.created_at DESC
                    `,
                    [
                        user.email
                    ]
                );


            // ========================================
            // Project count
            // ========================================

            const projectResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER
                            AS count

                    FROM projects

                    WHERE organization_id =
                          $1
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // Task count
            // ========================================

            const taskResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER
                            AS count

                    FROM tasks

                    WHERE organization_id =
                          $1
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // Completed tasks
            // ========================================

            const completedResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER
                            AS count

                    FROM tasks

                    WHERE organization_id =
                          $1

                      AND status = 'DONE'
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // Members
            // ========================================

            const memberResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER
                            AS count

                    FROM organization_members

                    WHERE organization_id =
                          $1
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // Task statuses
            // ========================================

            const statusResult =
                await pool.query(
                    `
                    SELECT

                        status,

                        COUNT(*)::INTEGER
                            AS count

                    FROM tasks

                    WHERE organization_id =
                          $1

                    GROUP BY status

                    ORDER BY
                        CASE status

                            WHEN 'TODO'
                                THEN 1

                            WHEN 'IN_PROGRESS'
                                THEN 2

                            WHEN 'REVIEW'
                                THEN 3

                            WHEN 'DONE'
                                THEN 4

                            ELSE 5

                        END
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // Render dashboard
            // ========================================

            res.render(
                "dashboard/index",
                {

                    user: user,

                    invitations:
                        invitationResult.rows,

                    projectCount:
                        projectResult.rows[0]
                            .count,

                    taskCount:
                        taskResult.rows[0]
                            .count,

                    completedCount:
                        completedResult.rows[0]
                            .count,

                    memberCount:
                        memberResult.rows[0]
                            .count,

                    taskStatuses:
                        statusResult.rows

                }
            );

        } catch (error) {

            console.error(
                "Dashboard error:",
                error
            );

            res.status(500).send(
                "Failed to load dashboard"
            );

        }

    }
);


// ============================================
// DB TEST
// ============================================

app.get(
    "/db-test",

    async (req, res) => {

        try {

            const result =
                await pool.query(
                    "SELECT NOW()"
                );


            res.json({

                success: true,

                message:
                    "Database connected successfully",

                time:
                    result.rows[0].now

            });

        } catch (error) {

            console.error(
                "Database test error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Database connection failed"

            });

        }

    }
);


// ============================================
// DB INFO
// ============================================

app.get(
    "/db-info",

    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT

                        current_database()
                            AS database,

                        current_user
                            AS user
                    `
                );


            res.json(
                result.rows[0]
            );

        } catch (error) {

            res.status(500).json({

                error:
                    error.message

            });

        }

    }
);


// ============================================
// 404
// ============================================

app.use(
    (req, res) => {

        res.status(404).send(
            "404 - Page Not Found"
        );

    }
);


// ============================================
// START SERVER
// ============================================

app.listen(
    PORT,

    () => {

        console.log(
            `TeamFlow running at http://localhost:${PORT}`
        );

    }
);