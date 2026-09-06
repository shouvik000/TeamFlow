


const express = require("express");

const router = express.Router();

const projectController =
    require("../controllers/projectController");

const {
    isAuthenticated
} = require("../middleware/authMiddleware");

const {
    loadOrganization
} = require("../middleware/tenantMiddleware");



// Project routes


router.get(
    "/",
    isAuthenticated,
    loadOrganization,
    projectController.getProjects
);


router.get(
    "/create",
    isAuthenticated,
    loadOrganization,
    projectController.showCreateProject
);


router.post(
    "/create",
    isAuthenticated,
    loadOrganization,
    projectController.createProject
);


module.exports = router;