const bcrypt = require("bcrypt");
const pool = require("../config/db");

// Show registration page
exports.showRegister = (req, res) => {
    res.render("auth/register");
};

// Register user
exports.register = async (req, res) => {
    const { name, email, password, organizationName } = req.body;

    try {
        // Basic validation
        if (!name || !email || !password || !organizationName) {
            return res.status(400).send("All fields are required");
        }

        if (password.length < 6) {
            return res.status(400).send("Password must be at least 6 characters");
        }

        // Check whether user already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email.toLowerCase().trim()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).send("Email already registered");
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Start transaction
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            // Create user
            const userResult = await client.query(
                `
                INSERT INTO users (name, email, password_hash)
                VALUES ($1, $2, $3)
                RETURNING id, name, email
                `,
                [
                    name.trim(),
                    email.toLowerCase().trim(),
                    passwordHash
                ]
            );

            const user = userResult.rows[0];

            // Create organization
            const organizationResult = await client.query(
                `
                INSERT INTO organizations (name, owner_id)
                VALUES ($1, $2)
                RETURNING id, name
                `,
                [
                    organizationName.trim(),
                    user.id
                ]
            );

            const organization = organizationResult.rows[0];

            // Add user as organization OWNER
            await client.query(
                `
                INSERT INTO organization_members
                (organization_id, user_id, role)
                VALUES ($1, $2, $3)
                `,
                [
                    organization.id,
                    user.id,
                    "OWNER"
                ]
            );

            await client.query("COMMIT");

            // Create login session
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                organizationId: organization.id,
                role: "OWNER"
            };

            res.redirect("/dashboard");

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;

        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).send("Something went wrong during registration");
    }
};


// Show login page
exports.showLogin = (req, res) => {
    res.render("auth/login");
};


// Login user
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validate fields
        if (!email || !password) {
            return res.status(400).send("Email and password are required");
        }

        // Find user
        const userResult = await pool.query(
            `
            SELECT id, name, email, password_hash
            FROM users
            WHERE email = $1
            `,
            [email.toLowerCase().trim()]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).send("Invalid email or password");
        }

        const user = userResult.rows[0];

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).send("Invalid email or password");
        }

        // Get user's organization + role
        const organizationResult = await pool.query(
            `
            SELECT
                om.organization_id,
                om.role,
                o.name AS organization_name
            FROM organization_members om
            JOIN organizations o
                ON o.id = om.organization_id
            WHERE om.user_id = $1
            ORDER BY om.id
            LIMIT 1
            `,
            [user.id]
        );

        if (organizationResult.rows.length === 0) {
            return res.status(403).send(
                "User is not associated with an organization"
            );
        }

        const organization = organizationResult.rows[0];

        // Create session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            organizationId: organization.organization_id,
            organizationName: organization.organization_name,
            role: organization.role
        };

        // Save session before redirect
        req.session.save((err) => {
            if (err) {
                console.error("Session save error:", err);

                return res.status(500).send(
                    "Could not create login session"
                );
            }

            res.redirect("/dashboard");
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).send("Something went wrong during login");
    }
};


// Logout user
exports.logout = (req, res) => {

    req.session.destroy((err) => {

        if (err) {
            console.error("Logout error:", err);

            return res.status(500).send(
                "Could not logout"
            );
        }

        res.clearCookie("connect.sid");

        res.redirect("/auth/login");
    });
};