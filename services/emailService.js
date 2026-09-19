



const nodemailer = require("nodemailer");


// ============================================
// SMTP TRANSPORTER
// ============================================

const transporter =
    nodemailer.createTransport({

        host:
            process.env.SMTP_HOST,

        port:
            Number(
                process.env.SMTP_PORT || 587
            ),

        secure:
            String(
                process.env.SMTP_SECURE
            ).toLowerCase() === "true",

        auth: {

            user:
                process.env.SMTP_USER,

            pass:
                process.env.SMTP_PASS

        }

    });


// ============================================
// VERIFY EMAIL CONFIGURATION
// ============================================

exports.verifyEmailTransport = async () => {

    try {

        await transporter.verify();

        console.log(
            "📧 Email SMTP connection verified"
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Email SMTP verification failed:",
            error.message
        );

        return false;
    }
};


// ============================================
// SEND INVITATION EMAIL
// ============================================

exports.sendInvitationEmail = async ({
    to,
    organizationName,
    role,
    invitationUrl
}) => {

    if (!to) {

        throw new Error(
            "Invitation recipient email is required"
        );
    }


    if (!invitationUrl) {

        throw new Error(
            "Invitation URL is required"
        );
    }


    const from =
        process.env.SMTP_FROM ||
        process.env.SMTP_USER;


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
<!DOCTYPE html>

<html>

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>TeamFlow Invitation</title>

</head>


<body
    style="
        margin:0;
        padding:0;
        background:#f5f7fb;
        font-family:Arial,Helvetica,sans-serif;
    "
>

    <div
        style="
            max-width:600px;
            margin:40px auto;
            background:#ffffff;
            border-radius:12px;
            padding:32px;
            box-shadow:0 4px 18px rgba(0,0,0,0.08);
        "
    >

        <h1
            style="
                margin-top:0;
                color:#212529;
            "
        >
            TeamFlow Invitation
        </h1>


        <p
            style="
                color:#495057;
                line-height:1.6;
            "
        >
            You have been invited to join:
        </p>


        <div
            style="
                background:#f1f3f5;
                border-radius:8px;
                padding:16px;
                margin:20px 0;
            "
        >

            <strong>
                ${escapeHtml(
                    organizationName
                )}
            </strong>

            <br>

            <span
                style="
                    color:#6c757d;
                "
            >
                Role: ${escapeHtml(role)}
            </span>

        </div>


        <p
            style="
                color:#495057;
                line-height:1.6;
            "
        >
            Click the button below to accept the invitation.
        </p>


        <div
            style="
                text-align:center;
                margin:30px 0;
            "
        >

            <a
                href="${escapeAttribute(
                    invitationUrl
                )}"
                style="
                    display:inline-block;
                    background:#0d6efd;
                    color:#ffffff;
                    text-decoration:none;
                    padding:12px 24px;
                    border-radius:8px;
                    font-weight:bold;
                "
            >
                Accept Invitation
            </a>

        </div>


        <p
            style="
                color:#6c757d;
                font-size:14px;
                line-height:1.6;
            "
        >
            This invitation will expire in 24 hours.
        </p>


        <p
            style="
                color:#6c757d;
                font-size:14px;
                line-height:1.6;
            "
        >
            If you were not expecting this invitation, you can safely ignore this email.
        </p>


        <hr
            style="
                border:none;
                border-top:1px solid #dee2e6;
                margin:30px 0;
            "
        >


        <p
            style="
                color:#adb5bd;
                font-size:12px;
                text-align:center;
            "
        >
            TeamFlow
        </p>

    </div>

</body>

</html>
    `.trim();


    const info =
        await transporter.sendMail({

            from,

            to,

            subject,

            text,

            html

        });


    console.log(
        "📧 Invitation email sent successfully"
    );

    console.log(
        "Recipient:",
        to
    );

    console.log(
        "Message ID:",
        info.messageId
    );


    return info;
};


// ============================================
// HTML ESCAPING
// ============================================

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ============================================
// HTML ATTRIBUTE ESCAPING
// ============================================

function escapeAttribute(value) {

    return escapeHtml(value)
        .replace(
            /`/g,
            "&#096;"
        );
}