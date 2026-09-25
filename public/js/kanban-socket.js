// ============================================
// public/js/kanban-socket.js
// Socket.IO realtime task events
// ============================================

if(socket){

    socket.emit("join:project", {
        organizationId: Number(document.body.dataset.organizationId),
        projectId: Number(document.body.dataset.projectId)
    });


    // ========================================
    // TASK CREATED
    // ========================================

    socket.off("task:created");

    socket.on("task:created", task=>{

        if(document.querySelector(`[data-task-id="${task.id}"]`)){
            return;
        }

        const wrapper = createTaskWrapper(task);

        const targetColumn = document.querySelector(
            `[data-status="${task.status}"] .task-list`
        );

        if(targetColumn){
            targetColumn.prepend(wrapper);
        }

        applyKanbanFilters();
        updateCounts();

    });


    // ========================================
    // TASK UPDATED
    // ========================================

    socket.off("task:updated");

    socket.on("task:updated", task=>{

        const card = document.querySelector(`[data-task-id="${task.id}"]`);

        if(!card){
            return;
        }

        const wrapper = card.closest(".task-wrapper");

        if(!wrapper){
            return;
        }

        // UPDATE CARD
        updateTaskCard(wrapper, task);

        // MOVE COLUMN
        const targetColumn = document.querySelector(
            `[data-status="${task.status}"] .task-list`
        );

        if(targetColumn && wrapper.parentElement !== targetColumn){
            targetColumn.appendChild(wrapper);
        }

        // REAPPLY FILTERS/SORT
        applyKanbanFilters();

        // UPDATE COUNTS
        updateCounts();

    });


    // ========================================
    // TASK DELETED
    // ========================================

    socket.off("task:deleted");

    socket.on("task:deleted", data=>{

        const card = document.querySelector(`[data-task-id="${data.id}"]`);

        // Already removed locally
        if(!card){
            return;
        }

        const wrapper = card.closest(".task-wrapper");

        if(wrapper){
            wrapper.remove();
            updateCounts();
        }

    });

}