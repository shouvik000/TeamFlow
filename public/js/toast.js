

// public/js/toast.js

window.showToast = function(message,type="success"){

    const colors={
        success:"bg-success",
        danger:"bg-danger",
        warning:"bg-warning text-dark",
        info:"bg-primary"
    };

    const container=document.getElementById("toastContainer");

    const toast=document.createElement("div");

    toast.className=`toast align-items-center text-white ${colors[type]} border-0`;

    toast.setAttribute("role","alert");

    toast.innerHTML=`
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

    const bsToast=new bootstrap.Toast(toast,{
        delay:3000
    });

    bsToast.show();

    toast.addEventListener("hidden.bs.toast",()=>{
        toast.remove();
    });

};