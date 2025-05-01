function dijkstra(graph, start, end) {
  const distances = {};
  const previous = {};
  const queue = new Set(graph.nodes);

  
  graph.nodes.forEach(node => {
    distances[node] = Infinity;
    previous[node] = null;
  });
  distances[start] = 0;

  while (queue.size > 0) {
    // en yakın node
    let current = [...queue].reduce((minNode, node) =>
      distances[node] < distances[minNode] ? node : minNode
    );
    queue.delete(current);

    if (current === end) break;

    const neighbors = graph.edges[current] || [];
    for (let neighbor of neighbors) {
      const alt = distances[current] + neighbor.weight;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        previous[neighbor.node] = current;
      }
    }
  }

  
  const path = [];
  let node = end;
  while (node) {
    path.unshift(node);
    node = previous[node];
  }

  if (path[0] !== start) return [];
  return path;
}

window.dijkstra = dijkstra;
