let map;
let graphData;
let startNode = null;
let endNode = null;
let routingControl = null;

map = L.map('map').setView([39.9208, 32.8541], 6); // Türkiye merkezi 

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const distanceCache = {};

async function getRouteDistance(fromLat, fromLng, toLat, toLng) {
  const cacheKey = `${fromLat},${fromLng}-${toLat},${toLng}`;
  if (distanceCache[cacheKey]) {
    return distanceCache[cacheKey];
  }

  try {
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const distance = data.routes[0].distance;
      const duration = data.routes[0].duration;
      distanceCache[cacheKey] = { distance, duration };
      return distanceCache[cacheKey];
    } else {
      const airDistance = calculateDistance(fromLat, fromLng, toLat, toLng);
      return { distance: airDistance, duration: airDistance / 13.9 };
    }
  } catch (error) {
    const airDistance = calculateDistance(fromLat, fromLng, toLat, toLng);
    return { distance: airDistance, duration: airDistance / 13.9 };
  }
}

function makeGraphUndirected(graph) {
  const undirectedEdges = {};
  graph.nodes.forEach(node => {
    undirectedEdges[node] = [];
  });
  graph.edges = undirectedEdges;
  return graph;
}

fetch('graph-data.json')
  .then(response => response.json())
  .then(data => {
    graphData = makeGraphUndirected(data);
    addMarkers();
  })
  .catch(error => console.error('Graph data loading error:', error));

function addMarkers() {
  const coords = graphData.coordinates;
  for (const node in coords) {
    const [lat, lng] = coords[node];
    const marker = L.marker([lat, lng]).addTo(map).bindPopup(`Node: ${node}`);
    marker.on('click', function () {
      selectNode(node);
    });
  }
}

function selectNode(node) {
  if (!startNode) {
    startNode = node;
    document.getElementById('start-node').textContent = startNode;
    alert(`Start node selected: ${startNode}`);
  } else if (!endNode) {
    endNode = node;
    document.getElementById('end-node').textContent = endNode;
    alert(`End node selected: ${endNode}`);
    calculateAndDrawPath();
  } else {
    alert('Start and End already selected. Please reset.');
  }
}

async function calculateRealRouteDistance(startNode, endNode) {
  const startCoord = graphData.coordinates[startNode];
  const endCoord = graphData.coordinates[endNode];
  if (!startCoord || !endCoord) return null;
  const routeInfo = await getRouteDistance(startCoord[0], startCoord[1], endCoord[0], endCoord[1]);

  const edgeExists = graphData.edges[startNode].some(edge => edge.node === endNode);
  if (!edgeExists) {
    graphData.edges[startNode].push({ node: endNode, weight: routeInfo.distance });
    if (!graphData.edges[endNode].some(edge => edge.node === startNode)) {
      graphData.edges[endNode].push({ node: startNode, weight: routeInfo.distance });
    }
  }
  return routeInfo;
}

async function calculateAndDrawPath() {
  if (!startNode || !endNode) {
    alert('Lütfen başlangıç ve bitiş noktası seçin.');
    return;
  }

  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loading-indicator';
  loadingDiv.style.position = 'fixed';
  loadingDiv.style.top = '50%';
  loadingDiv.style.left = '50%';
  loadingDiv.style.transform = 'translate(-50%, -50%)';
  loadingDiv.style.backgroundColor = 'white';
  loadingDiv.style.padding = '20px';
  loadingDiv.style.borderRadius = '5px';
  loadingDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
  loadingDiv.style.zIndex = '1000';
  loadingDiv.innerHTML = '<h3>Rota hesaplanıyor...</h3>';
  document.body.appendChild(loadingDiv);

  try {
    const routeInfo = await calculateRealRouteDistance(startNode, endNode);
    const result = dijkstra(graphData, startNode, endNode);

    if (!result.path.length) {
      alert('Yol bulunamadı.');
      document.body.removeChild(loadingDiv);
      return;
    }

    const waypoints = result.path.map(node => {
      const [lat, lng] = graphData.coordinates[node];
      return L.latLng(lat, lng);
    });

    if (routingControl) map.removeControl(routingControl);
    routingControl = L.Routing.control({
        waypoints: waypoints,
        lineOptions: {
          styles: [{ color: 'red', opacity: 0.8, weight: 4 }]
        },
        router: new L.Routing.OSRMv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1'
        }),
        createMarker: () => null,
        show: false,                  
        routeWhileDragging: false,
        addWaypoints: false,
        collapsible: false
      }).addTo(map);

    const pathText = result.path.join(' → ');
    document.getElementById('path-nodes').innerHTML = `<strong>Path:</strong> ${pathText}`;
    if (routeInfo) {
      document.getElementById('distance').textContent = `${(routeInfo.distance/1000).toFixed(2)} `;
      document.getElementById('time').textContent = `${(routeInfo.duration/3600).toFixed(2)} `;
    }
  } finally {
    document.body.removeChild(loadingDiv);
  }
}

function resetSelection() {
  startNode = null;
  endNode = null;
  document.getElementById('start-node').textContent = "None";
  document.getElementById('end-node').textContent = "None";
  document.getElementById('distance').textContent = "0";
  document.getElementById('time').textContent = "0";
  document.getElementById('path-nodes').innerHTML = "<strong>Path:</strong>";
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }
}

function dijkstra(graph, startNode, endNode) {
  const distances = {};
  const previous = {};
  const unvisited = new Set();

  Object.keys(graph.coordinates).forEach(node => {
    distances[node] = Infinity;
    previous[node] = null;
    unvisited.add(node);
  });
  distances[startNode] = 0;

  while (unvisited.size > 0) {
    let currentNode = null;
    let minDistance = Infinity;
    for (const node of unvisited) {
      if (distances[node] < minDistance) {
        currentNode = node;
        minDistance = distances[node];
      }
    }
    if (currentNode === endNode || minDistance === Infinity) break;
    unvisited.delete(currentNode);
    if (graph.edges[currentNode]) {
      for (const edge of graph.edges[currentNode]) {
        const neighbor = edge.node;
        const weight = edge.weight || 1;
        const distanceThroughCurrent = distances[currentNode] + weight;
        if (distanceThroughCurrent < distances[neighbor]) {
          distances[neighbor] = distanceThroughCurrent;
          previous[neighbor] = currentNode;
        }
      }
    }
  }

  const path = [];
  let current = endNode;
  if (previous[endNode] === null && startNode !== endNode) return { path: [], distance: 0 };
  while (current) {
    path.unshift(current);
    current = previous[current];
  }
  return { path, distance: distances[endNode] };
}

map.on('click', function(e) {
  const latlng = e.latlng;
  const nodeName = prompt("Yeni node adı girin:");
  if (nodeName && nodeName.trim() !== "") {
    addNewNode(nodeName.trim(), [latlng.lat, latlng.lng]);
  }
});

function addNewNode(nodeName, coordinates) {
  if (graphData.coordinates[nodeName]) {
    alert(`"${nodeName}" adında bir node zaten mevcut.`);
    return;
  }
  if (!graphData.nodes.includes(nodeName)) {
    graphData.nodes.push(nodeName);
  }
  graphData.coordinates[nodeName] = coordinates;
  if (!graphData.edges[nodeName]) {
    graphData.edges[nodeName] = [];
  }
  const [lat, lng] = coordinates;
  const marker = L.marker([lat, lng]).addTo(map).bindPopup(`Node: ${nodeName}`);
  marker.on('click', function() {
    selectNode(nodeName);
  });
  alert(`"${nodeName}" node'u başarıyla eklendi.`);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon1 - lon2) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}


function downloadUpdatedGraph() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(graphData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "updated-graph-data.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
}


function addNewNode(nodeName, coordinates) {
  if (graphData.coordinates[nodeName]) {
    alert(`"${nodeName}" adında bir node zaten mevcut.`);
    return;
  }
  if (!graphData.nodes.includes(nodeName)) {
    graphData.nodes.push(nodeName);
  }
  graphData.coordinates[nodeName] = coordinates;
  if (!graphData.edges[nodeName]) {
    graphData.edges[nodeName] = [];
  }
  const [lat, lng] = coordinates;
  const marker = L.marker([lat, lng]).addTo(map).bindPopup(`Node: ${nodeName}`);
  marker.on('click', function() {
    selectNode(nodeName);
  });
  alert(`"${nodeName}" node'u başarıyla eklendi.`);

  
  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export JSON';
  exportBtn.onclick = downloadUpdatedGraph;
  document.querySelector('.controls').appendChild(exportBtn);
}
