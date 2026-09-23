const express = require("express");
const path = require("path");
const http = require("http");

const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);

const { Server } = require("socket.io");
const socketService = require("./services/socketService");

require("dotenv").config();


// ============================================================
// DATABASE
// ============================================================

const pool =
    require("./config/db");


// ============================================================
// WEBHOOK
// ============================================================

const webhookController =
    require("./controllers/webhookController");


// ============================================================
// WEB ROUTES
// ============================================================

const authRoutes =
    require("./routes/authRoutes");

const projectRoutes =
    require("./routes/projectRoutes");

const organizationRoutes =
    require("./routes/organizationRoutes");


const kanbanRoutes =
    require("./routes/kanbanRoutes");    

const taskRoutes =
    require("./routes/taskRoutes");

const subscriptionRoutes =
    require("./routes/subscriptionRoutes");

const notificationRoutes =
    require("./routes/notificationRoutes");


// ============================================================
// API ROUTES
// ============================================================

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


// ============================================================
// SWAGGER
// ============================================================

const swaggerUi =
    require("swagger-ui-express");

const swaggerDocument =
    require("./config/swagger");


// ============================================================
// API ERROR HANDLING
// ============================================================

const {
    apiNotFound,
    apiErrorHandler
} = require("./middleware/errorMiddleware");


// ============================================================
// SECURITY
// ============================================================

const {
    securityHeaders,
    apiRateLimiter,
    authRateLimiter
} = require("./middleware/securityMiddleware");


// ============================================================
// SOCKET.IO SERVICE
// ============================================================

const {
    setIO,
    getUserRoom,
    getOrganizationRoom
} = require("./services/socketService");


// ============================================================
// EXPRESS APP
// ============================================================

const app =
    express();

const PORT =
    process.env.PORT || 3000;


// ============================================================
// TRUST PROXY IN PRODUCTION
// ============================================================

if (
    process.env.NODE_ENV === "production"
) {

    app.set(
        "trust proxy",
        1
    );
}


// ============================================================
// DISABLE X-POWERED-BY
// ============================================================

app.disable(
    "x-powered-by"
);


// ============================================================
// EJS CONFIGURATION
// ============================================================

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


// ============================================================
// GLOBAL EJS HELPERS
// ============================================================
//
// These helpers are available inside all EJS templates.
//
// Used by:
// views/dashboard/activity.ejs
// ============================================================


// ------------------------------------------------------------
// Format activity action
// ------------------------------------------------------------

app.locals.formatActionLabel =
    function formatActionLabel(action) {

        if (!action) {

            return "Activity";
        }


        const labels = {

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


        if (
            labels[action]
        ) {

            return labels[action];
        }


        return String(action)
            .split("_")
            .map(
                (word) => {

                    return (
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase()
                    );

                }
            )
            .join(" ");
    };


// ------------------------------------------------------------
// Format activity entity type
// ------------------------------------------------------------

app.locals.formatEntityLabel =
    function formatEntityLabel(entityType) {

        if (!entityType) {

            return "Activity";
        }


        const labels = {

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


        if (
            labels[entityType]
        ) {

            return labels[entityType];
        }


        return String(entityType)
            .split("_")
            .map(
                (word) => {

                    return (
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase()
                    );

                }
            )
            .join(" ");
    };


// ------------------------------------------------------------
// Activity icon
// ------------------------------------------------------------

app.locals.getActivityIcon =
    function getActivityIcon(action) {

        const icons = {

            INVITATION_CREATED:
                "📨",

            INVITATION_RESENT:
                "📧",

            INVITATION_CANCELLED:
                "✉️",

            MEMBER_ROLE_UPDATED:
                "🔑",

            MEMBER_REMOVED:
                "🚫",

            MEMBER_ADDED:
                "👤",

            PROJECT_CREATED:
                "📁",

            PROJECT_UPDATED:
                "🛠️",

            PROJECT_DELETED:
                "🗑️",

            TASK_CREATED:
                "✅",

            TASK_UPDATED:
                "🔄",

            TASK_DELETED:
                "❌"

        };


        return (
            icons[action] ||
            "📋"
        );
    };


// ------------------------------------------------------------
// Build query string for pagination/filter links
// ------------------------------------------------------------

app.locals.buildQueryString =
    function buildQueryString(params = {}) {

        const query =
            new URLSearchParams();


        Object.entries(params)
            .forEach(
                ([key, value]) => {

                    if (
                        value === undefined ||
                        value === null
                    ) {

                        return;
                    }


                    const stringValue =
                        String(value);


                    if (
                        stringValue.trim() === ""
                    ) {

                        return;
                    }


                    query.set(
                        key,
                        stringValue
                    );

                }
            );


        return query.toString();
    };


// ============================================================
// SECURITY HEADERS
// ============================================================

app.use(
    securityHeaders
);


// ============================================================
// SWAGGER API DOCUMENTATION
// ============================================================

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


// ============================================================
// RAZORPAY WEBHOOK
// ============================================================
//
// IMPORTANT:
// Webhook must receive raw JSON body
// BEFORE express.json()
// ============================================================

app.post(
    "/webhooks/razorpay",

    express.raw({
        type: "application/json"
    }),

    webhookController.razorpayWebhook
);


// ============================================================
// GENERAL MIDDLEWARE
// ============================================================

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    express.json()
);


// ============================================================
// STATIC FILES
// ============================================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// ============================================================
// SESSION MIDDLEWARE
// ============================================================
//
// IMPORTANT:
// Keep this in a variable because
// Socket.IO will reuse the same session.
// ============================================================

const sessionMiddleware =
    session({

        store:
            new pgSession({

                pool:
                    pool,

                tableName:
                    "session",

                createTableIfMissing:
                    false

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

    });


// ============================================================
// APPLY SESSION TO EXPRESS
// ============================================================

app.use(
    sessionMiddleware
);


// ============================================================
// GLOBAL USER
// ============================================================

app.use(
    (req, res, next) => {

        res.locals.user =
            req.session &&
            req.session.user
                ? req.session.user
                : null;

        next();

    }
);


// ============================================================
// AUTH ROUTES
// ============================================================

app.use(
    "/auth",
    authRateLimiter,
    authRoutes
);


// ============================================================
// WEB ROUTES
// ============================================================

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
    "/kanban",
    kanbanRoutes
);


app.use(
    "/",
    taskRoutes
);

app.use(
    "/notifications",
    notificationRoutes
);


// ============================================================
// LEGACY REST API
// ============================================================

app.use(
    "/api",
    apiRateLimiter
);


// ============================================================
// PROJECT API
// /api/projects
// ============================================================

app.use(
    "/api/projects",
    projectApiRoutes
);


// ============================================================
// TASK API
// ============================================================
//
// /api/projects/:projectId/tasks
// /api/tasks/:taskId
// ============================================================

app.use(
    "/api",
    taskApiRoutes
);


// ============================================================
// ORGANIZATION API
// /api/organizations
// ============================================================

app.use(
    "/api/organizations",
    organizationApiRoutes
);


// ============================================================
// NOTIFICATION API
// /api/notifications
// ============================================================

app.use(
    "/api/notifications",
    notificationApiRoutes
);


// ============================================================
// BILLING API
// /api/billing
// ============================================================

app.use(
    "/api/billing",
    subscriptionApiRoutes
);


// ============================================================
// VERSIONED REST API
// ============================================================

app.use(
    "/api/v1",
    apiRateLimiter
);


// ============================================================
// PROJECTS V1
// ============================================================

app.use(
    "/api/v1/projects",
    projectApiRoutes
);


// ============================================================
// TASKS V1
// ============================================================

app.use(
    "/api/v1",
    taskApiRoutes
);


// ============================================================
// ORGANIZATIONS V1
// ============================================================

app.use(
    "/api/v1/organizations",
    organizationApiRoutes
);


// ============================================================
// NOTIFICATIONS V1
// ============================================================

app.use(
    "/api/v1/notifications",
    notificationApiRoutes
);


// ============================================================
// BILLING V1
// ============================================================

app.use(
    "/api/v1/billing",
    subscriptionApiRoutes
);


// ============================================================
// ACTIVITY API V1
// ============================================================

app.use(
    "/api/v1/activity",
    activityApiRoutes
);


// ============================================================
// HOME ROUTE
// ============================================================

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


// ============================================================
// DASHBOARD
// ============================================================

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
            // PENDING INVITATIONS
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
            // PROJECT COUNT
            // ========================================

            const projectResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER AS count

                    FROM projects

                    WHERE organization_id = $1
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // TASK COUNT
            // ========================================

            const taskResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER AS count

                    FROM tasks

                    WHERE organization_id = $1
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // COMPLETED TASKS
            // ========================================

            const completedResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER AS count

                    FROM tasks

                    WHERE organization_id = $1

                      AND status = 'DONE'
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // MEMBERS
            // ========================================

            const memberResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER AS count

                    FROM organization_members

                    WHERE organization_id = $1
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // TASK STATUS STATISTICS
            // ========================================

            const statusResult =
                await pool.query(
                    `
                    SELECT

                        status,

                        COUNT(*)::INTEGER AS count

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
            // RENDER DASHBOARD
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


// ============================================================
// DASHBOARD REAL-TIME STATS
// ============================================================

app.get(
    "/dashboard/stats",

    async (req, res) => {

        // ========================================
        // AUTHENTICATION
        // ========================================

        if (
            !req.session ||
            !req.session.user
        ) {

            return res.status(401).json({

                success:
                    false,

                message:
                    "Authentication required"

            });

        }


        try {

            const organizationId =
                req.session.user.organizationId;


            // ========================================
            // PROJECT COUNT
            // ========================================

            const projectResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER AS count

                    FROM projects

                    WHERE organization_id = $1
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // TASK COUNT
            // ========================================

            const taskResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER AS count

                    FROM tasks

                    WHERE organization_id = $1
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // COMPLETED TASK COUNT
            // ========================================

            const completedResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER AS count

                    FROM tasks

                    WHERE organization_id = $1

                      AND status = 'DONE'
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // MEMBER COUNT
            // ========================================

            const memberResult =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::INTEGER AS count

                    FROM organization_members

                    WHERE organization_id = $1
                    `,
                    [
                        organizationId
                    ]
                );


            // ========================================
            // TASK STATUS STATISTICS
            // ========================================

            const statusResult =
                await pool.query(
                    `
                    SELECT

                        status,

                        COUNT(*)::INTEGER AS count

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
            // RESPONSE
            // ========================================

            res.json({

                success:
                    true,

                stats: {

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

            });


        } catch (error) {

            console.error(
                "Dashboard stats error:",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to load dashboard statistics"

            });

        }

    }
);


// ============================================================
// DATABASE TEST
// ============================================================

app.get(
    "/db-test",

    async (req, res) => {

        try {

            const result =
                await pool.query(
                    "SELECT NOW()"
                );


            res.json({

                success:
                    true,

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

                success:
                    false,

                message:
                    "Database connection failed"

            });

        }

    }
);


// ============================================================
// DATABASE INFO
// ============================================================

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

            console.error(
                "Database info error:",
                error
            );


            res.status(500).json({

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// API 404 HANDLER
// ============================================================

app.use(
    apiNotFound
);


// ============================================================
// NORMAL 404 HANDLER
// ============================================================

app.use(
    (req, res) => {

        res.status(404).send(
            "404 - Page Not Found"
        );

    }
);


// ============================================================
// GLOBAL API ERROR HANDLER
// ============================================================

app.use(
    apiErrorHandler
);


// ============================================================
// CREATE HTTP SERVER
// ============================================================
//
// IMPORTANT:
// DO NOT use app.listen()
// because Socket.IO uses this HTTP server.
// ============================================================

const server =
    http.createServer(
        app
    );


// ============================================================
// CREATE SOCKET.IO SERVER
// ============================================================

// ============================================
// Socket.IO Setup
// ============================================

const io = new Server(server, {
    cors: {
        origin: true,
        credentials: true
    }
});

// Make Socket.IO available to services
socketService.setIO(io);

// ============================================
// Socket Authentication + Rooms
// ============================================

io.on("connection", async (socket) => {

    try {

        // ----------------------------------------
        // User joins after login
        // ----------------------------------------

        socket.on("join:user", async (data) => {

            if (!data || !data.userId || !data.organizationId) {
                return;
            }

            const userRoom =
                socketService.getUserRoom(
                    data.userId,
                    data.organizationId
                );

            const organizationRoom =
                socketService.getOrganizationRoom(
                    data.organizationId
                );

            socket.join(userRoom);
            socket.join(organizationRoom);

            // ------------------------------------
            // Join every project room
            // ------------------------------------

            const projects = await pool.query(
                `
                SELECT id
                FROM projects
                WHERE organization_id=$1
                `,
                [data.organizationId]
            );

            for (const project of projects.rows) {

                socket.join(
                    socketService.getProjectRoom(
                        data.organizationId,
                        project.id
                    )
                );

            }

            console.log(
                `Socket ${socket.id} joined organization ${data.organizationId}`
            );

        });

        socket.on("disconnect", () => {

            console.log(
                `Socket disconnected: ${socket.id}`
            );

        });

    } catch (error) {

        console.error(
            "Socket connection error:",
            error
        );

    }

});


// ============================================================
// SHARE EXPRESS SESSION WITH SOCKET.IO
// ============================================================

io.engine.use(
    sessionMiddleware
);


// ============================================================
// SOCKET.IO AUTHENTICATION
// ============================================================

io.use(
    (socket, next) => {

        try {

            const currentSession =
                socket.request.session;


            // ========================================
            // USER MUST BE LOGGED IN
            // ========================================

            if (
                !currentSession ||
                !currentSession.user
            ) {

                return next(
                    new Error(
                        "Authentication required"
                    )
                );

            }


            // ========================================
            // SAVE USER
            // ========================================

            socket.user =
                currentSession.user;


            next();


        } catch (error) {

            console.error(
                "Socket authentication error:",
                error
            );


            next(
                new Error(
                    "Socket authentication failed"
                )
            );

        }

    }
);








































// ============================================================
// SOCKET.IO CONNECTION
// ============================================================

io.on("connection", (socket) => {

    const user = socket.user;

    // ----------------------------------------
    // User Room
    // ----------------------------------------

    const userRoom =
        socketService.getUserRoom(
            user.id,
            user.organizationId
        );

    socket.join(userRoom);

    // ----------------------------------------
    // Organization Room
    // ----------------------------------------

    let currentOrganizationRoom =
        socketService.getOrganizationRoom(
            user.organizationId
        );

    socket.join(currentOrganizationRoom);

    console.log(
        `🔌 Socket connected: user=${user.id} org=${user.organizationId}`
    );

    console.log(
        `📡 Joined user room: ${userRoom}`
    );

    console.log(
        `📡 Joined organization room: ${currentOrganizationRoom}`
    );

    // ----------------------------------------
    // Join Project Room (Kanban)
    // ----------------------------------------

    socket.on(
        "join:project",
        ({ organizationId, projectId }) => {

            if (!organizationId || !projectId) {
                return;
            }

            if (
                Number(organizationId) !==
                Number(user.organizationId)
            ) {
                return;
            }

            const projectRoom =
                socketService.getProjectRoom(
                    organizationId,
                    projectId
                );

            if (!socket.rooms.has(projectRoom)) {

                socket.join(projectRoom);

                console.log(
                    `📡 Socket ${socket.id} joined project room ${projectRoom}`
                );

            }

        }
    );

    // ----------------------------------------
    // Organization Switch
    // ----------------------------------------

    socket.on(
        "organization:switch",
        async (organizationId) => {

            try {

                const requestedOrganizationId =
                    Number(organizationId);

                if (
                    !Number.isInteger(requestedOrganizationId) ||
                    requestedOrganizationId <= 0
                ) {
                    return;
                }

                const membershipResult =
                    await pool.query(
                        `
                        SELECT organization_id
                        FROM organization_members
                        WHERE organization_id=$1
                          AND user_id=$2
                        LIMIT 1
                        `,
                        [
                            requestedOrganizationId,
                            user.id
                        ]
                    );

                if (
                    membershipResult.rows.length === 0
                ) {

                    console.log(
                        `⚠️ User ${user.id} attempted unauthorized organization switch`
                    );

                    return;
                }

                socket.leave(currentOrganizationRoom);

                currentOrganizationRoom =
                    socketService.getOrganizationRoom(
                        requestedOrganizationId
                    );

                socket.join(currentOrganizationRoom);

                console.log(
                    `🔄 User ${user.id} switched to ${currentOrganizationRoom}`
                );

            } catch (error) {

                console.error(
                    "Socket organization switch error:",
                    error
                );

            }

        }
    );

    // ----------------------------------------
    // Disconnect
    // ----------------------------------------

    socket.on(
        "disconnect",
        (reason) => {

            console.log(
                `🔌 Socket disconnected: user=${user.id} reason=${reason}`
            );

        }
    );

});


// ============================================================
// CONNECT SOCKET.IO SERVICE
// ============================================================
//
// notificationService.js and task/project
// events use this shared Socket.IO instance.
// ============================================================

setIO(
    io
);
























































// ============================================================
// START SERVER
// ============================================================

server.listen(
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


        console.log(
            "Socket.IO real-time notifications enabled"
        );


        console.log(
            "Real-time organization events enabled"
        );

    }
);