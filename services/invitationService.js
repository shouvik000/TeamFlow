const crypto = require("crypto");



// Generate invitation token


exports.generateInvitationToken = () => {

    return crypto.randomBytes(32).toString("hex");

};



// Hash invitation token


exports.hashInvitationToken = (token) => {

    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

};