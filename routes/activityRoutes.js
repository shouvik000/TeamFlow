



router.get(
    "/recent",
    requireAuth,
    activityController.getRecentActivities
);