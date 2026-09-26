
// ============================================
// public/js/kanban-drag.js
// Drag & Drop between board columns
// ============================================

document.querySelectorAll(".board-column").forEach(column => {

    // DRAG OVER
    column.addEventListener("dragover", event => {

        event.preventDefault();

        column.classList.add("drag-over");

    });


    // DRAG LEAVE
    column.addEventListener("dragleave", () => {

        column.classList.remove("drag-over");

    });


    // DROP
    column.addEventListener("drop", async () => {

        column.classList.remove("drag-over");


        // No dragged card
        if (!draggedCard) {
            return;
        }


        // Get task wrapper
        const wrapper =
            draggedCard.closest(".task-wrapper");

        if (!wrapper) {
            return;
        }


        // Get task data
        const task =
            getTaskData(wrapper);

        if (!task) {
            return;
        }


        // Store previous status
        const previousStatus =
            task.status;


        // Get new status
        const newStatus =
            column.dataset.status;


        // Same column
        if (previousStatus === newStatus) {
            return;
        }


        // ============================================
        // UPDATE UI FIRST
        // ============================================

        task.status =
            newStatus;


        wrapper.dataset.task =
            JSON.stringify(task);


        // ============================================
        // LOCK CARD WHILE SAVING
        // ============================================

        draggedCard.classList.add("saving");


        const targetColumn =
            column.querySelector(".task-list");


        if (targetColumn) {

            targetColumn.appendChild(wrapper);

        }


        // ============================================
        // SMALL MOVE ANIMATION
        // ============================================

        wrapper.animate(
            [
                {
                    transform: "scale(.96)",
                    opacity: .6
                },
                {
                    transform: "scale(1)",
                    opacity: 1
                }
            ],
            {
                duration: 180
            }
        );


        // Update column counts
        updateCounts();


        // ============================================
        // SAVE TO SERVER
        // ============================================

        try {

            const response =
                await fetch(
                    `/kanban/task/${task.id}/move`,
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials:
                            "same-origin",

                        body:
                            JSON.stringify({
                                status:
                                    newStatus
                            })
                    }
                );


            // HTTP error
            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }


            // Read response
            const result =
                await response.json();


            // Server returned error
            if (!result.success) {

                throw new Error(
                    result.message
                );

            }


            // ============================================
            // SUCCESS
            // ============================================

            showToast(
                "Task moved.",
                "info"
            );


            // Remove saving state
            draggedCard.classList.remove(
                "saving"
            );


        } catch (error) {

            console.error(
                "Move task error:",
                error
            );


            // ============================================
            // ROLLBACK
            // ============================================

            // Remove saving state
            draggedCard.classList.remove(
                "saving"
            );


            // Restore previous status
            task.status =
                previousStatus;


            wrapper.dataset.task =
                JSON.stringify(task);


            // Find previous column
            const previousColumn =
                document.querySelector(
                    `[data-status="${previousStatus}"] .task-list`
                );


            // Move card back
            if (previousColumn) {

                previousColumn.appendChild(
                    wrapper
                );

            }


            // Update counts
            updateCounts();


            // Show error
            showToast(
                "Move failed.",
                "danger"
            );

        }

    });

});


let draggedCard = null;
let isDragging = false;


// ============================================
// AUTO SCROLL WHILE DRAGGING
// ============================================

function autoScrollBoard(event){

    if(!isDragging) return;

    const edge = 120;
    const speed = 18;

    const x = event.clientX;

    if(x > window.innerWidth - edge){

        window.scrollBy({
            left:speed,
            behavior:"auto"
        });

    }else if(x < edge){

        window.scrollBy({
            left:-speed,
            behavior:"auto"
        });

    }

}


card.addEventListener("dragstart",()=>{

    draggedCard = card;
    isDragging = true;

    card.classList.add("dragging");

    document.addEventListener(
        "dragover",
        autoScrollBoard
    );

});








card.addEventListener("dragend",()=>{

    card.classList.remove("dragging");

    document.removeEventListener(
        "dragover",
        autoScrollBoard
    );

    setTimeout(()=>{
        isDragging = false;
        draggedCard = null;
    },100);

});




