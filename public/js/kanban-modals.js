

// ============================================
// public/js/kanban-modals.js
// Add / Edit modal logic, task card creation and updates
// ============================================

// ============================================
// ATTACH EVENTS TO TASK
// ============================================

function attachTaskEvents(wrapper){

    // Prevent duplicate listeners on the same wrapper
    if(wrapper.dataset.eventsAttached) return;
    wrapper.dataset.eventsAttached = "true";


    // ========================================
    // EDIT / DELETE BUTTONS
    // ========================================

    wrapper.querySelectorAll(".task-actions button").forEach(button=>{

        button.addEventListener("click", event=>{

            event.stopPropagation();

            // EDIT
            if(button.classList.contains("edit-task-btn")){
                wrapper.click();
                return;
            }

            // DELETE
            if(button.classList.contains("delete-task-btn")){
                deleteTask(wrapper);
            }

        });

    });


    // ========================================
    // INLINE TITLE EDIT
    // ========================================

    const title=wrapper.querySelector(".editable-title");

    if(title){

        title.addEventListener("click",()=>{

            const current=title.textContent;

            const input=document.createElement("input");

            input.className="form-control form-control-sm";
            input.value=current;

            title.replaceWith(input);

            input.focus();
            input.select();

            const finish=async(save)=>{

                const h6=document.createElement("h6");

                h6.className="card-title fw-semibold mb-0 editable-title";
                h6.textContent=save?input.value:current;

                input.replaceWith(h6);

                attachTaskEvents(wrapper);

                if(save && input.value!==current){

                    await saveInlineTitle(wrapper,input.value);

                }

            };

            input.addEventListener("keydown",e=>{

                if(e.key==="Enter") finish(true);

                if(e.key==="Escape") finish(false);

            });

            input.addEventListener("blur",()=>finish(true));

        });

    }


    // ========================================
    // OPEN EDIT MODAL
    // ========================================

    wrapper.addEventListener("click", ()=>{

        if(isDragging){
            return;
        }

        const task = getTaskData(wrapper);

        if(!task){
            return;
        }

        document.getElementById("editTaskId").value = task.id;
        document.getElementById("editTaskTitle").value = task.title || "";
        document.getElementById("editTaskDescription").value = task.description || "";
        document.getElementById("editTaskPriority").value = task.priority || "MEDIUM";
        document.getElementById("editTaskStatus").value = task.status || "TODO";

        document.getElementById("editTaskDueDate").value = task.due_date
            ? String(task.due_date).substring(0,10)
            : "";

        document.getElementById("editTaskAssignee").value = task.assigned_to || "";
        document.getElementById("taskModalLabel").textContent = task.title || "Task";
        document.getElementById("openTaskPage").href = `/projects/${task.project_id}/tasks`;

        taskModal.show();

    });


    // ========================================
    // DRAG
    // ========================================

    const card = wrapper.querySelector(".task-card");

    if(!card){
        return;
    }

    card.addEventListener("dragstart", ()=>{
        draggedCard = card;
        isDragging = true;
        card.classList.add("dragging");
    });

    card.addEventListener("dragend", ()=>{
        card.classList.remove("dragging");
        setTimeout(()=>{
            isDragging = false;
            draggedCard = null;
        }, 100);
    });

}


// ============================================
// SAVE INLINE TITLE EDIT
// ============================================

async function saveInlineTitle(wrapper,newTitle){

    const task=getTaskData(wrapper);

    if(!task || !newTitle.trim()) return;

    try{

        const response=await fetch(
            `/kanban/task/${task.id}/update`,
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                credentials:"same-origin",
                body:JSON.stringify({
                    ...task,
                    title:newTitle.trim()
                })
            }
        );

        const result=await response.json();

        if(!result.success){

            showToast("Update failed","danger");
            return;

        }

        updateTaskCard(wrapper,result.task);

        showToast("Title updated");

    }catch(error){

        console.error(error);
        showToast("Update failed","danger");

    }

}


// ============================================
// ENABLE/DISABLE FORM CONTROLS
// ============================================

function setFormLoading(formId, loading){

    const form = document.getElementById(formId);

    if(!form) return;

    form.querySelectorAll("input, textarea, select, button")
        .forEach(element=>{
            element.disabled = loading;
        });

}

// ============================================
// DELETE TASK
// ============================================

async function deleteTask(wrapper){

    const task = getTaskData(wrapper);

    if(!task){
        return;
    }

    const ok=await showConfirm(
    `Delete "${task.title}"?`
    );

if(!ok) return;

    try{

        const response = await fetch(`/kanban/task/${task.id}/delete`, {
            method:"POST",
            credentials:"same-origin"
        });

        if(!response.ok){
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if(!result.success){
            showToast(result.message || "Failed to delete task.","danger");
            return;
        }

        // REMOVE IMMEDIATELY
        wrapper.remove();

        // UPDATE COUNTS
        updateCounts();

        showToast("Task deleted.");

    }catch(error){
        console.error("Delete task error:", error);
        showToast("Failed to delete task.","danger");
    }

}


// ============================================
// CREATE TASK CARD
// ============================================

function createTaskWrapper(task){

    const wrapper = document.createElement("div");

    wrapper.className = "task-wrapper";
    wrapper.dataset.task = JSON.stringify(task);

    const initials = getAssigneeInitials(task.assignee_name);
    const priorityColor = getPriorityColor(task.priority);

    wrapper.innerHTML = `

        <div
            class="card mb-3 task-card border-0 shadow-sm"
            draggable="true"
            data-task-id="${task.id}"
        >

            <div class="card-body p-3">

                <div class="d-flex justify-content-between align-items-start mb-2">

                    <h6
                        class="card-title fw-semibold mb-0 editable-title"
                        tabindex="0"
                        title="Click to edit">
                         ${escapeHtml(task.title)}
                    </h6>

                    <div class="task-actions">

                        <button
                            class="btn btn-sm btn-light edit-task-btn"
                            type="button"
                            title="Edit Task"
                        >
                            ✏️
                        </button>

                        <button
                            class="btn btn-sm btn-light delete-task-btn"
                            type="button"
                            title="Delete Task"
                        >
                            🗑️
                        </button>

                    </div>

                </div>

                <p class="card-text text-muted small mb-3">
                    ${escapeHtml(task.description || "No description")}
                </p>

                <div class="d-flex justify-content-between align-items-center">

                    <div class="d-flex gap-2 align-items-center flex-wrap">

                        <span class="badge bg-${priorityColor}">
                            ${escapeHtml(task.priority)}
                        </span>

                        ${
                            task.due_date
                            ? `
                                <span class="badge bg-light text-dark border due-date-badge">
                                    📅 ${new Date(task.due_date).toLocaleDateString()}
                                </span>
                            `
                            : ""
                        }

                    </div>

                    <div
                        class="avatar-circle"
                        title="${escapeHtml(task.assignee_name || "Unassigned")}"
                    >
                        ${initials}
                    </div>

                </div>

            </div>

        </div>

    `;

    attachTaskEvents(wrapper);

    return wrapper;

}


// ============================================
// UPDATE EXISTING TASK CARD
// ============================================

function updateTaskCard(wrapper, task){

    if(!wrapper){
        return;
    }

    // SAVE NEW TASK DATA
    wrapper.dataset.task = JSON.stringify(task);

    const card = wrapper.querySelector(".task-card");

    if(!card){
        return;
    }

    const priorityColor = getPriorityColor(task.priority);
    const initials = getAssigneeInitials(task.assignee_name);

    // TITLE
    const title = card.querySelector(".card-title");

    if(title){
        title.textContent = task.title || "";
    }

    // DESCRIPTION
    const description = card.querySelector(".card-text");

    if(description){
        description.textContent = task.description || "No description";
    }

    // PRIORITY BADGE
    const badge = card.querySelector(".badge");

    if(badge){
        badge.className = `badge bg-${priorityColor}`;
        badge.textContent = task.priority;
    }

    // DUE DATE
    const dueBadge = card.querySelector(".due-date-badge");

    if(task.due_date){

        const formattedDate = new Date(task.due_date).toLocaleDateString();

        if(dueBadge){
            dueBadge.textContent = `📅 ${formattedDate}`;
        }else{

            const span = document.createElement("span");

            span.className = "badge bg-light text-dark border due-date-badge";
            span.textContent = `📅 ${formattedDate}`;

            if(badge && badge.parentElement){
                badge.parentElement.appendChild(span);
            }

        }

    }else if(dueBadge){
        dueBadge.remove();
    }

    // ASSIGNEE AVATAR
    const avatar = card.querySelector(".avatar-circle");

    if(avatar){
        avatar.textContent = initials;
        avatar.title = task.assignee_name || "Unassigned";
    }

}


// ============================================
// ADD TASK BUTTONS (open the "New Task" modal)
// ============================================

document.querySelectorAll(".add-task-btn").forEach(button=>{

    button.addEventListener("click", ()=>{

        document.getElementById("kanbanTaskForm").reset();
        document.getElementById("newTaskStatus").value = button.dataset.status;

        addTaskModal.show();

    });

});


// ============================================
// CREATE NEW TASK (form submit)
// ============================================

document.getElementById("kanbanTaskForm").addEventListener("submit", async(event)=>{

    event.preventDefault();

    const status = document.getElementById("newTaskStatus").value;
    const title = document.getElementById("newTaskTitle").value.trim();
    const description = document.getElementById("newTaskDescription").value.trim();
    const priority = document.getElementById("newTaskPriority").value;

    if(!title){
        showToast("Task title is required.","danger");
        return;
    }

   const createButton =
    document.getElementById(
        "createTaskButton"
    );

setFormLoading("kanbanTaskForm", true);

createButton.textContent = "Creating...";

    try{

        const response = await fetch("/kanban/task/create", {
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            credentials:"same-origin",
            body: JSON.stringify({ title, description, priority, status })
        });

        if(!response.ok){
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if(!result.success){
            showToast(result.message || "Failed to create task.","danger");
            return;
        }

        if(!document.querySelector(`[data-task-id="${result.task.id}"]`)){

            const wrapper = createTaskWrapper(result.task);

            const targetColumn = document.querySelector(
                `[data-status="${result.task.status}"] .task-list`
            );

            if(targetColumn){
                targetColumn.prepend(wrapper);
            }

            applyKanbanFilters();
            updateCounts();

        }

        addTaskModal.hide();
        document.getElementById("kanbanTaskForm").reset();

        showToast("Task created successfully.");

    }catch(error){
        console.error("Create task error:", error);
        showToast("Failed to create task.","danger");
    }finally{
        setFormLoading("kanbanTaskForm", false);

        createButton.textContent = "Create Task";
    }

});


// ============================================
// SAVE TASK (edit modal)
// ============================================

document.getElementById("saveTaskButton").addEventListener("click", async()=>{

    const taskId = document.getElementById("editTaskId").value;
    const saveButton = document.getElementById("saveTaskButton");

    setFormLoading("editTaskForm", true);

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try{

        const response = await fetch(`/kanban/task/${taskId}/update`, {
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            credentials:"same-origin",
            body: JSON.stringify({
                title: document.getElementById("editTaskTitle").value,
                description: document.getElementById("editTaskDescription").value,
                priority: document.getElementById("editTaskPriority").value,
                status: document.getElementById("editTaskStatus").value,
                due_date: document.getElementById("editTaskDueDate").value,
                assigned_to: document.getElementById("editTaskAssignee").value || null
            })
        });

        if(!response.ok){
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if(!result.success){
            showToast(result.message || "Failed to update task.","danger");
            return;
        }

        // CLOSE MODAL
        taskModal.hide();

        // FIND EXISTING CARD
        const card = document.querySelector(`[data-task-id="${result.task.id}"]`);

        if(!card){
            return;
        }

        const wrapper = card.closest(".task-wrapper");

        // UPDATE CARD COMPLETELY
        updateTaskCard(wrapper, result.task);

        // MOVE TO CORRECT COLUMN
        const targetColumn = document.querySelector(
            `[data-status="${result.task.status}"] .task-list`
        );

        if(targetColumn){
            targetColumn.appendChild(wrapper);
        }

        // REAPPLY FILTERS/SORT
        applyKanbanFilters();

        // UPDATE COUNTS
        updateCounts();

        showToast("Task updated.");

    }catch(error){
        console.error("Update task error:", error);
        showToast("Failed to update task.","danger");
    }finally{
        setFormLoading("editTaskForm", false);

         saveButton.disabled = false;
         saveButton.textContent = "Save Changes";
    }

});