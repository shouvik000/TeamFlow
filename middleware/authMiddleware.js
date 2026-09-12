
// ============================================
// Web Authentication
// ============================================

exports.isAuthenticated = (req, res, next) => {

    if (
        !req.session ||
        !req.session.user
    ) {

        return res.redirect(
            "/auth/login"
        );
    }


    next();
};


// ============================================
// API Authentication
// ============================================

exports.isApiAuthenticated = (
    req,
    res,
    next
) => {

    if (
        !req.session ||
        !req.session.user
    ) {

        return res.status(401).json({

            success: false,

            message:
                "Authentication required"

        });
    }


    next();
};