
var nodes = {};
var graph = {};
var buildingNodes = {};

var graphReady = fetch("campus-graph.json")
    .then(function (response) {

        if (!response.ok) {
            throw new Error("Could not load campus-graph.json");
        }

        return response.json();
    })
    .then(function (data) {

        nodes = data.nodes;

        // Create an empty list of connections for each node

        Object.keys(nodes).forEach(function (nodeID) {
            graph[nodeID] = {};
        });

        // Add connections in both directions

        data.edges.forEach(function (edge) {

            graph[edge.from][edge.to] = edge.distance;
            graph[edge.to][edge.from] = edge.distance;

        });

        // Save building-to-node assignments

        buildingNodes = data.buildings || {};

        console.log("Campus nodes:", nodes);
        console.log("Campus graph:", graph);
        console.log("Building assignments:", buildingNodes);

        return data;
    })
    .catch(function (error) {

        console.error("Error loading campus graph:", error);

        throw error;
    });
