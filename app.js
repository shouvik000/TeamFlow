const express = require("express");

const path = require("path");

const session =
    require("express-session");

const pgSession =
    require("connect-pg-simple")(session);

require("dotenv").config();


// ============================================
// DATABASE
// ============================================

const pool =
    require("./config/db");


// ============================================
// WEBHOOK
// ============================================

const webhookController =
    require("./controllers/webhookController");


// ============================================
// WEB ROUTES
// ============================================

const authRoutes =
    require("./routes/authRoutes");

const projectRoutes =
    require("./routes/projectRoutes");

const organizationRoutes =
    require("./routes/organizationRoutes");

const taskRoutes =
    require("./routes/taskRoutes");

const subscriptionRoutes =
    require("./routes/subscriptionRoutes");

const notificationRoutes =
    require("./routes/notificationRoutes");


// ============================================
// API ROUTES
// ============================================

const projectApiRoutes =
    require("./routes/api/projectRoutes");

const taskApiRoutes =
    require("./routes/api/taskRoutes");

const organizationApiRoutes =
    require("./routes/api/organizationRoutes");

const notificationApiRoutes =
    require("./routes/api/notificationRoutes");

const subscriptionApiRoutes =
    require("./routes/api/subscriptionRoutes");
   
    const activityApiRoutes =
    require("./routes/api/activityRoutes");

// ============================================
// SWAGGER
// ============================================

const swaggerUi =
    require("swagger-ui-express");

const swaggerDocument =
    require("./config/swagger");


// ============================================
// API ERROR HANDLING
// ============================================

const {
    apiNotFound,
    apiErrorHandler
} = require("./middleware/errorMiddleware");


// ============================================
// SECURITY
// ============================================

const {
    securityHeaders,
    apiRateLimiter,
    authRateLimiter
} = require("./middleware/securityMiddleware");


// ============================================
// EXPRESS APP
// ============================================

const app =
    express();

const PORT =
    process.env.PORT || 3000;


// ============================================
// TRUST PROXY IN PRODUCTION
// Useful when deployed behind Render/proxy
// ============================================

if (
    process.env.NODE_ENV === "production"
) {

    app.set(
        "trust proxy",
        1
    );

}


// ============================================
// DISABLE X-POWERED-BY
// ============================================

app.disable(
    "x-powered-by"
);


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
// SECURITY HEADERS
// ============================================

app.use(
    securityHeaders
);


// ============================================
// SWAGGER API DOCUMENTATION
// ============================================

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(
        swaggerDocument,
        {
            explorer: true
        }
    )
);


// ============================================
// RAZORPAY WEBHOOK
// IMPORTANT:
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

                pool:
                    pool,

                tableName:
                    "session"

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
// AUTH ROUTES
// ============================================

app.use(
    "/auth",
    authRateLimiter,
    authRoutes
);


// ============================================
// WEB ROUTES
// ============================================

app.use(
    "/projects",
    projectRoutes
);

app.use(
    "/organizations",
    organizationRoutes
);

app.use(
    "/billing",
    subscriptionRoutes
);

app.use(
    "/",
    taskRoutes
);

app.use(
    "/notifications",
    notificationRoutes
);


// ============================================
// LEGACY REST API
// Existing endpoints remain working
// ============================================

app.use(
    "/api",
    apiRateLimiter
);


// --------------------------------------------
// Projects
// /api/projects
// --------------------------------------------

app.use(
    "/api/projects",
    projectApiRoutes
);


// --------------------------------------------
// Tasks
// /api/projects/:projectId/tasks
// /api/tasks/:taskId
// --------------------------------------------

app.use(
    "/api",
    taskApiRoutes
);


// --------------------------------------------
// Organizations
// --------------------------------------------

app.use(
    "/api/organizations",
    organizationApiRoutes
);


// --------------------------------------------
// Notifications
// --------------------------------------------

app.use(
    "/api/notifications",
    notificationApiRoutes
);


// --------------------------------------------
// Billing
// --------------------------------------------

app.use(
    "/api/billing",
    subscriptionApiRoutes
);


// ============================================
// VERSIONED REST API
// Recommended endpoints
// ============================================

app.use(
    "/api/v1",
    apiRateLimiter
);


// --------------------------------------------
// Projects v1
// /api/v1/projects
// --------------------------------------------

app.use(
    "/api/v1/projects",
    projectApiRoutes
);


// --------------------------------------------
// Tasks v1
// /api/v1/projects/:projectId/tasks
// /api/v1/tasks/:taskId
// --------------------------------------------

app.use(
    "/api/v1",
    taskApiRoutes
);


// --------------------------------------------
// Organizations v1
// --------------------------------------------

app.use(
    "/api/v1/organizations",
    organizationApiRoutes
);


// --------------------------------------------
// Notifications v1
// --------------------------------------------

app.use(
    "/api/v1/notifications",
    notificationApiRoutes
);


// --------------------------------------------
// Billing v1
// --------------------------------------------

app.use(
    "/api/v1/billing",
    subscriptionApiRoutes
);



// ============================================
// Activity API v1
// /api/v1/activity
// ============================================

app.use(
    "/api/v1/activity",
    activityApiRoutes
);

// ============================================
// HOME ROUTE
// ============================================

app.get(
    "/",
    (req, res) => {

        if (
            req.session &&
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
            // Pending Invitations
            // ========================================

            const invitationResult =
                await pool.query(
                    `
                    SELECT
                        i.id,
                        i.email,
                        i.role,
                        i.expires_at,
                        o.name AS organization_name

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
            // Project Count
            // ========================================

            const projectResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER
                            AS count

                    FROM projects

                    WHERE organization_id = $1
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // Task Count
            // ========================================

            const taskResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER
                            AS count

                    FROM tasks

                    WHERE organization_id = $1
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // Completed Tasks
            // ========================================

            const completedResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER
                            AS count

                    FROM tasks

                    WHERE organization_id = $1

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

                    WHERE organization_id = $1
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // Task Status Statistics
            // ========================================

            const statusResult =
                await pool.query(
                    `
                    SELECT
                        status,
                        COUNT(*)::INTEGER
                            AS count

                    FROM tasks

                    WHERE organization_id = $1

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
            // Render Dashboard
            // ========================================

            res.render(
                "dashboard/index",
                {

                    user,

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
// DATABASE TEST
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
// DATABASE INFO
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
// API 404
// ============================================

app.use(
    apiNotFound
);


// ============================================
// NORMAL 404
// ============================================

app.use(
    (req, res) => {

        res.status(404).send(
            "404 - Page Not Found"
        );

    }
);


// ============================================
// GLOBAL API ERROR HANDLER
// ============================================

app.use(
    apiErrorHandler
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

        console.log(
            `Swagger docs: http://localhost:${PORT}/api-docs`
        );

        console.log(
            `API v1: http://localhost:${PORT}/api/v1`
        );

    }
);