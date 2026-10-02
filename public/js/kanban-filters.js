// ============================================
// public/js/kanban-filters.js
// Search + Filter + Sort
// ============================================


// ============================================
// KANBAN PREFERENCE STORAGE
// ============================================

const KANBAN_PREFERENCES_KEY = "teamflow_kanban_preferences";


// Load saved preferences
function loadKanbanPreferences() {

    try {

        const saved =
            localStorage.getItem(
                KANBAN_PREFERENCES_KEY
            );

        if (!saved) {
            return {};
        }

        return JSON.parse(saved) || {};

    } catch (error) {

        console.error(
            "Failed to load Kanban preferences:",
            error
        );

        return {};

    }

}


// Save preferences
function saveKanbanPreferences(preferences) {

    try {

        localStorage.setItem(
            KANBAN_PREFERENCES_KEY,
            JSON.stringify(preferences)
        );

    } catch (error) {

        console.error(
            "Failed to save Kanban preferences:",
            error
        );

    }

}


// ============================================
// APPLY FILTERS
// ============================================

function applyKanbanFilters(){

    const searchElement =
        document.getElementById("kanbanSearch");

    const priorityElement =
        document.getElementById("priorityFilter");

    const assigneeElement =
        document.getElementById("assigneeFilter");

    const sortElement =
        document.getElementById("sortTasks");


    const search =
        searchElement
            ? searchElement.value.toLowerCase()
            : "";

    const priority =
        priorityElement
            ? priorityElement.value
            : "";

    const assignee =
        assigneeElement
            ? assigneeElement.value
            : "";

    const sort =
        sortElement
            ? sortElement.value
            : "";


    document.querySelectorAll(".task-list").forEach(taskList=>{

        const wrappers =
            Array.from(
                taskList.querySelectorAll(
                    ".task-wrapper"
                )
            );


        wrappers.forEach(wrapper=>{

            const task =
                getTaskData(wrapper);


            if(!task){

                wrapper.style.display = "none";

                return;

            }


            const title =
                (task.title || "").toLowerCase();


            const description =
                (task.description || "").toLowerCase();


            const taskAssignee =
                task.assignee_name || "";


            const matchesSearch =
                title.includes(search) ||
                description.includes(search);


            const matchesPriority =
                !priority ||
                task.priority === priority;


            const matchesAssignee =
                !assignee ||
                taskAssignee === assignee;


            wrapper.style.display =
                matchesSearch &&
                matchesPriority &&
                matchesAssignee
                    ? ""
                    : "none";

        });


        // ========================================
        // SORT
        // ========================================

        wrappers.sort((a,b)=>{

            const taskA =
                getTaskData(a) || {id:0};


            const taskB =
                getTaskData(b) || {id:0};


            if(sort === "oldest"){

                return taskA.id - taskB.id;

            }


            if(sort === "due"){

                const dueA =
                    taskA.due_date
                        ? new Date(taskA.due_date)
                        : new Date("9999-12-31");


                const dueB =
                    taskB.due_date
                        ? new Date(taskB.due_date)
                        : new Date("9999-12-31");


                return dueA - dueB;

            }


            // Default: newest first
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

function handleFilterChange(){

    applyKanbanFilters();


    saveKanbanPreferences({

        search:
            document.getElementById(
                "kanbanSearch"
            )?.value || "",

        priority:
            document.getElementById(
                "priorityFilter"
            )?.value || "",

        assignee:
            document.getElementById(
                "assigneeFilter"
            )?.value || "",

        sort:
            document.getElementById(
                "sortTasks"
            )?.value || ""

    });

}


// ============================================
// ATTACH FILTER EVENTS
// ============================================

[
    "kanbanSearch",
    "priorityFilter",
    "assigneeFilter",
    "sortTasks"

].forEach(id=>{

    const element =
        document.getElementById(id);


    if(!element){
        return;
    }


    element.addEventListener(
        "input",
        handleFilterChange
    );


    element.addEventListener(
        "change",
        handleFilterChange
    );

});


// ============================================
// RESTORE FILTER PREFERENCES
// ============================================

const prefs =
    loadKanbanPreferences();


if(prefs.search){

    const searchElement =
        document.getElementById(
            "kanbanSearch"
        );

    if(searchElement){
        searchElement.value =
            prefs.search;
    }

}


if(prefs.priority){

    const priorityElement =
        document.getElementById(
            "priorityFilter"
        );

    if(priorityElement){
        priorityElement.value =
            prefs.priority;
    }

}


if(prefs.assignee){

    const assigneeElement =
        document.getElementById(
            "assigneeFilter"
        );

    if(assigneeElement){
        assigneeElement.value =
            prefs.assignee;
    }

}


if(prefs.sort){

    const sortElement =
        document.getElementById(
            "sortTasks"
        );

    if(sortElement){
        sortElement.value =
            prefs.sort;
    }

}


// ============================================
// INITIAL FILTER APPLICATION
// ============================================

applyKanbanFilters();