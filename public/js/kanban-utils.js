// ============================================
// public/js/kanban-utils.js
// Shared state + helper functions for the Kanban board
// ============================================

window.socket = window.teamFlowSocket;

window.taskModal = new bootstrap.Modal(
    document.getElementById("taskModal")
);

window.addTaskModal = new bootstrap.Modal(
    document.getElementById("addTaskModal")
);

window.draggedCard = null;
window.isDragging = false;


// ============================================
// ESCAPE HTML
// ============================================

function escapeHtml(value){

    if(value === null || value === undefined){
        return "";
    }

    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

}


// ============================================
// PRIORITY COLOR HELPER
// ============================================

function getPriorityColor(priority){

    return {
        LOW:"success",
        MEDIUM:"secondary",
        HIGH:"warning",
        URGENT:"danger"
    }[priority] || "secondary";

}


// ============================================
// GET ASSIGNEE INITIALS
// ============================================

function getAssigneeInitials(name){

    return (name || "U")
        .split(" ")
        .filter(Boolean)
        .map(n => n[0])
        .join("")
        .substring(0,2)
        .toUpperCase();

}


// ============================================
// SAFE TASK DATA PARSING
// ============================================

function getTaskData(wrapper){

    try{
        return JSON.parse(wrapper.dataset.task);
    }catch(error){
        console.error("Malformed task data:", error);
        return null;
    }

}


// ============================================
// UPDATE COLUMN COUNTS
// ============================================

function updateCounts(){

    const total = document.querySelectorAll(".task-wrapper").length;

    document.querySelectorAll(".board-column").forEach(column=>{

        const visible = [...column.querySelectorAll(".task-wrapper")]
            .filter(task => task.style.display !== "none");

        const countElement = column.querySelector(".task-count");

        if(countElement){
            countElement.textContent = visible.length;
        }

        const empty = column.querySelector(".empty-column");

        if(empty){
            empty.style.display = visible.length === 0 ? "block" : "none";
        }

        const fill = column.querySelector(".column-progress-fill");

        if(fill){
            fill.style.width = total
                ? `${visible.length / total * 100}%`
                : "0%";
        }

    });

}
