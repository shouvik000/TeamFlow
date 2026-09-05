

exports.isAuthenticated = (req, res, next) => {

    if (!req.session || !req.session.user) {

        return res.redirect("/auth/login");

    }

    next();
};