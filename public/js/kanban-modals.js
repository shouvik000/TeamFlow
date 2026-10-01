// ============================================
// public/js/kanban-modals.js
// Add / Edit modal logic, task card creation and updates
// ============================================

// BULK SELECTION
const selectedTasks = new Set();

// ============================================
// BOOTSTRAP MODAL INSTANCES
// ============================================

const taskModalElement = document.getElementById("taskModal");
const addTaskModalElement = document.getElementById("addTaskModal");

const taskModal = taskModalElement
    ? new bootstrap.Modal(taskModalElement)
    : null;

const addTaskModal = addTaskModalElement
    ? new bootstrap.Modal(addTaskModalElement)
    : null;


// ============================================
// INLINE TITLE EDIT BINDING
// ============================================

function bindInlineTitleEdit(wrapper, title){

    if(!title || title.dataset.inlineBound) return;

    title.dataset.inlineBound = "true";

    title.addEventListener("dblclick", (event)=>{

        event.stopPropagation();

        const current = title.textContent.trim();

        const input = document.createElement("input");

        input.className = "form-control form-control-sm";
        input.value = current;

        title.replaceWith(input);

        input.focus();
        input.select();

        let finished = false;

        const finish = async(save)=>{

            // Enter/Escape also trigger blur, so only run once
            if(finished) return;
            finished = true;

            const newValue = input.value.trim();

            const h6 = document.createElement("h6");

            h6.className = "card-title fw-semibold mb-0 editable-title";
            h6.tabIndex = 0;
            h6.title = "Click to edit";
            h6.textContent = (save && newValue) ? newValue : current;

            input.replaceWith(h6);

            // Rebind the new title element
            bindInlineTitleEdit(wrapper, h6);

            if(save && newValue && newValue !== current){
                await saveInlineTitle(wrapper, newValue);
            }

        };

        input.addEventListener("keydown", (e)=>{

            if(e.key === "Enter") finish(true);

            if(e.key === "Escape") finish(false);

        });

        input.addEventListener("blur", ()=>finish(true));

    });

}


// ============================================
// ATTACH EVENTS TO TASK
// ============================================

function attachTaskEvents(wrapper){

    // Prevent duplicate listeners on the same wrapper
    if(wrapper.dataset.eventsAttached) return;
    wrapper.dataset.eventsAttached = "true";

    const card = wrapper.querySelector(".task-card");

    if(!card){
        return;
    }


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

    bindInlineTitleEdit(wrapper, wrapper.querySelector(".editable-title"));


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

        if(!taskModal){
            console.error("Edit Task modal was not initialized.");
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
    // BULK SELECT (Ctrl / Cmd + click)
    // ========================================

    card.addEventListener("click", (event)=>{

        if(!event.ctrlKey && !event.metaKey){
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const task = getTaskData(wrapper);

        if(!task) return;

        if(selectedTasks.has(task.id)){

            selectedTasks.delete(task.id);
            card.classList.remove("border-primary");

        }else{

            selectedTasks.add(task.id);
            card.classList.add("border-primary");

        }

        updateBulkToolbar();

    });


    // ========================================
    // DRAG
    // ========================================

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

async function saveInlineTitle(wrapper, newTitle){

    const task = getTaskData(wrapper);

    if(!task || !newTitle.trim()) return;

    try{

        const response = await fetch(
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

       const responseText = await response.text();

       console.log("CREATE TASK HTTP STATUS:", response.status);
       console.log("CREATE TASK RAW RESPONSE:", responseText);

       let result;

     try {
      result = JSON.parse(responseText);
    } catch (parseError) {
    console.error("CREATE TASK JSON PARSE ERROR:", parseError);
    console.error("RAW SERVER RESPONSE:", responseText);

    alert(
        "Server returned invalid JSON.\n\n" +
        responseText.substring(0, 1000)
    );

    return;
    }

        if(!result.success){

            showToast("Update failed","danger");
            return;

        }

        updateTaskCard(wrapper, result.task);

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
// DELETE TASK WITH 5-SECOND UNDO
// ============================================

let pendingDelete = null;

async function deleteTask(wrapper){

    const task = getTaskData(wrapper);

    if(!task) return;

    const ok = await showConfirm(`Delete "${task.title}"?`);

    if(!ok) return;

    // Save original position
    const parent = wrapper.parentElement;
    const nextSibling = wrapper.nextElementSibling;

    // Remove only from UI
    wrapper.remove();
    updateCounts();
    applyKanbanFilters();

    // Cancel previous pending delete
    if(pendingDelete){
        clearTimeout(pendingDelete.timer);
    }

    const current = {
        task,
        wrapper,
        parent,
        nextSibling,
        timer: null
    };

    pendingDelete = current;

    // Show Undo toast
    showUndoToast("Task deleted", ()=>{

        clearTimeout(current.timer);

        if(nextSibling){
            parent.insertBefore(wrapper, nextSibling);
        }else{
            parent.appendChild(wrapper);
        }

        attachTaskEvents(wrapper);

        updateCounts();
        applyKanbanFilters();

        if(pendingDelete === current){
            pendingDelete = null;
        }

        showToast("Task restored","success");

    });

    // Permanently delete after 5 seconds
    current.timer = setTimeout(async()=>{

        try{

            const response = await fetch(
                `/kanban/task/${task.id}/delete`,
                {
                    method:"POST",
                    credentials:"same-origin"
                }
            );

            const result = await response.json();

            if(result.success){
                showToast("Task permanently deleted","success");
            }else{
                throw new Error(result.message);
            }

        }catch(error){

            console.error(error);

            // Restore if server delete fails
            if(nextSibling){
                parent.insertBefore(wrapper, nextSibling);
            }else{
                parent.appendChild(wrapper);
            }

            attachTaskEvents(wrapper);

            updateCounts();
            applyKanbanFilters();

            showToast("Delete failed","danger");

        }

        if(pendingDelete === current){
            pendingDelete = null;
        }

    }, 5000);

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
    const dueInfo = getDueDateInfo(task.due_date);

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
                            dueInfo
                                ? `
                                <span class="badge ${dueInfo.className} due-date-badge">
                                    📅 ${dueInfo.label}
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

        const dueInfo = getDueDateInfo(task.due_date);

        if(dueInfo){

            if(dueBadge){

                dueBadge.className = `badge ${dueInfo.className} due-date-badge`;
                dueBadge.textContent = `📅 ${dueInfo.label}`;

            }else{

                const span = document.createElement("span");

                span.className = `badge ${dueInfo.className} due-date-badge`;
                span.textContent = `📅 ${dueInfo.label}`;

                if(badge && badge.parentElement){
                    badge.parentElement.appendChild(span);
                }

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

document.querySelectorAll(".add-task-btn").forEach(button => {

    button.addEventListener("click", () => {

        if(!addTaskModal){
            console.error("Add Task modal was not initialized.");
            return;
        }

        const form = document.getElementById("kanbanTaskForm");
        const statusInput = document.getElementById("newTaskStatus");

        if(!form || !statusInput){
            console.error("Add Task form elements were not found.");
            return;
        }

        form.reset();

        statusInput.value = button.dataset.status || "TODO";

        addTaskModal.show();

    });

});


// ============================================
// CREATE NEW TASK (form submit)
// ============================================

const kanbanTaskForm = document.getElementById("kanbanTaskForm");

if (!kanbanTaskForm) {

    console.error(" kanbanTaskForm was NOT found.");

} else {

    console.log(" kanbanTaskForm found. Submit handler attached.");

    kanbanTaskForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        console.log(" CREATE TASK SUBMIT FIRED");

        const status =
            document.getElementById("newTaskStatus")?.value || "TODO";

        const title =
            document.getElementById("newTaskTitle")?.value.trim() || "";

        const description =
            document.getElementById("newTaskDescription")?.value.trim() || "";

        const priority =
            document.getElementById("newTaskPriority")?.value || "MEDIUM";

        const projectId =
            document.body.dataset.projectId;

        console.log("Create task data:", {
            projectId,
            title,
            description,
            priority,
            status
        });

        if (!projectId) {

            console.error(" Project ID is missing from <body>.");

            alert("Project ID is missing.");

            return;
        }

        if (!title) {

            alert("Task title is required.");

            return;
        }

        const createButton =
            kanbanTaskForm.querySelector(
                'button[type="submit"]'
            );

        try {

            if (createButton) {
                createButton.disabled = true;
                createButton.textContent = "Creating...";
            }

            console.log(` Sending POST /kanban/project/${Number(projectId)}/task`);

            const response = await fetch(
                `/kanban/project/${Number(projectId)}/task`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        projectId: Number(projectId),
                        title,
                        description,
                        priority,
                        status
                    })
                }
            );

            console.log(
                " Create task HTTP status:",
                response.status
            );

            const result = await response.json();

            console.log(
                " Create task response:",
                result
            );

            if (!response.ok || !result.success) {

                alert(
                    result.message ||
                    "Failed to create task."
                );

                return;
            }

            console.log(
                " Task created:",
                result.task
            );

            // Add the new task to the board
            if (
                result.task &&
                !document.querySelector(
                    `[data-task-id="${result.task.id}"]`
                )
            ) {

                const wrapper =
                    createTaskWrapper(result.task);

                const targetColumn =
                    document.querySelector(
                        `[data-status="${result.task.status}"] .task-list`
                    );

                if (targetColumn) {

                    targetColumn.prepend(wrapper);

                } else {

                    console.error(
                        " Target Kanban column not found:",
                        result.task.status
                    );

                }

                updateCounts();
                applyKanbanFilters();

            }

            if (addTaskModal) {
                addTaskModal.hide();
            }

            kanbanTaskForm.reset();

            if (typeof showToast === "function") {
                showToast(
                    "Task created successfully.",
                    "success"
                );
            } else {
                alert("Task created successfully.");
            }

        } catch (error) {

            console.error(
                " Create task error:",
                error
            );

            alert(
                "Failed to create task: " +
                error.message
            );

        } finally {

            if (createButton) {

                createButton.disabled = false;
                createButton.textContent = "Create Task";

            }

        }

    });

}


// ============================================
// SAVE TASK (edit modal)
// ============================================

document.getElementById("saveTaskButton")?.addEventListener("click", async()=>{

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


// ============================================
// BULK TOOLBAR
// ============================================

function updateBulkToolbar(){

    const toolbar = document.getElementById("bulkToolbar");

    const count = document.getElementById("selectedCount");

    if(!toolbar || !count) return;

    count.textContent = selectedTasks.size;

    toolbar.classList.toggle(
        "d-none",
        selectedTasks.size === 0
    );

}


// ============================================
// BULK HELPERS
// ============================================

function findTaskWrapperById(taskId){

    const card = document.querySelector(`[data-task-id="${taskId}"]`);

    return card ? card.closest(".task-wrapper") : null;

}

function clearBulkSelection(){

    selectedTasks.clear();

    document
        .querySelectorAll(".task-card.border-primary")
        .forEach(card=>card.classList.remove("border-primary"));

    updateBulkToolbar();

}


// ============================================
// BULK MOVE
// ============================================

[
    ["bulkMoveTodo","TODO"],
    ["bulkMoveProgress","IN_PROGRESS"],
    ["bulkMoveReview","REVIEW"],
    ["bulkMoveDone","DONE"]
].forEach(([id, status])=>{

    const button = document.getElementById(id);

    if(!button) return;

    button.addEventListener("click", async()=>{

        const ids = [...selectedTasks];

        if(ids.length === 0) return;

        const targetColumn = document.querySelector(
            `[data-status="${status}"] .task-list`
        );

        let failed = 0;

        for(const taskId of ids){

            try{

                const response = await fetch(`/kanban/task/${taskId}/move`, {

                    method:"POST",

                    headers:{
                        "Content-Type":"application/json"
                    },

                    credentials:"same-origin",

                    body:JSON.stringify({ status })

                });

                if(!response.ok){
                    throw new Error(`HTTP ${response.status}`);
                }

                const result = await response.json();

                if(result.success === false){
                    throw new Error(result.message || "Move failed");
                }

                // Update the UI only after the server confirms
                const wrapper = findTaskWrapperById(taskId);

                if(wrapper){

                    try{
                        const data = JSON.parse(wrapper.dataset.task);
                        data.status = status;
                        wrapper.dataset.task = JSON.stringify(data);
                    }catch(e){
                        console.error("Could not update task data:", e);
                    }

                    if(targetColumn){
                        targetColumn.appendChild(wrapper);
                    }

                }

            }catch(error){

                console.error("Bulk move error:", error);
                failed++;

            }

        }

        clearBulkSelection();

        updateCounts();
        applyKanbanFilters();

        if(failed > 0){
            showToast(`${failed} task(s) could not be moved`,"danger");
        }else{
            showToast("Tasks updated","success");
        }

    });

});


// ============================================
// BULK DELETE
// ============================================

const bulkDelete = document.getElementById("bulkDelete");

if(bulkDelete){

    bulkDelete.addEventListener("click", async()=>{

        const ids = [...selectedTasks];

        if(ids.length === 0) return;

        const ok = await showConfirm(
            `Delete ${ids.length} tasks?`
        );

        if(!ok) return;

        let failed = 0;

        for(const taskId of ids){

            try{

                const response = await fetch(`/kanban/task/${taskId}/delete`, {

                    method:"POST",

                    credentials:"same-origin"

                });

                if(!response.ok){
                    throw new Error(`HTTP ${response.status}`);
                }

                const result = await response.json();

                if(result.success === false){
                    throw new Error(result.message || "Delete failed");
                }

                // Remove from the UI only after the server confirms
                const wrapper = findTaskWrapperById(taskId);

                if(wrapper){
                    wrapper.remove();
                }

            }catch(error){

                console.error("Bulk delete error:", error);
                failed++;

            }

        }

        clearBulkSelection();

        updateCounts();
        applyKanbanFilters();

        if(failed > 0){
            showToast(`${failed} task(s) could not be deleted`,"danger");
        }else{
            showToast("Tasks deleted","success");
        }

    });

}