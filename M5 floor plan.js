
document.addEventListener("DOMContentLoaded", function () {

    const floor1 = document.getElementById("M5_floor_1_svg");
    const floor2 = document.getElementById("M5_floor_2_svg");

    const first_btn = document.getElementById("first");
    const second_btn = document.getElementById("second");
    const close_btn = document.getElementById("close");

    const details = document.getElementById("detail_container");

    const buildingNo = document.getElementById("building-no");
    const roomNo = document.getElementById("room-no");
    const profName = document.getElementById("prof-name");
    const profEmail = document.getElementById("prof-email");

    let selectedRoom = null;

    function deselectRoom() {

        if (selectedRoom !== null) {

            selectedRoom.classList.remove("selected");

            selectedRoom = null;
        }

        details.style.display = "none";

    }

    first_btn.addEventListener("click", function () {

        deselectRoom();

        floor1.style.display = "block";
        floor2.style.display = "none";

    });

    second_btn.addEventListener("click", function () {

        deselectRoom();

        floor1.style.display = "none";
        floor2.style.display = "block";

    });

    close_btn.addEventListener("click", function () {

        deselectRoom();

    });

    function initializeFloor(svgObject) {

        svgObject.addEventListener("load", function () {

            const svgDocument = svgObject.contentDocument;

            const rooms = svgDocument.querySelectorAll('g[id*="-"]');

            rooms.forEach(function (room) {

                room.style.cursor = "pointer";

                room.addEventListener("click", function (event) {

                    event.stopPropagation();

                    if (selectedRoom === room) {

                        deselectRoom();

                        return;

                    }

                    deselectRoom();

                    room.classList.add("selected");

                    selectedRoom = room;

                    details.style.display = "block";

                    const roomParts = room.id.split("-");

                    buildingNo.textContent =
                        roomParts[0] || "Not available";

                    roomNo.textContent =
                        roomParts[1] || "Not available";

                    profName.textContent = "Not available";

                    profEmail.textContent = "Not available";

                });

            });

        });

    }

    initializeFloor(floor1);

    initializeFloor(floor2);

});
