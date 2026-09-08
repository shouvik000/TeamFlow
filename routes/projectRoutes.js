


const express = require("express");

const router = express.Router();

const ROLES = require("../utils/roles");

const projectController =
    require("../controllers/projectController");

const {
    isAuthenticated
} = require("../middleware/authMiddleware");

const {
    loadOrganization,
    requireRole
} = require("../middleware/tenantMiddleware");



// View projects
// OWNER / ADMIN / MEMBER / VIEWER


router.get(
    "/",
    isAuthenticated,
    loadOrganization,
    projectController.getProjects
);



/*
Create project page
// OWNER / ADMIN

*/


router.get(
    "/create",
    isAuthenticated,
    loadOrganization,
    requireRole(
        ROLES.OWNER,
        ROLES.ADMIN
    ),
    projectController.showCreateProject
);



// Create project
// OWNER / ADMIN


router.post(
    "/create",
    isAuthenticated,
    loadOrganization,
    requireRole("OWNER", "ADMIN"),
    projectController.createProject
);


module.exports = router;