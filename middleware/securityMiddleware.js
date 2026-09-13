const helmet = require("helmet");

const {
    rateLimit
} = require("express-rate-limit");


// ============================================
// Security Headers
// ============================================

const securityHeaders = helmet({

    // Keep CSP disabled for now because
    // TeamFlow currently uses Bootstrap,
    // Swagger UI and Razorpay CDN resources.
    contentSecurityPolicy: false

});


// ============================================
// General API Rate Limit
// 100 requests / 15 minutes / IP
// ============================================

const apiRateLimiter = rateLimit({

    windowMs:
        15 * 60 * 1000,

    limit:
        100,

    standardHeaders:
        "draft-8",

    legacyHeaders:
        false,

    message: {

        success: false,

        message:
            "Too many API requests. Please try again later."

    }

});


// ============================================
// Authentication Rate Limit
// 20 requests / 15 minutes / IP
// ============================================

const authRateLimiter = rateLimit({

    windowMs:
        15 * 60 * 1000,

    limit:
        20,

    standardHeaders:
        "draft-8",

    legacyHeaders:
        false,

    message: {

        success: false,

        message:
            "Too many authentication attempts. Please try again later."

    }

});


module.exports = {

    securityHeaders,

    apiRateLimiter,

    authRateLimiter

};