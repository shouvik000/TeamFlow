const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "TeamFlow API",
            version: "1.0.0",
            description:
                "REST API documentation for the TeamFlow multi-tenant SaaS platform"
        },

        servers: [
            {
                url: "http://localhost:3000",
                description: "Local development server"
            }
        ],

        tags: [
            {
                name: "Projects",
                description: "Project management APIs"
            },
            {
                name: "Tasks",
                description: "Task management APIs"
            },
            {
                name: "Organizations",
                description: "Organization and member APIs"
            },
            {
                name: "Notifications",
                description: "Notification APIs"
            },
            {
                name: "Billing",
                description: "Subscription and billing APIs"
            }
        ],

        components: {

            securitySchemes: {
                sessionAuth: {
                    type: "apiKey",
                    in: "cookie",
                    name: "connect.sid"
                }
            },

            schemas: {

                Project: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            example: 1
                        },
                        name: {
                            type: "string",
                            example: "TeamFlow Project"
                        },
                        description: {
                            type: "string",
                            nullable: true,
                            example: "Project management platform"
                        },
                        status: {
                            type: "string",
                            enum: [
                                "ACTIVE",
                                "ARCHIVED"
                            ],
                            example: "ACTIVE"
                        }
                    }
                },

                Task: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            example: 1
                        },
                        project_id: {
                            type: "integer",
                            example: 1
                        },
                        title: {
                            type: "string",
                            example: "Build dashboard"
                        },
                        description: {
                            type: "string",
                            nullable: true
                        },
                        status: {
                            type: "string",
                            enum: [
                                "TODO",
                                "IN_PROGRESS",
                                "REVIEW",
                                "DONE"
                            ],
                            example: "TODO"
                        },
                        priority: {
                            type: "string",
                            enum: [
                                "LOW",
                                "MEDIUM",
                                "HIGH",
                                "URGENT"
                            ],
                            example: "MEDIUM"
                        },
                        assigned_to: {
                            type: "integer",
                            nullable: true,
                            example: 8
                        },
                        due_date: {
                            type: "string",
                            format: "date",
                            nullable: true,
                            example: "2026-09-20"
                        }
                    }
                },

                Organization: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            example: 7
                        },
                        name: {
                            type: "string",
                            example: "TextGpt"
                        },
                        role: {
                            type: "string",
                            enum: [
                                "OWNER",
                                "ADMIN",
                                "MEMBER",
                                "VIEWER"
                            ],
                            example: "MEMBER"
                        }
                    }
                },

                Notification: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            example: 1
                        },
                        type: {
                            type: "string",
                            example: "TASK_ASSIGNED"
                        },
                        title: {
                            type: "string",
                            example: "New Task Assigned"
                        },
                        message: {
                            type: "string",
                            example: "You were assigned a new task"
                        },
                        is_read: {
                            type: "boolean",
                            example: false
                        }
                    }
                },

                Error: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            example: false
                        },
                        message: {
                            type: "string",
                            example: "Resource not found"
                        }
                    }
                }
            }
        }
    },

    apis: [
        "./routes/api/*.js"
    ],

    failOnErrors: true
};

module.exports =
    swaggerJsdoc(options);