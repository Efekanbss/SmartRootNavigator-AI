function dijkstra(graph, startNode, endNode) {
    const distances = {};
    const previous = {};
    const unvisited = new Set();
  
    for (const node of graph.nodes) {
      distances[node] = Infinity;
      previous[node] = null;
      unvisited.add(node);
    }
  
    distances[startNode] = 0;
  
    while (unvisited.size > 0) {
      let current = null;
      let min = Infinity;
      for (const node of unvisited) {
        if (distances[node] < min) {
          current = node;
          min = distances[node];
        }
      }
  
      if (current === endNode) break;
      unvisited.delete(current);
  
      for (const edge of graph.edges[current] || []) {
        const alt = distances[current] + edge.weight;
        if (alt < distances[edge.node]) {
          distances[edge.node] = alt;
          previous[edge.node] = current;
        }
      }
    }
  
    const path = [];
    let curr = endNode;
    while (curr) {
      path.unshift(curr);
      curr = previous[curr];
    }
  
    return { path, distance: distances[endNode] };
  }