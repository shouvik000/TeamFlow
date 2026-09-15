//
// ============================================
// TEAMFLOW SHARED SOCKET.IO CONNECTION
// ============================================
//
// IMPORTANT:
// Create the socket immediately so other
// frontend scripts can use:
// window.teamFlowSocket
//

const teamFlowSocket =
    io();


// ============================================
// GLOBAL SHARED SOCKET
// ============================================

window.teamFlowSocket =
    teamFlowSocket;


// ============================================
// DOM READY
// ============================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // ========================================
        // NOTIFICATION BADGE
        // ========================================

        const badge =
            document.getElementById(
                "notificationBadge"
            );


        // ========================================
        // LOAD UNREAD NOTIFICATION COUNT
        // ========================================

        async function loadUnreadNotifications() {

            try {

                const response =
                    await fetch(
                        "/notifications/unread-count",
                        {
                            method: "GET",

                            headers: {
                                "Accept":
                                    "application/json"
                            },

                            credentials:
                                "same-origin"
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        `Notification request failed: ${response.status}`
                    );

                }


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
        // UPDATE BADGE
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
        // NEW NOTIFICATION
        // ========================================

        teamFlowSocket.on(
            "notification:new",

            (notification) => {

                console.log(
                    "🔔 Real-time notification received:",
                    notification
                );


                loadUnreadNotifications();


                showNotificationToast(
                    notification
                );

            }
        );


        // ========================================
        // REFRESH NOTIFICATION COUNT
        // ========================================

        teamFlowSocket.on(
            "notification:refresh",

            () => {

                console.log(
                    "🔄 Refreshing notification count"
                );


                loadUnreadNotifications();

            }
        );


        // ========================================
        // SOCKET CONNECTED
        // ========================================

        teamFlowSocket.on(
            "connect",

            () => {

                console.log(
                    "🔌 Shared Socket.IO connected:",
                    teamFlowSocket.id
                );


                console.log(
                    "✅ TeamFlow real-time connection ready"
                );

            }
        );


        // ========================================
        // SOCKET DISCONNECTED
        // ========================================

        teamFlowSocket.on(
            "disconnect",

            (reason) => {

                console.log(
                    "🔌 Shared Socket.IO disconnected:",
                    reason
                );

            }
        );


        // ========================================
        // SOCKET CONNECTION ERROR
        // ========================================

        teamFlowSocket.on(
            "connect_error",

            (error) => {

                console.error(
                    "❌ Shared Socket.IO connection error:",
                    error
                );

            }
        );


        // ========================================
        // NOTIFICATION TOAST
        // ========================================

        function showNotificationToast(
            notification
        ) {

            if (!notification) {

                return;

            }


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
                    🔔 ${escapeHtml(
                        notification.title
                    )}
                </strong>

                <div class="small mt-1">

                    ${escapeHtml(
                        notification.message
                    )}

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
        // HTML ESCAPING
        // ========================================

        function escapeHtml(
            value
        ) {

            if (
                value === null ||
                value === undefined
            ) {

                return "";

            }


            const div =
                document.createElement(
                    "div"
                );


            div.textContent =
                String(value);


            return div.innerHTML;

        }


        // ========================================
        // INITIAL UNREAD COUNT
        // ========================================

        loadUnreadNotifications();

    }
);