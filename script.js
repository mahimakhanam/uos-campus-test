
var campusMap = document.getElementById("campusMap");

var buildingName = document.getElementById("buildingName");
var buildingDescription = document.getElementById("buildingDescription");

var setStart = document.getElementById("setStart");
var setDestination = document.getElementById("setDestination");

var startLocation = document.getElementById("startLocation");
var destinationLocation = document.getElementById("destinationLocation");

var routeMessage = document.getElementById("routeMessage");
var clearRoute = document.getElementById("clearRoute");

var zoomIn = document.getElementById("zoomIn");
var zoomOut = document.getElementById("zoomOut");
var resetZoom = document.getElementById("resetZoom");

// ========================================
// 1. BUILDING INFORMATION
// ========================================

var buildings = {
    "building-C7": "Library C7",
    "building-C5": "Women's Students Center C5",
    "building-C4": "Building C4",
    "building-C3": "Building C3",
    "building-C2": "Building C2",
    "building-C1": "Building C1",
    "building-A9": "Building A9 - Professors' Offices",
    "building-A8": "Building A8 - Classrooms",
    "building-A10": "Building A10",
	"building-A7":"Building A7",
    "building-A5": "Building A5",
	"building-A4": "Building A4",
    "building-A12": "Building A12",
    "building-A13": "Building A13",
    "building-B1": "Building B1",
    "building-C13": "Building C13",
    "building-C9": "Building C9",
	"building-A6":"Building A6",
	"building-A14":"Building A14",
	"building-C6":"Building C6",
	"building-C14":"Building C14",
	"building-C12":"Building C12",
};

// Building assignments come from campus-graph.json
// through graph.js.

// ========================================
// 2. SELECTED LOCATIONS
// ========================================

var selectedBuilding = null;
var startBuilding = null;
var destinationBuilding = null;
var previousSelectedElement = null;
var previousOriginalFill = null;

// ========================================
// 3. SVG ELEMENTS
// ========================================

var svgDocument = null;
var calculatedRoute = null;

// ========================================
// 4. MAP ZOOM AND DRAGGING
// ========================================

var zoomLevel = 1;
var moveX = 0;
var moveY = 0;

var isDragging = false;
var dragStarted = false;
var startX = 0;
var startY = 0;

function updateMap() {

    campusMap.style.transform =
        "translate(" + moveX + "px, " + moveY +
        "px) scale(" + zoomLevel + ")";

    campusMap.style.transformOrigin = "center center";
}

zoomIn.addEventListener("click", function () {

    zoomLevel = Math.min(zoomLevel + 0.25, 5);

    updateMap();
});

zoomOut.addEventListener("click", function () {

    zoomLevel = Math.max(zoomLevel - 0.25, 0.5);

    updateMap();
});

resetZoom.addEventListener("click", function () {

    zoomLevel = 1;
    moveX = 0;
    moveY = 0;

    updateMap();
});

// ========================================
// 5. REMOVE CALCULATED ROUTE
// ========================================

function removeCalculatedRoute() {

    if (calculatedRoute !== null) {

        calculatedRoute.remove();
        calculatedRoute = null;
    }
}

// ========================================
// 6. DRAW DIJKSTRA ROUTE
// ========================================

function drawCalculatedRoute(path) {

    if (!svgDocument || !path || path.length === 0) {
        return;
    }

    removeCalculatedRoute();

    var points = path.map(function (nodeID) {

        return nodes[nodeID].x + "," + nodes[nodeID].y;

    }).join(" ");

    calculatedRoute = svgDocument.createElementNS(
        "http://www.w3.org/2000/svg",
        "polyline"
    );

    calculatedRoute.setAttribute(
        "id",
        "calculated-campus-route"
    );

    calculatedRoute.setAttribute("points", points);
    calculatedRoute.setAttribute("fill", "none");
    calculatedRoute.setAttribute("stroke", "#ff3030");
    calculatedRoute.setAttribute("stroke-width", "5");
    calculatedRoute.setAttribute("stroke-linecap", "round");
    calculatedRoute.setAttribute("stroke-linejoin", "round");
    calculatedRoute.setAttribute("pointer-events", "none");

    svgDocument.documentElement.appendChild(calculatedRoute);

    console.log("Calculated route drawn:", path);
}

// ========================================
// 7. UPDATE ROUTE INFORMATION
// ========================================

function updateRoute() {

    startLocation.textContent =
        startBuilding ? buildings[startBuilding] : "Not selected";

    destinationLocation.textContent =
        destinationBuilding ? buildings[destinationBuilding] : "Not selected";

    removeCalculatedRoute();

    if (!startBuilding || !destinationBuilding) {

        routeMessage.textContent =
            "Select a starting point and destination.";

        return;
    }

    if (startBuilding === destinationBuilding) {

        routeMessage.textContent =
            "Please choose two different buildings.";

        return;
    }

    if (!graphLoaded) {

        routeMessage.textContent =
            "Loading campus navigation graph...";

        return;
    }

    var startCode = startBuilding.replace("building-", "");
    var endCode = destinationBuilding.replace("building-", "");

    var startNode = buildingNodes[startCode];
    var endNode = buildingNodes[endCode];

    if (!startNode || !endNode) {

        routeMessage.textContent =
            "This building is not connected to the walkway graph yet.";

        return;
    }

    var result = dijkstra(graph, startNode, endNode);

    if (!result) {

        routeMessage.textContent =
            "No connected route found.";

        return;
    }

    drawCalculatedRoute(result.path);

    routeMessage.textContent =
        "Shortest path: " +
        result.path.join(" → ") +
        " | Distance: " +
        result.distance.toFixed(2) +
        " coordinate units";

    console.log("Dijkstra result:", result);
}

// ========================================
// 8. SET START
// ========================================

setStart.addEventListener("click", function () {

    if (!selectedBuilding) {
        return;
    }

    startBuilding = selectedBuilding;

    updateRoute();
});

// ========================================
// 9. SET DESTINATION
// ========================================

setDestination.addEventListener("click", function () {

    if (!selectedBuilding) {
        return;
    }

    destinationBuilding = selectedBuilding;

    updateRoute();
});

// ========================================
// 10. CLEAR ROUTE
// ========================================

clearRoute.addEventListener("click", function () {

    startBuilding = null;
    destinationBuilding = null;

    updateRoute();
});

// ========================================
// 11. SHOW GRAPH NODES
// ========================================

function showGraphMarkers() {

    if (!svgDocument) {
        return;
    }

    var svgRoot = svgDocument.documentElement;

    var oldMarkers =
        svgDocument.querySelectorAll(".graph-marker");

    oldMarkers.forEach(function (marker) {

        marker.remove();
    });

    Object.keys(nodes).forEach(function (nodeID) {

        var node = nodes[nodeID];

        var circle = svgDocument.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );

        circle.setAttribute("class", "graph-marker");
        circle.setAttribute("cx", node.x);
        circle.setAttribute("cy", node.y);
        circle.setAttribute("r", "6");

        circle.setAttribute("fill", "yellow");
        circle.setAttribute("stroke", "black");
        circle.setAttribute("stroke-width", "2");
        circle.setAttribute("pointer-events", "none");

        svgRoot.appendChild(circle);

        console.log(
            "Graph node " + nodeID +
            " added at " + node.x + ", " + node.y
        );
    });
}

// ========================================
// 12. LOAD SVG MAP
// ========================================

var graphLoaded = false;

graphReady.then(function () {

    graphLoaded = true;

    if (svgDocument) {
        showGraphMarkers();
    }

    updateRoute();

}).catch(function (error) {

    routeMessage.textContent =
        "Could not load the campus navigation graph.";

    console.error(error);
});

campusMap.addEventListener("load", function () {

    svgDocument = campusMap.contentDocument;

    if (!svgDocument) {

        buildingDescription.textContent =
            "Cannot access SVG.";

        return;
    }

    console.log("SVG loaded successfully!");

    var oldRoute =
        svgDocument.getElementById("route-C7-C5");

    if (oldRoute) {

        oldRoute.style.display = "none";
        oldRoute.style.pointerEvents = "none";
    }

    var allPaths = svgDocument.querySelectorAll("path");

    allPaths.forEach(function (element) {

        var style = element.getAttribute("style") || "";

        if (style.includes("fill-opacity:0")) {

            element.style.pointerEvents = "none";
        }
    });

    if (graphLoaded) {
        showGraphMarkers();
    }

    Object.keys(buildings).forEach(function (id) {

        var building = svgDocument.getElementById(id);

        if (building) {

            building.style.cursor = "pointer";

            console.log(id + " found!");

        } else {

            console.log(id + " not found!");
        }
    });

    // ========================================
    // 13. CLICK BUILDING
    // ========================================

    svgDocument.addEventListener("click", function (event) {

        if (dragStarted) {

            dragStarted = false;
            return;
        }

        var clickedElement = event.target;

        while (
            clickedElement &&
            clickedElement !== svgDocument.documentElement &&
            !buildings[clickedElement.id]
        ) {

            clickedElement = clickedElement.parentElement;
        }

        if (!clickedElement ||
            !buildings[clickedElement.id]) {

            return;
        }

        var clickedID = clickedElement.id;

        selectedBuilding = clickedID;

        buildingName.textContent = buildings[clickedID];

        buildingDescription.textContent =
            "Building code: " +
            clickedID.replace("building-", "");

        setStart.disabled = false;
        setDestination.disabled = false;

       if (previousSelectedElement !== null) 
	   {
           previousSelectedElement.style.fill = previousOriginalFill;
       }

        previousOriginalFill = clickedElement.style.fill;
        clickedElement.style.fill = "#18a999";

        previousSelectedElement = clickedElement;

        console.log(
            "Selected building:",
            buildings[clickedID]
        );
    });

    // ========================================
    // 14. DRAGGING
    // ========================================

    svgDocument.addEventListener("mousedown", function (event) {

        if (event.button !== 0) {
            return;
        }

        isDragging = true;
        dragStarted = false;

        startX = event.screenX - moveX;
        startY = event.screenY - moveY;
    });

    svgDocument.addEventListener("mousemove", function (event) {

        if (!isDragging) {
            return;
        }

        var newX = event.screenX - startX;
        var newY = event.screenY - startY;

        if (Math.abs(newX - moveX) > 3 ||
            Math.abs(newY - moveY) > 3) {

            dragStarted = true;
        }

        moveX = newX;
        moveY = newY;

        updateMap();
    });

    svgDocument.addEventListener("mouseup", function () {

        isDragging = false;
    });

    svgDocument.addEventListener("mouseleave", function () {

        isDragging = false;
    });

    calculatedRoute = null;

    updateRoute();
});

window.addEventListener("mouseup", function () {

    isDragging = false;
});

// ========================================
// 15. INITIAL DISPLAY
// ========================================

updateRoute();
