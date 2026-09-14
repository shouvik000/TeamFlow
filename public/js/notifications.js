

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // ========================================
        // Connect to Socket.IO
        // ========================================

        const socket =
            io();


        const badge =
            document.getElementById(
                "notificationBadge"
            );


        // ========================================
        // Load current unread count
        // ========================================

        async function loadUnreadNotifications() {

            try {

                const response =
                    await fetch(
                        "/notifications/unread-count"
                    );


                const data =
                    await response.json();


                if (
                    !badge ||
                    !data.success
                ) {

                    return;

                }


                updateBadge(
                    data.count
                );

            } catch (error) {

                console.error(
                    "Failed to load notification count:",
                    error
                );

            }

        }


        // ========================================
        // Update badge
        // ========================================

        function updateBadge(
            count
        ) {

            if (!badge) {

                return;

            }


            if (
                count &&
                Number(count) > 0
            ) {

                badge.textContent =
                    count;

                badge.style.display =
                    "inline-block";

            } else {

                badge.textContent =
                    "0";

                badge.style.display =
                    "none";

            }

        }


        // ========================================
        // New notification
        // ========================================

        socket.on(
            "notification:new",
            (notification) => {

                console.log(
                    "Real-time notification received:",
                    notification
                );


                loadUnreadNotifications();


                showNotificationToast(
                    notification
                );

            }
        );


        // ========================================
        // Refresh unread count
        // ========================================

        socket.on(
            "notification:refresh",
            () => {

                loadUnreadNotifications();

            }
        );


        // ========================================
        // Socket connected
        // ========================================

        socket.on(
            "connect",
            () => {

                console.log(
                    "Socket.IO connected:",
                    socket.id
                );

            }
        );


        // ========================================
        // Socket disconnected
        // ========================================

        socket.on(
            "disconnect",
            (reason) => {

                console.log(
                    "Socket.IO disconnected:",
                    reason
                );

            }
        );


        // ========================================
        // Notification toast
        // ========================================

        function showNotificationToast(
            notification
        ) {

            const toast =
                document.createElement(
                    "div"
                );


            toast.className =
                "position-fixed top-0 end-0 m-3 alert alert-info shadow";


            toast.style.zIndex =
                "9999";


            toast.innerHTML = `

                <strong>
                    🔔 ${escapeHtml(notification.title)}
                </strong>

                <div class="small mt-1">
                    ${escapeHtml(notification.message)}
                </div>

            `;


            document.body.appendChild(
                toast
            );


            setTimeout(
                () => {

                    toast.remove();

                },
                5000
            );

        }


        // ========================================
        // Basic HTML escaping
        // ========================================

        function escapeHtml(
            value
        ) {

            const div =
                document.createElement(
                    "div"
                );


            div.textContent =
                value || "";


            return div.innerHTML;

        }


        // ========================================
        // Initial count
        // ========================================

        loadUnreadNotifications();

    }
);