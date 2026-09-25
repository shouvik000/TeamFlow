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