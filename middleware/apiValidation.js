// ============================================
// Validate required fields
// ============================================

exports.requireFields = (...fields) => {

    return (req, res, next) => {

        const missingFields = fields.filter(
            field =>
                req.body[field] === undefined ||
                req.body[field] === null ||
                String(req.body[field]).trim() === ""
        );


        if (missingFields.length > 0) {

            return res.status(400).json({

                success: false,

                message:
                    "Required fields are missing",

                fields:
                    missingFields

            });
        }


        next();
    };
};


// ============================================
// Validate positive integer ID
// ============================================

exports.validateIdParam = (
    parameterName
) => {

    return (req, res, next) => {

        const value =
            req.params[parameterName];


        if (
            !value ||
            !/^\d+$/.test(String(value))
        ) {

            return res.status(400).json({

                success: false,

                message:
                    `Invalid ${parameterName}`

            });
        }


        next();
    };
};