// ============================================
// public/js/kanban-filters.js
// Search + Filter + Sort
// ============================================

function applyKanbanFilters(){

    const search = document.getElementById("kanbanSearch").value.toLowerCase();
    const priority = document.getElementById("priorityFilter").value;
    const assignee = document.getElementById("assigneeFilter").value;
    const sort = document.getElementById("sortTasks").value;

    document.querySelectorAll(".task-list").forEach(taskList=>{

        const wrappers = Array.from(taskList.querySelectorAll(".task-wrapper"));

        wrappers.forEach(wrapper=>{

            const task = getTaskData(wrapper);

            if(!task){
                wrapper.style.display = "none";
                return;
            }

            const title = (task.title || "").toLowerCase();
            const description = (task.description || "").toLowerCase();
            const taskAssignee = task.assignee_name || "";

            const matchesSearch =
                title.includes(search) ||
                description.includes(search);

            const matchesPriority =
                !priority || task.priority === priority;

            const matchesAssignee =
                !assignee || taskAssignee === assignee;

            wrapper.style.display =
                matchesSearch && matchesPriority && matchesAssignee
                    ? ""
                    : "none";

        });

        wrappers.sort((a,b)=>{

            const taskA = getTaskData(a) || {id:0};
            const taskB = getTaskData(b) || {id:0};

            if(sort === "oldest"){
                return taskA.id - taskB.id;
            }

            if(sort === "due"){

                const dueA = taskA.due_date
                    ? new Date(taskA.due_date)
                    : new Date("9999-12-31");

                const dueB = taskB.due_date
                    ? new Date(taskB.due_date)
                    : new Date("9999-12-31");

                return dueA - dueB;

            }

            return taskB.id - taskA.id;

        });

        wrappers.forEach(wrapper=>{
            taskList.appendChild(wrapper);
        });

    });

    updateCounts();

}


// ============================================
// FILTER EVENTS
// ============================================

[
    "kanbanSearch",
    "priorityFilter",
    "assigneeFilter",
    "sortTasks"
].forEach(id=>{

    document.getElementById(id).addEventListener("input", applyKanbanFilters);
    document.getElementById(id).addEventListener("change", applyKanbanFilters);

});