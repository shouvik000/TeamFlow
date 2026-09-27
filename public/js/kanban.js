// ============================================
// public/js/kanban.js
// Bootstrap: wires everything up on page load
// ============================================

document.querySelectorAll(".task-wrapper").forEach(attachTaskEvents);

updateCounts();
applyKanbanFilters();

document.getElementById("addTaskModal").addEventListener("hidden.bs.modal", ()=>{
    document.getElementById("kanbanTaskForm").reset();
    document.getElementById("newTaskStatus").value = "";
});
// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener("keydown",(event)=>{

    // Ignore shortcuts while typing
    if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)){
        return;
    }

    // N → New Task
    if(event.key.toLowerCase()==="n"){
        event.preventDefault();

        document.getElementById("kanbanTaskForm").reset();
        document.getElementById("newTaskStatus").value="TODO";

        addTaskModal.show();
    }

    // / → Focus Search
    if(event.key==="/"){
        event.preventDefault();

        document.getElementById("kanbanSearch").focus();
    }

    // Esc → Close open modals
    if(event.key==="Escape"){

        const taskModalEl=document.getElementById("taskModal");
        const addModalEl=document.getElementById("addTaskModal");

        const taskInstance=bootstrap.Modal.getInstance(taskModalEl);
        const addInstance=bootstrap.Modal.getInstance(addModalEl);

        taskInstance?.hide();
        addInstance?.hide();
    }

});