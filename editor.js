
var campusMap = document.getElementById("campusMap");

var addNode = document.getElementById("addNode");
var connectNodes = document.getElementById("connectNodes");
var deleteNodeButton = document.getElementById("deleteNode");
var deleteConnectionButton = document.getElementById("deleteConnection");
var assignBuildingButton = document.getElementById("assignBuilding");

var undoButton = document.getElementById("undoButton");

var saveGraph = document.getElementById("saveGraph");
var loadGraph = document.getElementById("loadGraph");
var graphFile = document.getElementById("graphFile");

var zoomIn = document.getElementById("zoomIn");
var zoomOut = document.getElementById("zoomOut");
var resetZoom = document.getElementById("resetZoom");

var statusText = document.getElementById("status");

var svgDocument = null;
var svgRoot = null;
var originalViewBox = null;

var zoomLevel = 1;
var moveX = 0;
var moveY = 0;

var isDragging = false;
var dragStarted = false;
var startX = 0;
var startY = 0;
var totalDrag = 0;

var editorMode = "view";

var editorNodes = {};
var editorEdges = [];

// Building names and their associated node IDs
var buildingNodes = {};

var nodeCounter = 1;
var firstNode = null;

var undoHistory = [];

var SVG_NS = "http://www.w3.org/2000/svg";

var editorLayer = null;
var edgeLayer = null;
var nodeLayer = null;


// ========================================
// 1. UPDATE MAP
// ========================================

function updateMap() {

    if (!svgRoot || !originalViewBox) {
        return;
    }

    var width = originalViewBox.width / zoomLevel;
    var height = originalViewBox.height / zoomLevel;

    var x = originalViewBox.x +
        (originalViewBox.width - width) / 2 + moveX;

    var y = originalViewBox.y +
        (originalViewBox.height - height) / 2 + moveY;

    svgRoot.setAttribute(
        "viewBox",
        x + " " + y + " " + width + " " + height
    );
}


// ========================================
// 2. ZOOM BUTTONS
// ========================================

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
// 3. UNDO HISTORY
// ========================================

function saveUndoState() {

    var snapshot = {
        nodes: JSON.parse(JSON.stringify(editorNodes)),
        edges: JSON.parse(JSON.stringify(editorEdges)),
        buildings: JSON.parse(JSON.stringify(buildingNodes)),
        counter: nodeCounter
    };

    undoHistory.push(snapshot);

    undoButton.disabled = false;
}

function undoLastAction() {

    if (undoHistory.length === 0) {
        return;
    }

    var previous = undoHistory.pop();

    editorNodes = previous.nodes;
    editorEdges = previous.edges;
    buildingNodes = previous.buildings;
    nodeCounter = previous.counter;

    firstNode = null;

    redrawGraph();

    undoButton.disabled = undoHistory.length === 0;

    statusText.textContent =
        "Last editing action undone.";
}

undoButton.addEventListener("click", undoLastAction);


// ========================================
// 4. EDITOR MODES
// ========================================

function changeMode(mode) {

    editorMode = mode;
    firstNode = null;

    addNode.classList.remove("active");
    connectNodes.classList.remove("active");
    deleteNodeButton.classList.remove("delete-active");
    deleteConnectionButton.classList.remove("delete-active");
    assignBuildingButton.classList.remove("active");

    if (mode === "add") {
        addNode.classList.add("active");
        statusText.textContent =
            "Add Node mode: click a walkway.";
    }

    else if (mode === "connect") {
        connectNodes.classList.add("active");
        statusText.textContent =
            "Connect mode: click two yellow nodes.";
    }

    else if (mode === "delete") {
        deleteNodeButton.classList.add("delete-active");
        statusText.textContent =
            "Delete Node mode: click a yellow node.";
    }

    else if (mode === "deleteConnection") {
        deleteConnectionButton.classList.add("delete-active");
        statusText.textContent =
            "Delete Connection mode: click a green line.";
    }

    else if (mode === "assignBuilding") {
        assignBuildingButton.classList.add("active");
        statusText.textContent =
            "Assign Building mode: click a yellow node.";
    }

    else {
        statusText.textContent = "View mode.";
    }
}

addNode.addEventListener("click", function () {
    changeMode("add");
});

connectNodes.addEventListener("click", function () {
    changeMode("connect");
});

deleteNodeButton.addEventListener("click", function () {
    changeMode("delete");
});

deleteConnectionButton.addEventListener("click", function () {
    changeMode("deleteConnection");
});

assignBuildingButton.addEventListener("click", function () {
    changeMode("assignBuilding");
});


// ========================================
// 5. CREATE EDITOR LAYERS
// ========================================

function createEditorLayers() {

    editorLayer = svgDocument.createElementNS(SVG_NS, "g");
    editorLayer.setAttribute("id", "wayfinding-editor-layer");

    edgeLayer = svgDocument.createElementNS(SVG_NS, "g");
    edgeLayer.setAttribute("id", "wayfinding-edge-layer");

    nodeLayer = svgDocument.createElementNS(SVG_NS, "g");
    nodeLayer.setAttribute("id", "wayfinding-node-layer");

    editorLayer.appendChild(edgeLayer);
    editorLayer.appendChild(nodeLayer);

    svgRoot.appendChild(editorLayer);
}


// ========================================
// 6. DRAW A NODE
// ========================================

function drawNode(nodeID, x, y) {

    var circle = svgDocument.createElementNS(SVG_NS, "circle");

    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", "8");
    circle.setAttribute("fill", "yellow");
    circle.setAttribute("stroke", "black");
    circle.setAttribute("stroke-width", "2");

    circle.setAttribute("data-node-id", nodeID);
    circle.style.cursor = "pointer";

    var buildingName = null;

    Object.keys(buildingNodes).forEach(function (name) {
        if (buildingNodes[name] === nodeID) {
            buildingName = name;
        }
    });

    if (buildingName !== null) {

        circle.setAttribute("fill", "#ff9900");

        var title = svgDocument.createElementNS(
            SVG_NS, "title"
        );

        title.textContent =
            nodeID + " - " + buildingName;

        circle.appendChild(title);
    }

    nodeLayer.appendChild(circle);
}


// ========================================
// 7. CREATE A NODE
// ========================================

function createNode(x, y) {

    saveUndoState();

    var nodeID = "N" + nodeCounter;
    nodeCounter++;

    editorNodes[nodeID] = {
        x: x,
        y: y
    };

    drawNode(nodeID, x, y);

    statusText.textContent = "Created node " + nodeID;
}


// ========================================
// 8. DRAW A CONNECTION
// ========================================

function drawConnection(nodeAID, nodeBID) {

    var nodeA = editorNodes[nodeAID];
    var nodeB = editorNodes[nodeBID];

    if (!nodeA || !nodeB) {
        return;
    }

    var line = svgDocument.createElementNS(SVG_NS, "line");

    line.setAttribute("x1", nodeA.x);
    line.setAttribute("y1", nodeA.y);
    line.setAttribute("x2", nodeB.x);
    line.setAttribute("y2", nodeB.y);

    line.setAttribute("stroke", "#00aa66");
    line.setAttribute("stroke-width", "6");

    line.setAttribute("data-edge-from", nodeAID);
    line.setAttribute("data-edge-to", nodeBID);

    line.style.cursor = "pointer";

    edgeLayer.appendChild(line);
}


// ========================================
// 9. CREATE A CONNECTION
// ========================================

function createConnection(nodeAID, nodeBID) {

    if (nodeAID === nodeBID) {
        statusText.textContent =
            "Please select two different nodes.";
        return;
    }

    var nodeA = editorNodes[nodeAID];
    var nodeB = editorNodes[nodeBID];

    if (!nodeA || !nodeB) {
        return;
    }

    var exists = editorEdges.some(function (edge) {
        return (
            edge.from === nodeAID &&
            edge.to === nodeBID
        ) || (
            edge.from === nodeBID &&
            edge.to === nodeAID
        );
    });

    if (exists) {
        statusText.textContent =
            "These nodes are already connected.";
        return;
    }

    saveUndoState();

    var dx = nodeB.x - nodeA.x;
    var dy = nodeB.y - nodeA.y;

    var distance = Math.sqrt(dx * dx + dy * dy);

    editorEdges.push({
        from: nodeAID,
        to: nodeBID,
        distance: distance
    });

    drawConnection(nodeAID, nodeBID);

    statusText.textContent =
        "Connected " + nodeAID + " to " + nodeBID;
}


// ========================================
// 10. DELETE A NODE
// ========================================

function deleteNode(nodeID) {

    if (!Object.prototype.hasOwnProperty.call(
        editorNodes, nodeID
    )) {
        return;
    }

    saveUndoState();

    delete editorNodes[nodeID];

    editorEdges = editorEdges.filter(function (edge) {
        return (
            edge.from !== nodeID &&
            edge.to !== nodeID
        );
    });

    Object.keys(buildingNodes).forEach(function (name) {

        if (buildingNodes[name] === nodeID) {
            delete buildingNodes[name];
        }
    });

    redrawGraph();

    statusText.textContent =
        "Deleted " + nodeID +
        " and its connections and building assignments.";
}


// ========================================
// 11. DELETE A CONNECTION
// ========================================

function deleteConnection(nodeAID, nodeBID) {

    var exists = editorEdges.some(function (edge) {
        return (
            edge.from === nodeAID &&
            edge.to === nodeBID
        ) || (
            edge.from === nodeBID &&
            edge.to === nodeAID
        );
    });

    if (!exists) {
        return;
    }

    saveUndoState();

    editorEdges = editorEdges.filter(function (edge) {
        return !(
            (
                edge.from === nodeAID &&
                edge.to === nodeBID
            ) ||
            (
                edge.from === nodeBID &&
                edge.to === nodeAID
            )
        );
    });

    redrawGraph();

    statusText.textContent =
        "Deleted connection between " +
        nodeAID + " and " + nodeBID;
}


// ========================================
// 12. ASSIGN A BUILDING
// ========================================

function assignBuildingToNode(nodeID) {

    if (!editorNodes[nodeID]) {
        return;
    }

    var buildingName = window.prompt(
        "Enter the building name for " + nodeID +
        " (example: C5):"
    );

    if (buildingName === null) {
        return;
    }

    buildingName = buildingName.trim().toUpperCase();

    if (buildingName === "") {
        statusText.textContent =
            "Building name cannot be empty.";
        return;
    }

    if (Object.prototype.hasOwnProperty.call(
        buildingNodes, buildingName
    )) {

        if (buildingNodes[buildingName] === nodeID) {
            statusText.textContent =
                buildingName + " is already assigned to " +
                nodeID;
            return;
        }

        statusText.textContent =
            buildingName + " is already assigned to " +
            buildingNodes[buildingName];

        return;
    }

    var oldBuilding = null;

    Object.keys(buildingNodes).forEach(function (name) {
        if (buildingNodes[name] === nodeID) {
            oldBuilding = name;
        }
    });

    saveUndoState();

    if (oldBuilding !== null) {
        delete buildingNodes[oldBuilding];
    }

    buildingNodes[buildingName] = nodeID;

    redrawGraph();

    statusText.textContent =
        "Assigned " + buildingName +
        " to node " + nodeID;
}


// ========================================
// 13. REDRAW GRAPH
// ========================================

function redrawGraph() {

    edgeLayer.replaceChildren();
    nodeLayer.replaceChildren();

    editorEdges.forEach(function (edge) {
        drawConnection(edge.from, edge.to);
    });

    Object.keys(editorNodes).forEach(function (id) {
        var node = editorNodes[id];
        drawNode(id, node.x, node.y);
    });
}


// ========================================
// 14. SAVE GRAPH
// ========================================

saveGraph.addEventListener("click", function () {

    var graphData = {
        nodes: editorNodes,
        edges: editorEdges,
        buildings: buildingNodes
    };

    var json = JSON.stringify(graphData, null, 4);

    var blob = new Blob(
        [json],
        { type: "application/json" }
    );

    var url = URL.createObjectURL(blob);

    var link = document.createElement("a");

    link.href = url;
    link.download = "campus-graph.json";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    statusText.textContent =
        "Graph exported successfully!";
});


// ========================================
// 15. LOAD GRAPH BUTTON
// ========================================

loadGraph.addEventListener("click", function () {

    if (!svgRoot) {
        statusText.textContent =
            "Wait for the map to load first.";
        return;
    }

    graphFile.click();
});


// ========================================
// 16. VALIDATE LOADED GRAPH
// ========================================

function validateGraph(data) {

    if (
        !data ||
        typeof data !== "object" ||
        !data.nodes ||
        typeof data.nodes !== "object" ||
        Array.isArray(data.nodes) ||
        !Array.isArray(data.edges)
    ) {
        throw new Error("Invalid graph file format.");
    }

    Object.keys(data.nodes).forEach(function (id) {

        var node = data.nodes[id];

        if (
            !node ||
            !Number.isFinite(node.x) ||
            !Number.isFinite(node.y)
        ) {
            throw new Error("Invalid node: " + id);
        }
    });

    data.edges.forEach(function (edge) {

        if (
            !edge ||
            !Object.prototype.hasOwnProperty.call(
                data.nodes, edge.from
            ) ||
            !Object.prototype.hasOwnProperty.call(
                data.nodes, edge.to
            )
        ) {
            throw new Error("Invalid connection.");
        }
    });

    if (data.buildings !== undefined) {

        if (
            !data.buildings ||
            typeof data.buildings !== "object" ||
            Array.isArray(data.buildings)
        ) {
            throw new Error("Invalid buildings format.");
        }

        Object.keys(data.buildings).forEach(function (name) {

            var nodeID = data.buildings[name];

            if (!Object.prototype.hasOwnProperty.call(
                data.nodes, nodeID
            )) {
                throw new Error(
                    "Building " + name +
                    " references a missing node."
                );
            }
        });
    }
}


// ========================================
// 17. RESTORE GRAPH
// ========================================

function restoreGraph(graphData) {

    validateGraph(graphData);

    editorNodes = graphData.nodes;
    editorEdges = graphData.edges;

    // Older graph files may not have buildings yet
    buildingNodes = graphData.buildings || {};

    nodeCounter = 1;

    Object.keys(editorNodes).forEach(function (id) {

        var match = /^N([0-9]+)$/.exec(id);

        if (match) {
            var number = parseInt(match[1], 10);

            nodeCounter = Math.max(
                nodeCounter,
                number + 1
            );
        }
    });

    undoHistory = [];
    undoButton.disabled = true;

    redrawGraph();
    changeMode("view");

    statusText.textContent =
        "Graph loaded: " +
        Object.keys(editorNodes).length +
        " nodes, " +
        editorEdges.length +
        " connections, " +
        Object.keys(buildingNodes).length +
        " buildings.";
}


// ========================================
// 18. READ JSON FILE
// ========================================

graphFile.addEventListener("change", function () {

    var file = graphFile.files[0];

    if (!file) {
        return;
    }

    var reader = new FileReader();

    reader.onload = function (event) {

        try {
            var graphData = JSON.parse(
                event.target.result
            );

            restoreGraph(graphData);

        } catch (error) {
            statusText.textContent =
                "Could not load graph: " +
                error.message;

            console.error(error);
        }
    };

    reader.onerror = function () {
        statusText.textContent =
            "Could not read the selected file.";
    };

    reader.readAsText(file);
    graphFile.value = "";
});


// ========================================
// 19. LOAD SVG MAP
// ========================================

campusMap.addEventListener("load", function () {

    svgDocument = campusMap.contentDocument;

    if (!svgDocument) {
        statusText.textContent =
            "Cannot access SVG. Use localhost:5500.";
        return;
    }

    svgRoot = svgDocument.documentElement;

    var viewBox = svgRoot.viewBox.baseVal;

    if (
        viewBox &&
        viewBox.width > 0 &&
        viewBox.height > 0
    ) {
        originalViewBox = {
            x: viewBox.x,
            y: viewBox.y,
            width: viewBox.width,
            height: viewBox.height
        };
    } else {
        var box = svgRoot.getBBox();

        originalViewBox = {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height
        };

        svgRoot.setAttribute(
            "viewBox",
            box.x + " " + box.y + " " +
            box.width + " " + box.height
        );
    }

    createEditorLayers();

    statusText.textContent =
        "Map loaded. Choose an editing tool.";


    // ========================================
    // 20. START DRAGGING
    // ========================================

    svgDocument.addEventListener("mousedown", function (event) {

        if (event.button !== 0) {
            return;
        }

        isDragging = true;
        dragStarted = false;
        totalDrag = 0;

        startX = event.clientX;
        startY = event.clientY;
    });


    // ========================================
    // 21. DRAG MAP
    // ========================================

    svgDocument.addEventListener("mousemove", function (event) {

        if (!isDragging) {
            return;
        }

        var dx = event.clientX - startX;
        var dy = event.clientY - startY;

        totalDrag += Math.abs(dx) + Math.abs(dy);

        if (totalDrag > 3) {
            dragStarted = true;
        }

        var currentBox = svgRoot.viewBox.baseVal;
        var rect = svgRoot.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
            return;
        }

        moveX -= dx * currentBox.width / rect.width;
        moveY -= dy * currentBox.height / rect.height;

        startX = event.clientX;
        startY = event.clientY;

        updateMap();
    });

    svgDocument.addEventListener("mouseup", function () {
        isDragging = false;
    });

    svgDocument.addEventListener("mouseleave", function () {
        isDragging = false;
    });


    // ========================================
    // 22. HANDLE MAP CLICKS
    // ========================================

    svgDocument.addEventListener("click", function (event) {

        if (dragStarted) {
            dragStarted = false;
            return;
        }

        // DELETE NODE MODE
        if (editorMode === "delete") {

            var deleteTarget = event.target.closest(
                "[data-node-id]"
            );

            if (!deleteTarget) {
                return;
            }

            deleteNode(
                deleteTarget.getAttribute("data-node-id")
            );

            return;
        }

        // DELETE CONNECTION MODE
        if (editorMode === "deleteConnection") {

            var edgeTarget = event.target.closest(
                "[data-edge-from]"
            );

            if (!edgeTarget) {
                return;
            }

            deleteConnection(
                edgeTarget.getAttribute("data-edge-from"),
                edgeTarget.getAttribute("data-edge-to")
            );

            return;
        }

        // ASSIGN BUILDING MODE
        if (editorMode === "assignBuilding") {

            var buildingTarget = event.target.closest(
                "[data-node-id]"
            );

            if (!buildingTarget) {
                return;
            }

            assignBuildingToNode(
                buildingTarget.getAttribute("data-node-id")
            );

            return;
        }

        // CONNECT NODES MODE
        if (editorMode === "connect") {

            var target = event.target.closest(
                "[data-node-id]"
            );

            if (!target) {
                return;
            }

            var clickedNode = target.getAttribute(
                "data-node-id"
            );

            if (firstNode === null) {
                firstNode = clickedNode;

                statusText.textContent =
                    "Selected " + firstNode +
                    ". Click the second node.";

                return;
            }

            createConnection(firstNode, clickedNode);
            firstNode = null;

            return;
        }

        // ADD NODE MODE
        if (editorMode === "add") {

            var point = svgRoot.createSVGPoint();

            point.x = event.clientX;
            point.y = event.clientY;

            var matrix = svgRoot.getScreenCTM();

            if (!matrix) {
                return;
            }

            var svgPoint = point.matrixTransform(
                matrix.inverse()
            );

            createNode(svgPoint.x, svgPoint.y);
        }
    });
});


// ========================================
// 23. STOP DRAGGING OUTSIDE MAP
// ========================================

window.addEventListener("mouseup", function () {
    isDragging = false;
});
