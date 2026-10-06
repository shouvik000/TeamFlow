const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.verifyEmailTransport = async () => {
    try {
        if (!process.env.RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is missing from .env");
        }

        console.log("Resend email API configured");
        return true;
    } catch (error) {
        console.error("Resend email configuration failed:", error.message);
        return false;
    }
};

exports.sendInvitationEmail = async ({
    to,
    organizationName,
    role,
    invitationUrl
}) => {
    if (!to) {
        throw new Error("Invitation recipient email is required");
    }

    if (!invitationUrl) {
        throw new Error("Invitation URL is required");
    }

    if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is missing from .env");
    }

    const from =
        process.env.EMAIL_FROM || "onboarding@resend.dev";

    const subject =
        `You're invited to join ${organizationName} on TeamFlow`;

    const text = `
Hello,

You have been invited to join the organization "${organizationName}" on TeamFlow.

Role: ${role}

Accept your invitation here:

${invitationUrl}

This invitation will expire in 24 hours.

If you were not expecting this invitation, you can safely ignore this email.

Regards,
TeamFlow
    `.trim();

    const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333">
            <h2>You're invited to join ${escapeHtml(organizationName)} on TeamFlow</h2>
            <p>Hello,</p>
            <p>You have been invited to join
                <strong>${escapeHtml(organizationName)}</strong> on TeamFlow.
            </p>
            <p>Your role: <strong>${escapeHtml(role)}</strong></p>
            <p>
                <a href="${escapeAttribute(invitationUrl)}"
                   style="display:inline-block;padding:12px 20px;background:#0d6efd;color:white;text-decoration:none;border-radius:6px">
                    Accept Invitation
                </a>
            </p>
            <p>If the button doesn't work, use this link:</p>
            <p><a href="${escapeAttribute(invitationUrl)}">${escapeHtml(invitationUrl)}</a></p>
            <p>This invitation will expire in 24 hours.</p>
            <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
            <p>Regards,<br>TeamFlow</p>
        </div>
    `;

    const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        text,
        html
    });

    if (error) {
        console.error("Resend invitation email failed:", error);
        throw new Error(error.message || "Failed to send invitation email");
    }

    console.log("Invitation email sent successfully via Resend");
    console.log("Recipient:", to);
    console.log("Message ID:", data?.id);

    return data;
};

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
}