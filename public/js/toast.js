// public/js/toast.js

// ============================================
// STANDARD TOAST
// ============================================

window.showToast = function (message, type = "success") {

    const colors = {
        success: "bg-success",
        danger: "bg-danger",
        warning: "bg-warning text-dark",
        info: "bg-primary"
    };

    let container = document.getElementById("toastContainer");

    // Create toast container if it does not exist
    if (!container) {

        container = document.createElement("div");

        container.id = "toastContainer";
        container.className = "toast-container position-fixed top-0 end-0 p-3";

        container.style.zIndex = "2000";

        document.body.appendChild(container);
    }

    const toast = document.createElement("div");

    toast.className =
        `toast align-items-center text-white ${colors[type] || colors.info} border-0`;

    toast.setAttribute("role", "alert");

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>

            <button
                type="button"
                class="btn-close btn-close-white me-2 m-auto"
                data-bs-dismiss="toast">
            </button>
        </div>
    `;

    container.appendChild(toast);

    const bsToast = new bootstrap.Toast(toast, {
        delay: 3000
    });

    toast.addEventListener("hidden.bs.toast", () => {
        toast.remove();
    });

    bsToast.show();
};


// ============================================
// TOAST WITH UNDO BUTTON
// ============================================

window.showUndoToast = function (message, onUndo) {

    let container = document.getElementById("toastContainer");

    if (!container) {

        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container position-fixed top-0 end-0 p-3";
        container.style.zIndex = "2000";

        document.body.appendChild(container);
    }

    const toast = document.createElement("div");

    toast.className = "toast text-bg-dark border-0";

    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <div class="toast-body flex-grow-1">${message}</div>

            <button class="btn btn-link text-white me-2 undo-btn">
                Undo
            </button>

            <button class="btn-close btn-close-white me-2"
                    data-bs-dismiss="toast">
            </button>
        </div>
    `;

    container.appendChild(toast);

    const bsToast = new bootstrap.Toast(toast, { delay: 5000 });

    toast.querySelector(".undo-btn").addEventListener("click", () => {

        bsToast.hide();
        onUndo();

    });

    toast.addEventListener("hidden.bs.toast", () => toast.remove());

    bsToast.show();

};