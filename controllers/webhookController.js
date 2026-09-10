const crypto = require("crypto");

const pool = require("../config/db");


// ============================================
// Razorpay webhook
// ============================================

exports.razorpayWebhook = async (req, res) => {

    try {

        const signature =
            req.headers["x-razorpay-signature"];


        if (!signature) {

            return res.status(400).send(
                "Missing webhook signature"
            );

        }


        // req.body must be the raw Buffer
        const expectedSignature =
            crypto
                .createHmac(
                    "sha256",
                    process.env.RAZORPAY_WEBHOOK_SECRET
                )
                .update(req.body)
                .digest("hex");


        if (
            expectedSignature !==
            signature
        ) {

            return res.status(400).send(
                "Invalid webhook signature"
            );

        }


        const payload =
            JSON.parse(
                req.body.toString("utf8")
            );


        const event =
            payload.event;


        console.log(
            "Razorpay webhook:",
            event
        );


        // ====================================
        // Payment captured
        // ====================================

        if (
            event === "payment.captured"
        ) {

            const paymentEntity =
                payload.payload
                    ?.payment
                    ?.entity;


            if (!paymentEntity) {

                return res.status(400).send(
                    "Payment data missing"
                );

            }


            const orderId =
                paymentEntity.order_id;

            const paymentId =
                paymentEntity.id;


            if (
                !orderId ||
                !paymentId
            ) {

                return res.status(400).send(
                    "Payment identifiers missing"
                );

            }


            // Find payment
            const paymentResult =
                await pool.query(
                    `
                    SELECT
                        id,
                        organization_id,
                        plan_id
                    FROM payments
                    WHERE razorpay_order_id = $1
                    `,
                    [
                        orderId
                    ]
                );


            if (
                paymentResult.rows.length === 0
            ) {

                console.log(
                    "Payment record not found:",
                    orderId
                );

                return res.status(200).json({
                    received: true
                });

            }


            const payment =
                paymentResult.rows[0];


            // Update payment
            await pool.query(
                `
                UPDATE payments

                SET
                    razorpay_payment_id = $1,
                    status = 'CAPTURED',
                    updated_at = CURRENT_TIMESTAMP

                WHERE id = $2
                `,
                [
                    paymentId,
                    payment.id
                ]
            );


            // Update subscription
            await pool.query(
                `
                UPDATE subscriptions

                SET
                    plan_id = $1,
                    status = 'ACTIVE',
                    updated_at = CURRENT_TIMESTAMP

                WHERE organization_id = $2
                `,
                [
                    payment.plan_id,
                    payment.organization_id
                ]
            );


            console.log(
                `Organization ${payment.organization_id} upgraded`
            );

        }


        // Always acknowledge webhook
        return res.status(200).json({
            received: true
        });


    } catch (error) {

        console.error(
            "Webhook error:",
            error
        );

        res.status(500).send(
            "Webhook processing failed"
        );
    }
};