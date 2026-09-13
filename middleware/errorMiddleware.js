// ============================================
// API 404 Handler
// ============================================

exports.apiNotFound = (req, res, next) => {

    if (req.originalUrl.startsWith("/api/")) {

        return res.status(404).json({

            success: false,

            message: "API endpoint not found"

        });
    }

    next();
};


// ============================================
// Global API Error Handler
// ============================================

exports.apiErrorHandler = (err, req, res, next) => {

    console.error(
        "API Error:",
        err
    );


    if (req.originalUrl.startsWith("/api/")) {

        return res.status(
            err.statusCode || 500
        ).json({

            success: false,

            message:
                err.message ||
                "Internal server error"

        });
    }


    next(err);
};