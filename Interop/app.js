const endpoints = {
  ip: "https://api64.ipify.org?format=json",
  ipGeoPrimary: (ip) => `https://ipwho.is/${encodeURIComponent(ip)}`,
  ipGeoFallback: (ip) => `https://ip-api.com/json/${encodeURIComponent(ip)}`,
  bikes: "https://api.citybik.es/v2/networks/velostanlib",
  weather: ({ lat, lon }) =>
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code&hourly=precipitation_probability&timezone=auto`,
  air: ({ lat, lon }) =>
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=european_aqi,pm10,pm2_5,carbon_monoxide,ozone,nitrogen_dioxide,sulphur_dioxide&timezone=auto`,
};

const defaults = {
  coords: { lat: 48.68291944294635, lon: 6.161064517333171 }, // IUT Nancy Charlemagne
  devIp: "78.125.143.125",
};

const state = {
  coords: { ...defaults.coords },
  ipCoords: null,
  weather: null,
  air: null,
  bikes: [],
  ip: null,
};

let map;
let stationLayer;
let userMarker;
let ipMarker;

document.addEventListener("DOMContentLoaded", () => {
  startClock();
  init();
});

async function init() {
  wireActions();
  setReferenceInfo();
  await loadLocation();
  initMap();
  await refreshData();
}

function wireActions() {
  document
    .getElementById("btn-refresh-ip")
    ?.addEventListener("click", async () => {
      logStatus("Relance geoloc IP...", "warn");
      await loadLocation();
      await refreshData();
    });

  document
    .getElementById("btn-force-nancy")
    ?.addEventListener("click", async () => {
      logStatus("Position forcee sur Nancy.", "warn");
      useForcedCoords(defaults.coords, "Nancy (force)");
      await refreshData();
    });
}

async function refreshData() {
  updateApiLinks();
  await Promise.allSettled([
    loadWeather(),
    loadAirQuality(),
    loadBikeStations(),
  ]);
  updateDecision();
}

function startClock() {
  const target = document.getElementById("clock");
  const tick = () => {
    const now = new Date();
    target.textContent = now.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };
  tick();
  setInterval(tick, 1000);
}

async function fetchJSON(url, label) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    logStatus(`${label} ok`, "ok");
    return json;
  } catch (err) {
    logStatus(`${label} en erreur: ${err.message}`, "err");
    throw err;
  }
}

async function loadLocation() {
  const ipRaw = await resolvePublicIp();
  state.ip = ipRaw;
  const ipForLookup =
    ipRaw === "127.0.0.1" || ipRaw === "::1" ? defaults.devIp : ipRaw;

  try {
    const geo = await geolocateIp(ipForLookup);
    if (!geo) throw new Error("Geoloc IP failed");
    const lat = Number(geo.lat);
    const lon = Number(geo.lon);
    const city = geo.city;
    const zip = geo.zip;
    state.ipCoords = { lat, lon };
    document.getElementById("location-label").textContent =
      `${city || "Ville inconnue"}${zip ? ` (${zip})` : ""}`;
    document.getElementById("ip-address").textContent = ipRaw || "n/a";
    document.getElementById("location-coords").textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    document.getElementById("location-updated").textContent = humanDate(new Date());
    updateIpMarker();
  } catch (err) {
    logStatus("Geoloc IP indisponible, fallback IUT.", "warn");
    useForcedCoords(defaults.coords, "Nancy (fallback)");
    document.getElementById("ip-address").textContent = "non detectee";
    state.ipCoords = null;
    updateIpMarker();
  }
}

function initMap() {
  map = L.map("map", { zoomControl: true }).setView(
    [state.coords.lat, state.coords.lon],
    14
  );

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  stationLayer = L.layerGroup().addTo(map);
  userMarker = L.circleMarker(
    [state.coords.lat, state.coords.lon],
    {
      radius: 10,
      color: "#f5a524",
      fillColor: "#f5a524",
      fillOpacity: 0.8,
      weight: 2,
    }
  )
    .bindPopup("R&eacute;f&eacute;rence IUT Nancy")
    .addTo(map);

  updateIpMarker();
}

function useForcedCoords(coords, label = "Position forcée") {
  state.coords = { ...coords };
  document.getElementById("location-label").textContent = label;
  document.getElementById("location-coords").textContent = `${coords.lat.toFixed(
    4
  )}, ${coords.lon.toFixed(4)}`;
  document.getElementById("location-updated").textContent = humanDate(new Date());
  updateApiLinks();
  if (map && userMarker) {
    userMarker.setLatLng([coords.lat, coords.lon]);
    map.setView([coords.lat, coords.lon], 14);
  }
  setReferenceInfo();
}

async function resolvePublicIp() {
  try {
    const data = await fetchJSON(endpoints.ip, "IP publique (ipify)");
    return data.ip || "127.0.0.1";
  } catch (err) {
    logStatus("Impossible de lire l'IP publique, utilisation 127.0.0.1", "warn");
    return "127.0.0.1";
  }
}

async function geolocateIp(ip) {
  try {
    const primary = await fetchJSON(endpoints.ipGeoPrimary(ip), "ipwho.is");
    if (primary && primary.success !== false) {
      return {
        lat: primary.latitude,
        lon: primary.longitude,
        city: primary.city,
        zip: primary.postal,
      };
    }
    throw new Error("ipwho.is fail");
  } catch (err) {
    logStatus("ipwho.is indisponible, tentative ip-api (https)", "warn");
    try {
      const fallback = await fetchJSON(endpoints.ipGeoFallback(ip), "ip-api");
      if (fallback.status !== "success") {
        throw new Error("ip-api fail");
      }
      return {
        lat: fallback.lat,
        lon: fallback.lon,
        city: fallback.city,
        zip: fallback.zip,
      };
    } catch (e) {
      logStatus("Geoloc IP indisponible, aucune coord IP utilisee.", "warn");
      return null;
    }
  }
}

function updateIpMarker() {
  if (!map) return;
  if (ipMarker) {
    ipMarker.remove();
    ipMarker = null;
  }
  if (!state.ipCoords) return;
  ipMarker = L.circleMarker([state.ipCoords.lat, state.ipCoords.lon], {
    radius: 8,
    color: "#1d4ed8",
    fillColor: "#1d4ed8",
    fillOpacity: 0.85,
    weight: 2,
  })
    .bindPopup("Localisation IP d&eacute;tect&eacute;e")
    .addTo(map);
}

function setReferenceInfo() {
  const el = document.getElementById("ref-coords");
  if (el) {
    el.textContent = `${defaults.coords.lat}, ${defaults.coords.lon}`;
  }
}

async function loadWeather() {
  const url = endpoints.weather(state.coords);
  try {
    const data = await fetchJSON(url, "Meteo");
    const current = data.current || {};
    const weatherInfo = interpretWeather(current.weather_code);

    state.weather = {
      temp: current.temperature_2m,
      apparent: current.apparent_temperature,
      wind: current.wind_speed_10m,
      precipitation: current.precipitation,
      weatherCode: current.weather_code,
      updatedAt: current.time || data.current_units?.time,
      text: weatherInfo.text,
      icon: weatherInfo.icon,
    };

    document.getElementById("weather-temp").textContent = `${fmt(state.weather.temp)} C`;
    document.getElementById("weather-apparent").textContent = `Ressenti: ${fmt(state.weather.apparent)} C`;
    document.getElementById("weather-wind").textContent = `Vent: ${fmt(state.weather.wind, 1)} km/h`;
    document.getElementById("weather-rain").textContent = `Precip.: ${fmt(state.weather.precipitation, 1)} mm`;
    document.getElementById("weather-text").textContent = state.weather.text;
    document.getElementById("weather-icon").textContent = state.weather.icon;
    document.getElementById("weather-updated").textContent = state.weather.updatedAt
      ? humanDate(state.weather.updatedAt)
      : humanDate(new Date());

    updateApiLinks();
  } catch (err) {
    document.getElementById("weather-text").textContent =
      "Impossible de recuperer la meteo.";
  }
  updateDecision();
}

async function loadAirQuality() {
  const url = endpoints.air(state.coords);
  try {
    const data = await fetchJSON(url, "Qualite de l'air");
    const times = data.hourly?.time || [];
    const values = data.hourly?.european_aqi || [];
    const lastIndex = values.length - 1;
    if (lastIndex < 0) {
      throw new Error("AQI absent");
    }

    const aqi = Number(values[lastIndex]);
    const time = times[lastIndex];
    if (!Number.isFinite(aqi)) {
      throw new Error("AQI invalide");
    }
    const classification = classifyAQI(aqi);

    state.air = { aqi, updatedAt: time, ...classification };

    document.getElementById("air-index").textContent = `${Math.round(aqi)} AQI`;
    document.getElementById("air-text").textContent = classification.text;
    document.getElementById("air-icon").textContent = classification.icon;
    document.getElementById("air-updated").textContent = humanDate(time);

    updateApiLinks();
  } catch (err) {
    document.getElementById("air-text").textContent =
      "Lecture impossible pour la qualite de l'air.";
  }
  updateDecision();
}

async function loadBikeStations() {
  try {
    const data = await fetchJSON(endpoints.bikes, "Velostanlib");
    const stations = data.network?.stations || [];
    const enriched = stations.map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.latitude,
      lon: s.longitude,
      bikes: s.free_bikes ?? 0,
      slots: s.empty_slots ?? 0,
      timestamp: s.timestamp,
      distance: distanceKm(
        state.coords.lat,
        state.coords.lon,
        s.latitude,
        s.longitude
      ),
    }));

    state.bikes = enriched;
    renderStations(enriched);
    drawStations(enriched);
  } catch (err) {
    document.getElementById("bike-availability").textContent =
      "Impossible de lire les stations.";
  }
  updateDecision();
}

function renderStations(stations) {
  const count = stations.length;
  const totalBikes = stations.reduce((acc, s) => acc + (s.bikes || 0), 0);
  const totalSlots = stations.reduce((acc, s) => acc + (s.slots || 0), 0);

  document.getElementById("bike-count").textContent = `${count} stations`;
  document.getElementById("bike-availability").textContent =
    `${totalBikes} velos dispo / ${totalSlots} places libres (total reseau)`;

  const time = stations.find((s) => s.timestamp)?.timestamp;
  document.getElementById("bike-updated").textContent = time
    ? humanDate(time)
    : "n/a";

  const list = document.getElementById("station-list");
  list.innerHTML = "";
  const sorted = [...stations].sort((a, b) => a.distance - b.distance).slice(0, 8);

  sorted.forEach((s) => {
    const li = document.createElement("li");
    li.className = "station";
    const scarcity = s.bikes <= 2 ? " (faible dispo)" : "";
    li.innerHTML = `
      <div class="station__name">${s.name}</div>
      <div class="station__meta">
        <span class="station__tag">${s.bikes} v&eacute;los</span>
        <span class="station__tag">${s.slots} places</span>
        <span>${s.distance.toFixed(2)} km</span>
        <span>${humanDate(s.timestamp)}</span>
      </div>
      <div class="muted tiny">Etat: ${s.bikes} v&eacute;lo(s) dispo${scarcity}</div>
    `;
    list.appendChild(li);
  });

  if (!sorted.length) {
    list.innerHTML = `<li class="muted">Aucune station n'a &eacute;t&eacute; trouv&eacute;e.</li>`;
  }
}

function drawStations(stations) {
  if (!stationLayer || !map) return;
  stationLayer.clearLayers();

  userMarker.setLatLng([state.coords.lat, state.coords.lon]);
  map.setView([state.coords.lat, state.coords.lon], 14);
  updateIpMarker();

  stations.forEach((s) => {
    const color = s.bikes <= 2 ? "#ff6b6b" : "#2dd4bf";
    L.circleMarker([s.lat, s.lon], {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 0.85,
      weight: 2,
    })
      .bindPopup(
        `<strong>${s.name}</strong><br>` +
          `${s.bikes} v&eacute;los / ${s.slots} places<br>` +
          `${s.distance.toFixed(2)} km`
      )
      .addTo(stationLayer);
  });
}

function updateApiLinks() {
  const weatherURL = endpoints.weather(state.coords);
  const airURL = endpoints.air(state.coords);
  document.getElementById("api-weather").href = weatherURL;
  document.getElementById("api-weather").textContent = weatherURL;
  document.getElementById("api-air").href = airURL;
  document.getElementById("api-air").textContent = airURL;
  document.getElementById("api-ipify").href = endpoints.ip;
  document.getElementById("api-ipify").textContent = endpoints.ip;
  const ipForLink = state.ip ? state.ip : "demo";
  document.getElementById("api-ipapi").href = endpoints.ipGeoFallback(ipForLink);
  document.getElementById("api-ipapi").textContent = endpoints.ipGeoFallback(ipForLink);
  document.getElementById("api-ipwho").href = endpoints.ipGeoPrimary(ipForLink);
  document.getElementById("api-ipwho").textContent = endpoints.ipGeoPrimary(ipForLink);
}

function updateDecision() {
  const target = document.getElementById("decision");
  if (!state.weather || !state.air || !state.bikes.length) {
    target.textContent = "En attente de toutes les donn&eacute;es pour donner un conseil.";
    return;
  }

  const nearest = [...state.bikes].sort((a, b) => a.distance - b.distance)[0];
  const rain = state.weather.precipitation || 0;
  const wind = state.weather.wind || 0;
  const aqi = state.air.aqi;
  const distWarning = nearest && nearest.distance > 20;

  const weatherPenalty = rain >= 1 || wind >= 35;
  const airPenalty = aqi >= 75;
  const bikesPenalty = !nearest || nearest.bikes === 0;

  let verdict = "Prendre le v&eacute;lo semble ok.";
  let highlight = "ok";
  if (weatherPenalty || airPenalty || bikesPenalty || distWarning) {
    verdict = "Attention, conditions peu favorables pour le v&eacute;lo.";
    highlight = "warn";
  }

  const points = [
    `Station la plus proche: ${nearest ? `${nearest.name} (${nearest.distance.toFixed(2)} km, ${nearest.bikes} v&eacute;los)` : "non trouv&eacute;e"}`,
    `M&eacute;t&eacute;o: ${state.weather.text}, pluie ${rain.toFixed(1)} mm, vent ${wind.toFixed(1)} km/h`,
    `Qualit&eacute; de l'air: ${state.air.text} (${Math.round(aqi)} AQI)`,
  ];
  if (distWarning) {
    points.unshift("Votre position IP est &eacute;loign&eacute;e du r&eacute;seau (forcer Nancy si besoin).");
  }

  target.innerHTML = `
    <p class="metric ${highlight === "warn" ? "muted" : ""}">${verdict}</p>
    <ul>
      ${points.map((p) => `<li>${p}</li>`).join("")}
    </ul>
  `;
}

function interpretWeather(code) {
  const mapping = [
    { codes: [0], text: "Ciel clair", icon: "☀️" },
    { codes: [1, 2], text: "Peu nuageux", icon: "🌤️" },
    { codes: [3], text: "Ciel couvert", icon: "☁️" },
    { codes: [45, 48], text: "Brouillard", icon: "🌫️" },
    { codes: [51, 53, 55], text: "Bruine", icon: "🌦️" },
    { codes: [61, 63, 65], text: "Pluie", icon: "🌧️" },
    { codes: [71, 73, 75], text: "Neige", icon: "❄️" },
    { codes: [80, 81, 82], text: "Averses", icon: "🌦️" },
    { codes: [95, 96, 99], text: "Orages", icon: "⛈️" },
  ];
  const found = mapping.find((m) => m.codes.includes(code));
  return found || { text: "Meteo inconnue", icon: "⛅" };
}

function classifyAQI(aqi) {
  if (aqi <= 20) return { text: "Air excellent", icon: "🟢" };
  if (aqi <= 50) return { text: "Air correct", icon: "🟢" };
  if (aqi <= 75) return { text: "Air moyen", icon: "🟡" };
  if (aqi <= 100) return { text: "Air d&eacute;grade", icon: "🟠" };
  return { text: "Air mauvais", icon: "🔴" };
}

function humanDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "n/a";
  return date.toLocaleString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function fmt(value, digits = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "--";
  return num.toFixed(digits);
}

function logStatus(message, level = "ok") {
  const list = document.getElementById("status-log");
  if (!list) return;
  if (list.children.length && list.firstChild?.textContent?.includes("En attente")) {
    list.innerHTML = "";
  }
  const li = document.createElement("li");
  li.textContent = `${humanDate(new Date())} - ${message}`;
  li.className = level;
  list.prepend(li);
}
