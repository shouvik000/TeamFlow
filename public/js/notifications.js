// ============================================================
// TEAMFLOW SHARED SOCKET.IO NOTIFICATION CLIENT
// ============================================================
//
// IMPORTANT:
// This file creates ONE shared Socket.IO connection.
//
// Other frontend files should use:
//
//     window.teamFlowSocket
//
// Do NOT create another io() connection on individual pages.
// ============================================================


// ============================================================
// CREATE SHARED SOCKET IMMEDIATELY
// ============================================================

const teamFlowSocket = io();


// ============================================================
// EXPOSE SOCKET GLOBALLY
// ============================================================

window.teamFlowSocket = teamFlowSocket;


// ============================================================
// GLOBAL NOTIFICATION HELPERS
// ============================================================


// ------------------------------------------------------------
// Get notification badge
// ------------------------------------------------------------

function getNotificationBadge() {

    return document.getElementById(
        "notificationBadge"
    );

}


// ------------------------------------------------------------
// Update notification badge
// ------------------------------------------------------------

function updateNotificationBadge(
    count
) {

    const badge =
        getNotificationBadge();


    if (!badge) {

        return;
    }


    const numericCount =
        Number(count) || 0;


    if (
        numericCount > 0
    ) {

        badge.textContent =
            numericCount > 99
                ? "99+"
                : numericCount;


        badge.style.display =
            "inline-block";

    } else {

        badge.textContent =
            "0";


        badge.style.display =
            "none";
    }

}


// ------------------------------------------------------------
// Load unread notification count
// ------------------------------------------------------------

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
                        "same-origin",

                    cache:
                        "no-store"
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
            !data ||
            data.success !== true
        ) {

            return;
        }


        updateNotificationBadge(
            data.count
        );


    } catch (error) {

        console.error(
            "❌ Failed to load notification count:",
            error
        );
    }

}


// ------------------------------------------------------------
// Make badge refresh available globally
// ------------------------------------------------------------

window.refreshTeamFlowNotificationBadge =
    loadUnreadNotifications;


// ------------------------------------------------------------
// Make badge updater available globally
// ------------------------------------------------------------

window.updateTeamFlowNotificationBadge =
    updateNotificationBadge;


// ============================================================
// TOAST SYSTEM
// ============================================================


// ------------------------------------------------------------
// Escape HTML
// ------------------------------------------------------------

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


// ------------------------------------------------------------
// Show notification toast
// ------------------------------------------------------------

function showNotificationToast(
    notification
) {

    if (
        !notification
    ) {

        return;
    }


    // --------------------------------------------
    // Create toast container
    // --------------------------------------------

    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        "teamflow-notification-toast";


    toast.style.position =
        "fixed";


    toast.style.top =
        "20px";


    toast.style.right =
        "20px";


    toast.style.zIndex =
        "99999";


    toast.style.width =
        "360px";


    toast.style.maxWidth =
        "calc(100vw - 40px)";


    toast.style.background =
        "#ffffff";


    toast.style.border =
        "1px solid #dee2e6";


    toast.style.borderRadius =
        "12px";


    toast.style.boxShadow =
        "0 10px 30px rgba(0,0,0,0.15)";


    toast.style.padding =
        "16px";


    toast.style.fontFamily =
        "Arial, sans-serif";


    // --------------------------------------------
    // Toast content
    // --------------------------------------------

    toast.innerHTML = `

        <div
            style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:12px;
                margin-bottom:8px;
            "
        >

            <strong
                style="
                    font-size:15px;
                    color:#212529;
                "
            >
                🔔 ${escapeHtml(
                    notification.title ||
                    "New Notification"
                )}
            </strong>


            <button
                type="button"
                class="teamflow-toast-close"
                style="
                    border:none;
                    background:transparent;
                    font-size:20px;
                    line-height:1;
                    cursor:pointer;
                    color:#6c757d;
                "
            >
                ×
            </button>

        </div>


        <div
            style="
                font-size:14px;
                line-height:1.5;
                color:#6c757d;
            "
        >
            ${escapeHtml(
                notification.message ||
                "You have a new notification."
            )}
        </div>

    `;


    // --------------------------------------------
    // Close button
    // --------------------------------------------

    const closeButton =
        toast.querySelector(
            ".teamflow-toast-close"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {

                removeToast(
                    toast
                );

            }
        );
    }


    // --------------------------------------------
    // Add to page
    // --------------------------------------------

    document.body.appendChild(
        toast
    );


    // --------------------------------------------
    // Auto remove
    // --------------------------------------------

    const timeout =
        setTimeout(
            () => {

                removeToast(
                    toast
                );

            },
            5000
        );


    // Save timeout on element
    toast.dataset.timeoutId =
        String(timeout);

}


// ------------------------------------------------------------
// Remove toast
// ------------------------------------------------------------

function removeToast(
    toast
) {

    if (
        !toast
    ) {

        return;
    }


    const timeoutId =
        toast.dataset.timeoutId;


    if (timeoutId) {

        clearTimeout(
            Number(timeoutId)
        );
    }


    toast.style.opacity =
        "0";


    toast.style.transform =
        "translateX(20px)";


    toast.style.transition =
        "all 0.25s ease";


    setTimeout(
        () => {

            if (
                toast.parentNode
            ) {

                toast.remove();
            }

        },
        250
    );

}


// ============================================================
// DOM READY
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {


        // ====================================================
        // INITIAL BADGE LOAD
        // ====================================================

        loadUnreadNotifications();


        // ====================================================
        // SOCKET CONNECTED
        // ====================================================

        teamFlowSocket.on(
            "connect",
            () => {

                console.log(
                    "🔌 TeamFlow Socket.IO connected:",
                    teamFlowSocket.id
                );


                console.log(
                    "✅ TeamFlow real-time notification system ready"
                );


                // Refresh badge after reconnect
                loadUnreadNotifications();

            }
        );


        // ====================================================
        // NEW NOTIFICATION
        // ====================================================

        teamFlowSocket.on(
            "notification:new",
            async (
                notification
            ) => {

                console.log(
                    "🔔 Real-time notification received:",
                    notification
                );


                // --------------------------------------------
                // Show toast
                // --------------------------------------------

                showNotificationToast(
                    notification
                );


                // --------------------------------------------
                // Refresh server-side unread count
                // --------------------------------------------

                await loadUnreadNotifications();


                // --------------------------------------------
                // Tell other page scripts that a new
                // notification arrived.
                //
                // Example:
                // notifications/index.ejs can listen for:
                //
                // teamFlowSocket.on(
                //     "notification:new",
                //     ...
                // );
                // --------------------------------------------

            }
        );


        // ====================================================
        // NOTIFICATION COUNT REFRESH
        // ====================================================

        teamFlowSocket.on(
            "notification:refresh",
            () => {

                console.log(
                    "🔄 Notification badge refresh requested"
                );


                loadUnreadNotifications();

            }
        );


        // ====================================================
        // SOCKET DISCONNECTED
        // ====================================================

        teamFlowSocket.on(
            "disconnect",
            (
                reason
            ) => {

                console.log(
                    "🔌 TeamFlow Socket.IO disconnected:",
                    reason
                );

            }
        );


        // ====================================================
        // SOCKET CONNECTION ERROR
        // ====================================================

        teamFlowSocket.on(
            "connect_error",
            (
                error
            ) => {

                console.error(
                    " TeamFlow Socket.IO connection error:",
                    error
                );

            }
        );

    }
);