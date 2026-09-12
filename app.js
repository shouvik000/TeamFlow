const express = require("express");
const path = require("path");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);

require("dotenv").config();

const pool = require("./config/db");
const webhookController =
    require("./controllers/webhookController");
const authRoutes = require("./routes/authRoutes");
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



const { isAuthenticated } = require("./middleware/authMiddleware");


const app = express();
const PORT = process.env.PORT || 3000;









  // EJS CONFIGURATION

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));








app.post(
    "/webhooks/razorpay",
    express.raw({
        type: "application/json"
    }),
    webhookController.razorpayWebhook
);









// GENERAL MIDDLEWARE


app.use(express.urlencoded({ extended: true }));
app.use(express.json());












// STATIC FILES

app.use(express.static(path.join(__dirname, "public")));










// SESSION MIDDLEWARE
// IMPORTANT: Must come BEFORE routes


app.use(
    session({
        store: new pgSession({
            pool: pool,
            tableName: "session"
        }),

        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);











// MAKE USER AVAILABLE TO ALL EJS FILES


app.use((req, res, next) => {

    res.locals.user = req.session.user || null;

    next();
});












// AUTH ROUTES


app.use("/auth", authRoutes);



app.use("/projects", projectRoutes);


app.use(
    "/organizations",
    organizationRoutes
);


app.use(
    "/billing",
    subscriptionRoutes
);


app.use("/", taskRoutes);


app.use(
    "/notifications",
    notificationRoutes
);












// HOME ROUTE


app.get("/", (req, res) => {

    if (req.session.user) {
        return res.redirect("/dashboard");
    }

    res.redirect("/auth/login");

});







// DASHBOARD ROUTE


app.get("/dashboard", async (req, res) => {

    if (!req.session || !req.session.user) {
        return res.redirect("/auth/login");
    }

    try {

        const user = req.session.user;

        // Find pending invitations for this user's email
        const invitationResult = await pool.query(
            `
            SELECT
                i.id,
                i.email,
                i.role,
                i.expires_at,
                o.name AS organization_name
            FROM invitations i
            JOIN organizations o
                ON o.id = i.organization_id
            WHERE LOWER(i.email) = LOWER($1)
              AND i.accepted_at IS NULL
              AND i.expires_at > NOW()
            ORDER BY i.created_at DESC
            `,
            [user.email]
        );

        res.render("dashboard/index", {
            user: user,
            invitations: invitationResult.rows
        });

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

        res.status(500).send(
            "Failed to load dashboard"
        );
    }
});







// DATABASE TEST ROUTE


app.get("/db-test", async (req, res) => {

    try {

        const result = await pool.query("SELECT NOW()");

        res.json({

            success: true,

            message: "Database connected successfully",

            time: result.rows[0].now

        });

    } catch (error) {

        console.error("Database test error:", error);

        res.status(500).json({

            success: false,

            message: "Database connection failed"

        });

    }

});










//db-info
app.get("/db-info", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                current_database() AS database,
                current_user AS user
        `);

        res.json(result.rows[0]);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});





















// 404 ROUTE


app.use((req, res) => {

    res.status(404).send("404 - Page Not Found");

});








app.listen(PORT, () => {

    console.log(
        `TeamFlow running at http://localhost:${PORT}`
    );

});