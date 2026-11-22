
function dijkstra(graph, start, end) {

    var distances = {};
    var previous = {};
    var visited = {};

    // Initialize distances
    for (var node in graph) {
        distances[node] = Infinity;
        previous[node] = null;
    }

    distances[start] = 0;

    while (true) {

        var current = null;
        var shortest = Infinity;

        // Find the unvisited node with smallest distance
        for (var node in graph) {

            if (!visited[node] && distances[node] < shortest) {
                shortest = distances[node];
                current = node;
            }
        }

        if (current === null) {
            break;
        }

        if (current === end) {
            break;
        }

        visited[current] = true;

        // Check neighboring nodes
        for (var neighbor in graph[current]) {

            var newDistance =
                distances[current] + graph[current][neighbor];

            if (newDistance < distances[neighbor]) {
                distances[neighbor] = newDistance;
                previous[neighbor] = current;
            }
        }
    }

    // No path found
    if (distances[end] === Infinity) {
        return null;
    }

    // Reconstruct shortest path
    var path = [];
    var currentNode = end;

    while (currentNode !== null) {
        path.unshift(currentNode);
        currentNode = previous[currentNode];
    }

    return {
        path: path,
        distance: distances[end]
    };
}

// TEST THE GRAPH AFTER JSON FINISHES LOADING

graphReady.then(function () {

    var result = dijkstra(graph, "N1", "N4");

    console.log("C5 to C7 shortest path:", result);

}).catch(function (error) {

    console.error("Cannot test route:", error);

});
