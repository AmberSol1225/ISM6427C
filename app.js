const DEFAULT_LOCATION = { name: "Boca Raton", latitude: 26.3683, longitude: -80.1289 };

// WMO weather codes used by Open-Meteo
const WEATHER_CODES = {
  0: ["Clear", "☀️", "clear"],
  1: ["Mostly Clear", "🌤️", "clear"],
  2: ["Partly Cloudy", "⛅", "cloudy"],
  3: ["Cloudy", "☁️", "cloudy"],
  45: ["Fog", "🌫️", "cloudy"],
  48: ["Fog", "🌫️", "cloudy"],
  51: ["Light Drizzle", "🌦️", "rain"],
  53: ["Drizzle", "🌦️", "rain"],
  55: ["Heavy Drizzle", "🌧️", "rain"],
  61: ["Light Rain", "🌦️", "rain"],
  63: ["Rain", "🌧️", "rain"],
  65: ["Heavy Rain", "🌧️", "rain"],
  71: ["Light Snow", "🌨️", "cloudy"],
  73: ["Snow", "🌨️", "cloudy"],
  75: ["Heavy Snow", "❄️", "cloudy"],
  80: ["Showers", "🌦️", "rain"],
  81: ["Showers", "🌧️", "rain"],
  82: ["Heavy Showers", "🌧️", "rain"],
  95: ["Thunderstorm", "⛈️", "storm"],
  96: ["Thunderstorm", "⛈️", "storm"],
  99: ["Thunderstorm", "⛈️", "storm"],
};

const $ = (id) => document.getElementById(id);

function describe(code, isDay = 1) {
  const [label, icon, theme] = WEATHER_CODES[code] || ["Unknown", "🌡️", "cloudy"];
  if (!isDay && theme === "clear") return [label, "🌙", "night"];
  return [label, icon, theme];
}

async function getWeather({ name, latitude, longitude }) {
  $("error").hidden = true;
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    hourly: "temperature_2m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,uv_index_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: 7,
  });

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error();
    render(name, await res.json());
  } catch {
    showError("Couldn't load the weather. Please try again.");
  }
}

function render(name, data) {
  const { current, hourly, daily } = data;
  const [label, , theme] = describe(current.weather_code, current.is_day);

  document.body.className = theme;
  $("location").textContent = name;
  $("temp").textContent = `${Math.round(current.temperature_2m)}°`;
  $("condition").textContent = label;
  $("hilo").textContent = `H:${Math.round(daily.temperature_2m_max[0])}°  L:${Math.round(daily.temperature_2m_min[0])}°`;
  $("feels").textContent = `${Math.round(current.apparent_temperature)}°`;
  $("humidity").textContent = `${current.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(current.wind_speed_10m)} mph`;
  $("uv").textContent = Math.round(daily.uv_index_max[0]);

  // Next 24 hours, starting at the current hour
  const start = hourly.time.findIndex((t) => t >= current.time.slice(0, 13));
  $("hourly").innerHTML = hourly.time
    .slice(start, start + 24)
    .map((t, i) => {
      const idx = start + i;
      const hour = i === 0 ? "Now" : new Date(t).toLocaleTimeString([], { hour: "numeric" });
      const [, icon] = describe(hourly.weather_code[idx], hourly.is_day[idx]);
      return `<div class="hour"><span>${hour}</span><span class="icon">${icon}</span><span>${Math.round(hourly.temperature_2m[idx])}°</span></div>`;
    })
    .join("");

  $("daily").innerHTML = daily.time
    .map((d, i) => {
      const day = i === 0 ? "Today" : new Date(`${d}T00:00`).toLocaleDateString([], { weekday: "short" });
      const [, icon] = describe(daily.weather_code[i]);
      return `<li><span>${day}</span><span class="icon">${icon}</span><span class="range"><span class="lo">${Math.round(daily.temperature_2m_min[i])}°</span>${Math.round(daily.temperature_2m_max[i])}°</span></li>`;
    })
    .join("");
}

async function searchCity(query) {
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
    const data = await res.json();
    if (!data.results?.length) return showError(`No results for "${query}".`);
    const { name, latitude, longitude } = data.results[0];
    getWeather({ name, latitude, longitude });
  } catch {
    showError("Search failed. Please try again.");
  }
}

function showError(message) {
  $("error").textContent = message;
  $("error").hidden = false;
}

$("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const query = $("search-input").value.trim();
  if (query) searchCity(query);
  $("search-input").blur();
});

getWeather(DEFAULT_LOCATION);
