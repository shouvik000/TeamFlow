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




// ============================================
// COLLAPSE / EXPAND COLUMNS
// ============================================

document.querySelectorAll(".board-column").forEach(column=>{

    const title = column.querySelector(".column-title");
    const taskList = column.querySelector(".task-list");

    if(!title || !taskList) return;

    title.style.cursor = "pointer";

    const prefs = loadKanbanPreferences();

    if(prefs.collapsed?.includes(column.dataset.status)){

        column.classList.add("collapsed");
        taskList.style.display = "none";

        const progress = column.querySelector(".column-progress");
        if(progress){
            progress.style.display = "none";
        }

    }

    title.addEventListener("click",(event)=>{

        // Don't collapse when clicking the + button
        if(event.target.closest(".add-task-btn")){
            return;
        }

        const collapsed = column.classList.toggle("collapsed");

        taskList.style.display = collapsed ? "none" : "flex";

        const progress = column.querySelector(".column-progress");
        if(progress){
            progress.style.display = collapsed ? "none" : "block";
        }

        const collapsedColumns =
            [...document.querySelectorAll(".board-column.collapsed")]
                .map(col=>col.dataset.status);

        saveKanbanPreferences({
            collapsed:collapsedColumns
        });

    });

});









// ============================================
// KANBAN USER PREFERENCES
// ============================================

const KANBAN_PREF_KEY = `kanban-pref-${document.body.dataset.projectId}`;

function loadKanbanPreferences(){

    try{
        return JSON.parse(localStorage.getItem(KANBAN_PREF_KEY)) || {};
    }catch{
        return {};
    }

}

function saveKanbanPreferences(data){

    const current = loadKanbanPreferences();

    localStorage.setItem(
        KANBAN_PREF_KEY,
        JSON.stringify({...current,...data})
    );

}












// ============================================
// ACTIVITY PANEL
// ============================================

const activityButton =
    document.getElementById("activityButton");

if(activityButton){

    const panel =
        new bootstrap.Offcanvas(
            document.getElementById("activityPanel")
        );

    activityButton.addEventListener("click",async()=>{

        panel.show();

        const response =
            await fetch("/activities/recent");

        const activities =
            await response.json();

        document.getElementById("activityList").innerHTML =
            activities.map(activity=>`

                <div class="border-bottom pb-2 mb-2">

                    <strong>${activity.user_name}</strong>

                    <div>${activity.details}</div>

                    <small class="text-muted">
                        ${new Date(activity.created_at).toLocaleString()}
                    </small>

                </div>

            `).join("");

    });

}