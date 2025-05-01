let waypoints = [];
let markers = [];


let map = L.map('map').setView([39.0, 35.0], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let graphData;
let startPoint = null;
let endPoint = null;

// graph-data.json'u ekle
fetch('graph-data.json')
  .then(res => res.json())
  .then(data => {
    graphData = data;
  });


map.on('click', function (e) {
  const clicked = [e.latlng.lat, e.latlng.lng];

  if (!startPoint) {
    startPoint = clicked;
    L.marker(clicked, { color: 'green' }).addTo(map).bindPopup("Start").openPopup();
    alert("Start point selected.");
  } else if (!endPoint) {
    endPoint = clicked;
    L.marker(clicked, { color: 'red' }).addTo(map).bindPopup("End").openPopup();
    alert("End point selected.");

    handleRouting(startPoint, endPoint);
  }
});

function handleRouting(startCoord, endCoord) {
  const startNode = findNearestNode(startCoord);
  const endNode = findNearestNode(endCoord);

  

  if (!startNode || !endNode) {
    alert("Nearest city not found.");
    return;
  }

  const path = dijkstra(graphData, startNode, endNode);

  if (path.length === 0) {
    alert("Road not found.");
    return;
  }

  // haritada gçsterir 
  const latlngs = path.map(node => graphData.coordinates[node]);
  L.polyline(latlngs, { color: 'blue', weight: 5 }).addTo(map);

  // toplam mesafe
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const edge = graphData.edges[from].find(e => e.node === to);
    total += edge ? edge.weight : 0;
  }

  const tahminiSure = total / 100;

  const result = document.getElementById("route-result");
  result.innerHTML = `
    <h3>🚩 Seçilen Güzergâh</h3>
    <p><strong>Geçilen Şehirler:</strong> ${path.join(" → ")}</p>
    <p><strong>Toplam Mesafe:</strong> ${total.toFixed(1)} km</p>
    <p><strong>Tahmini Süre:</strong> ${tahminiSure.toFixed(2)} saat</p>
    <p><strong>Başlangıç Koordinatı:</strong> ${startCoord[0].toFixed(5)}, ${startCoord[1].toFixed(5)}</p>
    <p><strong>Bitiş Koordinatı:</strong> ${endCoord[0].toFixed(5)}, ${endCoord[1].toFixed(5)}</p>
  `;

}


function findNearestNode(clickedCoord) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371; // km

  function haversine(coord1, coord2) {
    const [lat1, lon1] = coord1;
    const [lat2, lon2] = coord2;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  let nearest = null;
  let minDist = Infinity;

  for (let node of graphData.nodes) {
    const dist = haversine(clickedCoord, graphData.coordinates[node]);
    if (dist < minDist) {
      minDist = dist;
      nearest = node;
    }
  }

  return nearest;
}


document.getElementById("reset").addEventListener("click", () => {
  
  map.eachLayer(layer => {
    if (layer instanceof L.Marker || layer instanceof L.Polyline) {
      map.removeLayer(layer);
    }
  });

  
  startPoint = null;
  endPoint = null;

 
  const result = document.getElementById("route-result");
  if (result) result.innerHTML = "";

  alert("The map has been reset. You can choose a new route.");
});



