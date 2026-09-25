



const confirmModal=new bootstrap.Modal(
    document.getElementById("confirmModal")
);

window.showConfirm=function(message){

    return new Promise(resolve=>{

        document.getElementById("confirmMessage").textContent=message;

        const button=document.getElementById("confirmAction");

        const handler=()=>{

            button.removeEventListener("click",handler);

            confirmModal.hide();

            resolve(true);

        };

        button.addEventListener("click",handler);

        document
        .getElementById("confirmModal")
        .addEventListener(
            "hidden.bs.modal",
            ()=>resolve(false),
            {once:true}
        );

        confirmModal.show();

    });

};