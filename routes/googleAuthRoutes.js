const express = require("express");
const { google } = require("googleapis");

const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

router.get("/google", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/gmail.send"
        ]
    });

    res.redirect(url);
});

router.get("/google/callback", async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).send("Google authorization code is missing.");
        }

        const { tokens } = await oauth2Client.getToken(code);

        console.log("\nGoogle OAuth authorization succeeded.");
        console.log("Refresh token received:", Boolean(tokens.refresh_token));

        if (tokens.refresh_token) {
            console.log("\nSave this refresh token privately in your .env file:");
            console.log("GOOGLE_REFRESH_TOKEN=" + tokens.refresh_token);
        } else {
            console.log(
                "No refresh token returned. Revoke the previous TeamFlow authorization and try again."
            );
        }

        return res.send(
            "Google authorization completed. Check your local terminal for the token. Do not share it."
        );
    } catch (error) {
        console.error("Google OAuth failed:", error.message);

        return res.status(500).send(
            "Google authorization failed. Check the TeamFlow terminal for details."
        );
    }
});

module.exports = router;