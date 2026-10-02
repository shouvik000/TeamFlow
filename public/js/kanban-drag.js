// ============================================
// public/js/kanban-drag.js
// Drag & Drop between board columns
// ============================================

document.querySelectorAll(".board-column").forEach(column => {

    // ============================================
    // DRAG OVER
    // ============================================

    column.addEventListener("dragover", event => {

        event.preventDefault();

        column.classList.add("drag-over");

    });


    // ============================================
    // DRAG LEAVE
    // ============================================

    column.addEventListener("dragleave", event => {

        // Only remove when actually leaving the column
        if (!column.contains(event.relatedTarget)) {
            column.classList.remove("drag-over");
        }

    });


    // ============================================
    // DROP
    // ============================================

    column.addEventListener("drop", async event => {

        event.preventDefault();

        column.classList.remove("drag-over");


        // ============================================
        // CHECK DRAGGED CARD
        // ============================================

        if (!draggedCard) {
            return;
        }


        // ============================================
        // GET TASK WRAPPER
        // ============================================

        const wrapper =
            draggedCard.closest(".task-wrapper");

        if (!wrapper) {
            return;
        }


        // ============================================
        // GET TASK DATA
        // ============================================

        const task =
            getTaskData(wrapper);

        if (!task) {
            console.error("Could not read task data.");
            return;
        }


        // ============================================
        // STORE PREVIOUS STATUS
        // ============================================

        const previousStatus =
            task.status;


        // ============================================
        // GET NEW STATUS
        // ============================================

        const newStatus =
            column.dataset.status;


        // ============================================
        // SAME COLUMN
        // ============================================

        if (previousStatus === newStatus) {
            return;
        }


        // ============================================
        // TARGET TASK LIST
        // ============================================

        const targetColumn =
            column.querySelector(".task-list");

        if (!targetColumn) {
            console.error(
                "Task list not found for column:",
                newStatus
            );
            return;
        }


        // ============================================
        // UPDATE TASK DATA
        // ============================================

        task.status =
            newStatus;


        wrapper.dataset.task =
            JSON.stringify(task);


        // ============================================
        // MOVE CARD IN UI
        // ============================================

        targetColumn.appendChild(wrapper);


        // ============================================
        // LOCK CARD WHILE SAVING
        // ============================================

        const savingCard = draggedCard;

        if (savingCard) {
            savingCard.classList.add("saving");
        }


        // ============================================
        // MOVE ANIMATION
        // ============================================

        if (wrapper.animate) {

            wrapper.animate(
                [
                    {
                        transform: "scale(.96)",
                        opacity: 0.6
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

        }


        // ============================================
        // UPDATE COUNTS
        // ============================================

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


            // ========================================
            // HTTP ERROR
            // ========================================

            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }


            // ========================================
            // READ RESPONSE
            // ========================================

            const result =
                await response.json();


            // ========================================
            // SERVER ERROR
            // ========================================

            if (!result.success) {

                throw new Error(
                    result.message ||
                    "Task move failed."
                );

            }


            // ========================================
            // SUCCESS
            // ========================================

            if (savingCard) {
                savingCard.classList.remove("saving");
            }


            showToast(
                "Task moved.",
                "info"
            );


        } catch (error) {

            console.error(
                "Move task error:",
                error
            );


            // ========================================
            // REMOVE SAVING STATE
            // ========================================

            if (savingCard) {
                savingCard.classList.remove("saving");
            }


            // ========================================
            // ROLLBACK TASK STATUS
            // ========================================

            task.status =
                previousStatus;


            wrapper.dataset.task =
                JSON.stringify(task);


            // ========================================
            // FIND PREVIOUS COLUMN
            // ========================================

            const previousColumn =
                document.querySelector(
                    `[data-status="${previousStatus}"] .task-list`
                );


            // ========================================
            // MOVE CARD BACK
            // ========================================

            if (previousColumn) {

                previousColumn.appendChild(
                    wrapper
                );

            }


            // ========================================
            // UPDATE COUNTS
            // ========================================

            updateCounts();


            // ========================================
            // SHOW ERROR
            // ========================================

            showToast(
                "Move failed.",
                "danger"
            );

        }

    });

});


// ============================================
// DRAG STATE
// ============================================
//
// IMPORTANT:
// dragstart / dragend are already attached to
// individual cards by attachTaskEvents()
// in kanban-modals.js.
//
// Therefore we ONLY keep the shared state here.
// ============================================

let draggedCard = null;
let isDragging = false;


// ============================================
// AUTO SCROLL WHILE DRAGGING
// ============================================

function autoScrollBoard(event) {

    if (!isDragging) {
        return;
    }


    const edge = 120;
    const speed = 18;

    const x = event.clientX;


    if (x > window.innerWidth - edge) {

        window.scrollBy({
            left: speed,
            behavior: "auto"
        });

    } else if (x < edge) {

        window.scrollBy({
            left: -speed,
            behavior: "auto"
        });

    }

}