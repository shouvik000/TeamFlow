const crypto = require("crypto");

const pool = require("../config/db");

const razorpay =
    require("../config/razorpay");

const {
    getOrganizationBillingInfo
} = require("../services/subscriptionService");

const {
    changeOrganizationPlan
} = require("../services/subscriptionService");

const {
    createActivityLog
} = require("../services/activityService");


// ============================================
// Show plans
// ============================================

exports.getPlans = async (req, res) => {

    const organizationId =
        req.session.user.organizationId;

    try {

        const plansResult = await pool.query(
            `
            SELECT
                id,
                name,
                price_monthly,
                max_projects,
                max_members,
                max_tasks
            FROM plans
            ORDER BY price_monthly ASC
            `
        );


        const billing =
            await getOrganizationBillingInfo(
                organizationId
            );


        if (!billing) {

            return res.status(404).send(
                "Subscription not found"
            );

        }


        res.render(
            "billing/plans",
            {
                plans: plansResult.rows,

                subscription:
                    billing.subscription,

                usage:
                    billing.usage
            }
        );

    } catch (error) {

        console.error(
            "Get plans error:",
            error
        );

        res.status(500).send(
            "Failed to load subscription plans"
        );
    }
};


// ============================================
// Get usage
// ============================================

exports.getUsage = async (req, res) => {

    const organizationId =
        req.session.user.organizationId;

    try {

        const billing =
            await getOrganizationBillingInfo(
                organizationId
            );


        if (!billing) {

            return res.status(404).json({
                success: false,
                message: "Subscription not found"
            });

        }


        res.json({

            success: true,

            subscription:
                billing.subscription,

            usage:
                billing.usage

        });

    } catch (error) {

        console.error(
            "Get usage error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load billing usage"

        });
    }
};


// ============================================
// Create Razorpay Order
// ============================================

exports.createOrder = async (req, res) => {

    const {
        planId
    } = req.body;


    const organizationId =
        req.session.user.organizationId;


    try {

        // ====================================
        // Get selected plan
        // ====================================

        const planResult =
            await pool.query(
                `
                SELECT
                    id,
                    name,
                    price_monthly
                FROM plans
                WHERE id = $1
                `,
                [
                    planId
                ]
            );


        if (planResult.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Plan not found"

            });

        }


        const plan =
            planResult.rows[0];


        // ====================================
        // Don't create payment for FREE
        // ====================================

        if (
            Number(plan.price_monthly) <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Cannot purchase the FREE plan"

            });

        }


        // ====================================
        // Convert rupees → paise
        // ====================================

        const amountPaise =
            Math.round(
                Number(plan.price_monthly) * 100
            );


        // ====================================
        // Create Razorpay order
        // ====================================

        const order =
            await razorpay.orders.create({

                amount: amountPaise,

                currency: "INR",

                receipt:
                    `tf_${organizationId}_${Date.now()}`,

                notes: {

                    organizationId:
                        String(organizationId),

                    planId:
                        String(plan.id)

                }

            });


        // ====================================
        // Save payment record
        // ====================================

        await pool.query(
            `
            INSERT INTO payments
            (
                organization_id,
                plan_id,
                razorpay_order_id,
                amount_paise,
                currency,
                status
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                'CREATED'
            )
            `,
            [
                organizationId,
                plan.id,
                order.id,
                amountPaise,
                "INR"
            ]
        );


        res.json({

            success: true,

            orderId: order.id,

            amount: amountPaise,

            currency: "INR",

            keyId:
                process.env.RAZORPAY_KEY_ID,

            planName:
                plan.name

        });


    } catch (error) {

        console.error(
            "Create Razorpay order error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to create payment order"

        });
    }
};


// ============================================
// Verify Razorpay payment
// ============================================

exports.verifyPayment = async (req, res) => {

    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    } = req.body;


    const organizationId =
        req.session.user.organizationId;


    try {

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Payment verification data is missing"

            });

        }


        // ====================================
        // Generate expected signature
        // ====================================

        const generatedSignature =
            crypto
                .createHmac(
                    "sha256",
                    process.env.RAZORPAY_KEY_SECRET
                )
                .update(
                    `${razorpay_order_id}|${razorpay_payment_id}`
                )
                .digest("hex");


        // ====================================
        // Compare signatures
        // ====================================

        if (
            generatedSignature !==
            razorpay_signature
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid payment signature"

            });

        }


        // ====================================
        // Find our payment
        // ====================================

        const paymentResult =
            await pool.query(
                `
                SELECT
                    id,
                    organization_id,
                    plan_id
                FROM payments
                WHERE razorpay_order_id = $1
                  AND organization_id = $2
                `,
                [
                    razorpay_order_id,
                    organizationId
                ]
            );


        if (
            paymentResult.rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Payment order not found"

            });

        }


        const payment =
            paymentResult.rows[0];


        // ====================================
        // Update payment
        // ====================================

        await pool.query(
            `
            UPDATE payments

            SET
                razorpay_payment_id = $1,
                status = 'VERIFIED',
                updated_at = CURRENT_TIMESTAMP

            WHERE id = $2
            `,
            [
                razorpay_payment_id,
                payment.id
            ]
        );


        // ====================================
        // Update subscription
        // ====================================

        const subscription =
            await changeOrganizationPlan(
                organizationId,
                payment.plan_id
            );


        if (!subscription) {

            return res.status(500).json({

                success: false,

                message:
                    "Payment verified but subscription update failed"

            });

        }


        // ====================================
        // Activity log
        // ====================================

        await createActivityLog({

            organizationId,

            userId:
                req.session.user.id,

            action:
                "SUBSCRIPTION_UPGRADED",

            entityType:
                "SUBSCRIPTION",

            entityId:
                subscription.id,

            description:
                `Subscription upgraded to plan ID ${payment.plan_id}`

        });


        res.json({

            success: true,

            message:
                "Payment verified and subscription upgraded"

        });


    } catch (error) {

        console.error(
            "Verify payment error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Payment verification failed"

        });
    }
};