const crypto = require("crypto");

const pool = require("../config/db");

const razorpay =
    require("../config/razorpay");

const {
    getOrganizationBillingInfo,
    changeOrganizationPlan
} = require("../services/subscriptionService");

const {
    createActivityLog
} = require("../services/activityService");


// ============================================
// Get all subscription plans
// GET /api/billing/plans
// ============================================

exports.getPlans = async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT
                id,
                name,
                price_monthly,
                max_projects,
                max_members,
                max_tasks,
                created_at

            FROM plans

            ORDER BY price_monthly ASC
            `
        );


        const billing =
            await getOrganizationBillingInfo(
                req.session.user.organizationId
            );


        if (!billing) {

            return res.status(404).json({

                success: false,

                message:
                    "Subscription not found"

            });
        }


        res.status(200).json({

            success: true,

            plans:
                result.rows,

            currentSubscription:
                billing.subscription,

            usage:
                billing.usage

        });

    } catch (error) {

        console.error(
            "API get billing plans error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load subscription plans"

        });
    }
};


// ============================================
// Get current billing information
// GET /api/billing/current
// ============================================

exports.getCurrentBilling = async (req, res) => {

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

                message:
                    "Subscription not found"

            });
        }


        res.status(200).json({

            success: true,

            subscription:
                billing.subscription,

            usage:
                billing.usage

        });

    } catch (error) {

        console.error(
            "API get current billing error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load current billing information"

        });
    }
};


// ============================================
// Get usage
// GET /api/billing/usage
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

                message:
                    "Subscription not found"

            });
        }


        res.status(200).json({

            success: true,

            subscription:
                billing.subscription,

            usage:
                billing.usage

        });

    } catch (error) {

        console.error(
            "API get billing usage error:",
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
// Create Razorpay order
// POST /api/billing/create-order
// ============================================

exports.createOrder = async (req, res) => {

    const {
        planId
    } = req.body;


    const organizationId =
        req.session.user.organizationId;


    if (!planId) {

        return res.status(400).json({

            success: false,

            message:
                "Plan ID is required"

        });
    }


    try {

        // ========================================
        // Get plan
        // ========================================

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


        if (
            planResult.rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Plan not found"

            });
        }


        const plan =
            planResult.rows[0];


        // ========================================
        // Don't purchase FREE plan
        // ========================================

        if (
            Number(plan.price_monthly) <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Cannot purchase the FREE plan"

            });
        }


        // ========================================
        // Convert INR to paise
        // ========================================

        const amountPaise =
            Math.round(
                Number(plan.price_monthly) *
                100
            );


        // ========================================
        // Create Razorpay order
        // ========================================

        const order =
            await razorpay.orders.create({

                amount:
                    amountPaise,

                currency:
                    "INR",

                receipt:
                    `tf_api_${organizationId}_${Date.now()}`,

                notes: {

                    organizationId:
                        String(organizationId),

                    planId:
                        String(plan.id)

                }

            });


        // ========================================
        // Save payment
        // ========================================

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


        res.status(201).json({

            success: true,

            message:
                "Payment order created",

            orderId:
                order.id,

            amount:
                amountPaise,

            currency:
                "INR",

            keyId:
                process.env.RAZORPAY_KEY_ID,

            plan: {

                id:
                    plan.id,

                name:
                    plan.name,

                priceMonthly:
                    plan.price_monthly

            }

        });

    } catch (error) {

        console.error(
            "API create Razorpay order error:",
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
// POST /api/billing/verify-payment
// ============================================

exports.verifyPayment = async (req, res) => {

    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    } = req.body;


    const organizationId =
        req.session.user.organizationId;


    const userId =
        req.session.user.id;


    // ========================================
    // Validate request
    // ========================================

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


    try {

        // ========================================
        // Generate expected signature
        // ========================================

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


        // ========================================
        // Verify signature
        // ========================================

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


        // ========================================
        // Find payment
        // ========================================

        const paymentResult =
            await pool.query(
                `
                SELECT

                    id,
                    organization_id,
                    plan_id,
                    status

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


        // ========================================
        // Prevent duplicate verification
        // ========================================

        if (
            payment.status === "VERIFIED"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Payment has already been verified"

            });
        }


        // ========================================
        // Update payment
        // ========================================

        await pool.query(
            `
            UPDATE payments

            SET
                razorpay_payment_id = $1,
                status = 'VERIFIED',
                updated_at =
                    CURRENT_TIMESTAMP

            WHERE id = $2
            `,
            [
                razorpay_payment_id,
                payment.id
            ]
        );


        // ========================================
        // Change subscription
        // ========================================

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


        // ========================================
        // Activity log
        // ========================================

        await createActivityLog({

            organizationId,

            userId,

            action:
                "SUBSCRIPTION_UPGRADED",

            entityType:
                "SUBSCRIPTION",

            entityId:
                subscription.id,

            description:
                `Subscription upgraded to plan ID ${payment.plan_id}`

        });


        // ========================================
        // Get updated billing
        // ========================================

        const billing =
            await getOrganizationBillingInfo(
                organizationId
            );


        res.status(200).json({

            success: true,

            message:
                "Payment verified and subscription upgraded",

            subscription:
                billing.subscription,

            usage:
                billing.usage

        });

    } catch (error) {

        console.error(
            "API verify payment error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Payment verification failed"

        });
    }
};