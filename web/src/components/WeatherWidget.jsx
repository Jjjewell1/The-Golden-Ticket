import { useEffect, useState } from 'react';

const WMO = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
  66: '🌧️', 67: '🌧️', 71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️', 85: '🌨️', 86: '🌨️', 95: '⛈️',
  96: '⛈️', 99: '⛈️',
};

const LABELS = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Foggy', 48: 'Foggy',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 85: 'Snow showers', 86: 'Snow showers', 95: 'Thunderstorm',
  96: 'Storm', 99: 'Storm',
};

export default function WeatherWidget() {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        if (!geoRes.ok) throw new Error('geo');
        const geo = await geoRes.json();
        const lat = Number.parseFloat(geo.latitude);
        const lon = Number.parseFloat(geo.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('geo');
        const city = geo.city || geo.region || geo.country_name || '';
        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`,
        );
        if (!wRes.ok) throw new Error('weather');
        const w = await wRes.json();
        if (!alive) return;
        setState({
          loading: false,
          error: null,
          data: {
            city,
            temp: Math.round(w.current.temperature_2m),
            code: w.current.weather_code,
            humidity: Math.round(w.current.relative_humidity_2m),
            wind: Math.round(w.current.wind_speed_10m),
          },
        });
      } catch {
        if (alive) setState({ loading: false, error: 'Weather unavailable', data: null });
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  const { loading, error, data } = state;

  return (
    <div className="sidebar-widget weather-widget">
      <span className="sidebar-widget-title">🌤️ Weather</span>
      {loading && <p className="sidebar-widget-empty">Checking the sky…</p>}
      {error && <p className="sidebar-widget-empty">{error}</p>}
      {!loading && !error && data && (
        <div className="weather-now">
          <span className="weather-icon" aria-hidden="true">
            {WMO[data.code] || '🌡️'}
          </span>
          <div className="weather-main">
            <span className="weather-temp">{data.temp}°</span>
            <span className="weather-label">{LABELS[data.code] || 'Mixed'}</span>
          </div>
          <div className="weather-meta">
            <span>{data.city}</span>
            <span>{data.humidity}% humidity</span>
            {data.wind > 0 && <span>{data.wind} km/h wind</span>}
          </div>
        </div>
      )}
    </div>
  );
}
