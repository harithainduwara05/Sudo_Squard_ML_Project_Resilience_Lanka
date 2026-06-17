import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { predictFloodRisk } from '../api/client';
import { DISTRICTS, DISTRICT_DATA_DICTIONARY, LANDCOVER_TYPES, SOIL_TYPES } from '../utils/constants';
import DownloadReport from '../components/predict/DownloadReport';

/* ─── Sri Lanka Bounds ─── */
const SL_BOUNDS = L.latLngBounds(
  L.latLng(5.7, 79.3),
  L.latLng(10.1, 82.3)
);
const SL_CENTER = [7.8731, 80.7718];
const DEFAULT_ZOOM = 7;

/* ─── District Centroids (same order as DISTRICTS constant) ─── */
const DISTRICT_CENTROIDS = [
  { name: 'Colombo',       lat: 6.9387, lng: 79.8541 },
  { name: 'Gampaha',       lat: 7.0917, lng: 79.9997 },
  { name: 'Kalutara',      lat: 6.5854, lng: 79.9607 },
  { name: 'Kandy',         lat: 7.2931, lng: 80.6350 },
  { name: 'Matale',        lat: 7.4675, lng: 80.6234 },
  { name: 'Nuwara Eliya',  lat: 6.9497, lng: 80.7891 },
  { name: 'Galle',         lat: 6.0535, lng: 80.2210 },
  { name: 'Matara',        lat: 5.9485, lng: 80.5353 },
  { name: 'Hambantota',    lat: 6.1249, lng: 81.1206 },
  { name: 'Jaffna',        lat: 9.6615, lng: 80.0255 },
  { name: 'Kilinochchi',   lat: 9.3803, lng: 80.4000 },
  { name: 'Mannar',        lat: 8.9800, lng: 79.9000 },
  { name: 'Mullaitivu',    lat: 9.2500, lng: 80.8167 },
  { name: 'Vavuniya',      lat: 8.7542, lng: 80.4985 },
  { name: 'Trincomalee',   lat: 8.5874, lng: 81.2152 },
  { name: 'Batticaloa',    lat: 7.7356, lng: 81.6942 },
  { name: 'Ampara',        lat: 7.2978, lng: 81.6790 },
  { name: 'Puttalam',      lat: 8.0343, lng: 79.8277 },
  { name: 'Kurunegala',    lat: 7.4862, lng: 80.3638 },
  { name: 'Anuradhapura',  lat: 8.3350, lng: 80.4106 },
  { name: 'Polonnaruwa',   lat: 7.9392, lng: 81.0026 },
  { name: 'Badulla',       lat: 6.8994, lng: 81.0571 },
  { name: 'Moneragala',    lat: 6.8700, lng: 81.3500 },
  { name: 'Ratnapura',     lat: 6.6667, lng: 80.4003 },
  { name: 'Kegalle',       lat: 7.2513, lng: 80.3464 },
];

function findClosestDistrict(lat, lng) {
  let idx = 0;
  let min = Infinity;
  DISTRICT_CENTROIDS.forEach((d, i) => {
    const d2 = (d.lat - lat) ** 2 + (d.lng - lng) ** 2;
    if (d2 < min) { min = d2; idx = i; }
  });
  return idx;
}

/* ─── Check if a point is likely on land (not sea) ─── */
function isLikelyOnLand(lat, lng) {
  // Find distance to closest district centroid in degrees
  let minDist = Infinity;
  DISTRICT_CENTROIDS.forEach((d) => {
    const dist = Math.sqrt((d.lat - lat) ** 2 + (d.lng - lng) ** 2);
    if (dist < minDist) minDist = dist;
  });
  // If the closest centroid is more than ~0.6 degrees away,
  // the click is likely in the sea (Sri Lanka is ~4° wide)
  return minDist < 0.6;
}

/* ─── Weather helpers ─── */
function getWeatherDesc(code) {
  if (code === 0) return { desc: 'Clear Sky', emoji: '☀️' };
  if (code >= 1 && code <= 3) return { desc: 'Partly Cloudy', emoji: '⛅' };
  if (code >= 45 && code <= 48) return { desc: 'Foggy', emoji: '🌫️' };
  if (code >= 51 && code <= 55) return { desc: 'Drizzle', emoji: '🌦️' };
  if (code >= 61 && code <= 65) return { desc: 'Rainy', emoji: '🌧️' };
  if (code >= 71 && code <= 77) return { desc: 'Snow', emoji: '❄️' };
  if (code >= 80 && code <= 82) return { desc: 'Rain Showers', emoji: '🌦️' };
  if (code >= 95 && code <= 99) return { desc: 'Thunderstorm', emoji: '⛈️' };
  return { desc: 'Cloudy', emoji: '☁️' };
}

/* ─── Risk advice ─── */
function getAdvice(level) {
  const up = level?.toUpperCase();
  if (up === 'CRITICAL') return {
    icon: '🚨', title: 'Evacuate Immediately',
    text: 'Extreme flooding danger. Move to higher ground or the nearest evacuation center right now.',
    border: '#dc2626', bg: 'rgba(220,38,38,0.08)', text_color: '#fca5a5',
  };
  if (up === 'HIGH') return {
    icon: '⚠️', title: 'High Alert — Act Now',
    text: 'Significant flood risk. Prepare emergency supplies, avoid low-lying roads, and stay tuned to local alerts.',
    border: '#ef4444', bg: 'rgba(239,68,68,0.08)', text_color: '#fca5a5',
  };
  if (up === 'MEDIUM') return {
    icon: '🔔', title: 'Stay Cautious',
    text: 'Moderate conditions. Avoid areas near rivers and canals. Monitor rainfall levels closely.',
    border: '#f59e0b', bg: 'rgba(245,158,11,0.08)', text_color: '#fde68a',
  };
  return {
    icon: '✅', title: 'Low Risk — Stay Prepared',
    text: 'No active flood threats detected. Keep emergency contacts handy and stay weather-aware.',
    border: '#10b981', bg: 'rgba(16,185,129,0.08)', text_color: '#6ee7b7',
  };
}

/* ─── Risk circle radius by score ─── */
function riskRadius(score) {
  // 2 km (low) → 10 km (critical)
  return 2000 + score * 8000;
}

/* ─── Map pin HTML ─── */
function makePinHtml(color) {
  return `
    <div style="
      width:20px; height:20px; border-radius:50%;
      background:${color};
      border:3px solid white;
      box-shadow: 0 2px 12px ${color}99, 0 0 0 4px ${color}33;
      transition: all .3s;
    "></div>`;
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
export default function UserDashboardPage() {
  const [lat, setLat] = useState(7.8731);
  const [lng, setLng] = useState(80.7718);
  const [districtIndex, setDistrictIndex] = useState(findClosestDistrict(7.8731, 80.7718));
  const [locationName, setLocationName] = useState('Sri Lanka');
  const [elevation, setElevation] = useState(20.0);
  const [manualHospitalKm, setManualHospitalKm] = useState(null);
  const [locationError, setLocationError] = useState('');

  // search
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError,   setSearchError]   = useState('');

  // results
  const [prediction,    setPrediction]    = useState(null);
  const [predictLoading,setPredictLoading]= useState(false);
  const [predictError,  setPredictError]  = useState('');

  // weather
  const [weather,       setWeather]       = useState(null);
  const [weatherLoading,setWeatherLoading]= useState(false);

  // map refs
  const mapRef        = useRef(null);
  const mapElRef      = useRef(null);
  const pinRef        = useRef(null);
  const mainCircleRef = useRef(null);
  const surroundRefs  = useRef([]);
  const locationFlyRef= useRef(false); // prevent double fly on init

  /* ── Init map ── */
  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;

    const map = L.map(mapElRef.current, {
      center: SL_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 7,
      maxZoom: 17,
      maxBounds: SL_BOUNDS,
      maxBoundsViscosity: 1.0, // hard lock — cannot pan outside
      zoomControl: false,
    });

    // Add custom zoom control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Light / clean tile (OpenStreetMap)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Click to pick — with sea-click validation
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (SL_BOUNDS.contains([lat, lng])) {
        if (isLikelyOnLand(lat, lng)) {
          setLocationError('');
          handleLocationUpdate(lat, lng);
        } else {
          setLocationError('⚠️ Invalid location — you clicked on the sea! Please select a point on land.');
          setPrediction(null);
        }
      }
    });

    // Stop user from panning outside Sri Lanka on drag end
    map.on('dragend', () => {
      if (!SL_BOUNDS.contains(map.getCenter())) {
        map.setView(SL_CENTER, DEFAULT_ZOOM, { animate: true });
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  /* ── Reverse geocode to get location name ── */
  const reverseGeocode = useCallback(async (rlat, rlng) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${rlat}&lon=${rlng}&zoom=10&accept-language=en`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const d = await r.json();
      const city =
        d.address?.city || d.address?.town || d.address?.village ||
        d.address?.county || d.address?.state_district || d.address?.state || 'Sri Lanka';
      setLocationName(city);
    } catch {
      setLocationName(DISTRICTS[districtIndex] || 'Sri Lanka');
    }
  }, [districtIndex]);

  /* ── Core location updater ── */
  const handleLocationUpdate = useCallback((newLat, newLng) => {
    const rLat = parseFloat(newLat.toFixed(4));
    const rLng = parseFloat(newLng.toFixed(4));
    setLat(rLat); setLng(rLng);

    const di = findClosestDistrict(rLat, rLng);
    setDistrictIndex(di);
    setManualHospitalKm(null); // Reset manual hospital distance on new map click

    // FlyTo with smooth animation
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      const targetZoom  = Math.max(currentZoom, 11);
      mapRef.current.flyTo([rLat, rLng], targetZoom, { duration: 1.2, easeLinearity: 0.25 });
    }

    reverseGeocode(rLat, rLng);
    fetchWeather(rLat, rLng);
    
    // Fetch elevation
    fetch(`https://api.open-meteo.com/v1/elevation?latitude=${rLat}&longitude=${rLng}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.elevation && data.elevation.length > 0) {
          setElevation(data.elevation[0]);
        }
      })
      .catch(() => setElevation(20));

    updateMapPin(rLat, rLng, prediction?.risk_color || '#0ea5e9');
  }, [prediction, reverseGeocode]);

  /* ── Update map pin & main circle ── */
  const updateMapPin = useCallback((pLat, pLng, color) => {
    if (!mapRef.current) return;

    const icon = L.divIcon({
      className: '',
      html: makePinHtml(color),
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    if (pinRef.current) {
      pinRef.current.setLatLng([pLat, pLng]).setIcon(icon);
    } else {
      pinRef.current = L.marker([pLat, pLng], { icon, zIndexOffset: 1000 }).addTo(mapRef.current);
    }

    const score = prediction?.flood_risk_score ?? 0.2;
    const radius = riskRadius(score);

    if (mainCircleRef.current) {
      mainCircleRef.current.setLatLng([pLat, pLng]);
      mainCircleRef.current.setRadius(radius);
      mainCircleRef.current.setStyle({
        fillColor: color, color,
        fillOpacity: 0.15 + score * 0.15,
        weight: 2,
      });
    } else {
      mainCircleRef.current = L.circle([pLat, pLng], {
        radius,
        fillColor: color,
        fillOpacity: 0.2,
        color,
        weight: 2,
        dashArray: '6, 5',
      }).addTo(mapRef.current);
    }
  }, [prediction]);

  /* ── Recolor when prediction arrives ── */
  useEffect(() => {
    if (prediction && mapRef.current) {
      updateMapPin(lat, lng, prediction.risk_color);
    }
  }, [prediction]);

  /* ── GPS detect ── */
  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) { handleLocationUpdate(SL_CENTER[0], SL_CENTER[1]); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        if (SL_BOUNDS.contains([latitude, longitude])) {
          handleLocationUpdate(latitude, longitude);
        } else {
          handleLocationUpdate(SL_CENTER[0], SL_CENTER[1]);
        }
      },
      () => ipLocate(),
      { timeout: 6000 }
    );
  }, [handleLocationUpdate]);

  const ipLocate = async () => {
    try {
      const r = await fetch('https://ipapi.co/json/');
      const d = await r.json();
      if (d.latitude && d.longitude && d.country_code === 'LK') {
        handleLocationUpdate(d.latitude, d.longitude);
      } else { handleLocationUpdate(SL_CENTER[0], SL_CENTER[1]); }
    } catch { handleLocationUpdate(SL_CENTER[0], SL_CENTER[1]); }
  };

  // Auto-detect on mount (once map is ready)
  useEffect(() => {
    const t = setTimeout(() => { if (!locationFlyRef.current) { locationFlyRef.current = true; handleGPS(); } }, 600);
    return () => clearTimeout(t);
  }, [handleGPS]);

  /* ── Fetch weather ── */
  const fetchWeather = useCallback(async (wLat, wLng) => {
    setWeatherLoading(true);
    try {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${wLat}&longitude=${wLng}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m` +
        `&daily=precipitation_sum&past_days=7&timezone=auto`
      );
      const d = await r.json();
      if (d.current) {
        const past7 = d.daily?.precipitation_sum?.slice(0, 7).reduce((a, b) => a + b, 0) || 0;
        setWeather({
          temp: d.current.temperature_2m,
          humidity: d.current.relative_humidity_2m,
          feelsLike: d.current.apparent_temperature,
          wind: d.current.wind_speed_10m,
          rain: d.current.precipitation,
          info: getWeatherDesc(d.current.weather_code),
          rain7d: Math.round(past7 * 10) / 10,
        });
      }
    } catch (e) { console.error(e); }
    finally { setWeatherLoading(false); }
  }, []);

  /* ── Search handler ── */
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true); setSearchError('');
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ' Sri Lanka')}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const d = await r.json();
      if (d?.length > 0) {
        const { lat: sLat, lon: sLng } = d[0];
        if (SL_BOUNDS.contains([+sLat, +sLng])) {
          handleLocationUpdate(+sLat, +sLng);
          setSearchQuery('');
        } else {
          setSearchError('Location is outside Sri Lanka.');
        }
      } else { setSearchError('Place not found. Try another name.'); }
    } catch { setSearchError('Search failed. Check your connection.'); }
    finally { setSearchLoading(false); }
  };

  /* ── Build prediction payload automatically ── */
  const buildPayload = () => {
    // 1. Get District name and default heuristics
    const districtName = DISTRICTS[districtIndex] || 'Colombo';
    const heuristics = DISTRICT_DATA_DICTIONARY[districtName] || DISTRICT_DATA_DICTIONARY['Colombo'];
    
    let rain7d = weather?.rain7d ?? 45;
    let rainMonthly = rain7d * 4;
    
    let waterFlag = heuristics.distRiver < 1000 ? 1 : 0;
    let floodEvent = rain7d > 150 ? 1 : 0;

    return {
      latitude: lat,
      longitude: lng,
      district: districtIndex,
      geo_cluster: districtIndex % 35,
      rainfall_7d_mm: rain7d,
      monthly_rainfall_mm: rainMonthly,
      elevation_m: elevation,
      distance_to_river_m: heuristics.distRiver,
      nearest_hospital_km: manualHospitalKm !== null ? manualHospitalKm : heuristics.hosp,
      nearest_evac_km: heuristics.evac,
      infrastructure_score: heuristics.infra,
      population_density_per_km2: heuristics.pop,
      landcover: heuristics.cover,
      soil_type: heuristics.soil,
      water_supply: 0,
      electricity: 0,
      road_quality: heuristics.road,
      urban_rural: heuristics.ur,
      water_presence_flag: waterFlag,
      flood_occurrence_current_event: floodEvent,
      is_good_to_live: floodEvent === 1 ? 0 : 1,
    };
  };

  /* ── Run main prediction ── */
  const handleAnalyze = async () => {
    setPredictLoading(true); setPredictError(''); setPrediction(null);
    // clear old surrounding circles
    surroundRefs.current.forEach(c => c.remove());
    surroundRefs.current = [];

    try {
      const payload = buildPayload();
      const result  = await predictFloodRisk(payload);
      setPrediction(result);
      updateMapPin(lat, lng, result.risk_color);
      fetchSurrounding(payload, result.risk_color);
    } catch (err) {
      setPredictError(err.detail || 'Prediction failed. Please try again.');
    } finally {
      setPredictLoading(false);
    }
  };

  /* ── Surrounding risk bubbles ── */
  const fetchSurrounding = async (basePayload, mainColor) => {
    const offsets = [
      { dlat:  0.12, dlng:  0.00, label: 'North' },
      { dlat: -0.12, dlng:  0.00, label: 'South' },
      { dlat:  0.00, dlng:  0.12, label: 'East'  },
      { dlat:  0.00, dlng: -0.12, label: 'West'  },
      { dlat:  0.09, dlng:  0.09, label: 'NE'    },
      { dlat: -0.09, dlng:  0.09, label: 'SE'    },
      { dlat:  0.09, dlng: -0.09, label: 'NW'    },
      { dlat: -0.09, dlng: -0.09, label: 'SW'    },
    ];

    for (const off of offsets) {
      const sLat = basePayload.latitude  + off.dlat;
      const sLng = basePayload.longitude + off.dlng;
      if (!SL_BOUNDS.contains([sLat, sLng])) continue;

      const payload = { ...basePayload, latitude: sLat, longitude: sLng, district: findClosestDistrict(sLat, sLng) };
      try {
        const res = await predictFloodRisk(payload);
        if (!mapRef.current) break;

        const score  = res.flood_risk_score;
        const color  = res.risk_color;
        const radius = riskRadius(score) * 0.75; // slightly smaller than main

        // Circle opacity & fill varies by risk score
        const fillOpacity = 0.08 + score * 0.22;

        const circle = L.circle([sLat, sLng], {
          radius,
          fillColor: color,
          fillOpacity,
          color,
          weight: score > 0.6 ? 2 : 1,
          dashArray: score > 0.6 ? '' : '4, 6',
        })
          .bindTooltip(
            `<b>${off.label}</b><br/>${res.risk_level} &mdash; ${Math.round(score * 100)}%`,
            { className: 'leaflet-tooltip-custom', direction: 'top', sticky: true }
          )
          .addTo(mapRef.current);

        surroundRefs.current.push(circle);
        await new Promise(r => setTimeout(r, 120)); // slight stagger
      } catch { /* skip */ }
    }
  };

  /* ─── Styles ─── */
  const btnGroup = (active) => ({
    padding: '8px 12px',
    borderRadius: 10,
    fontSize: '0.78rem',
    fontWeight: 600,
    border: active ? '2px solid var(--color-primary)' : '1px solid var(--color-border-subtle)',
    background: active ? 'rgba(6, 182, 212, 0.15)' : 'var(--color-bg-elevated)',
    color: active ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
    cursor: 'pointer',
    transition: 'all .2s',
    width: '100%',
  });

  const labelStyle = { display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 6 };

  /* ─── RENDER ─── */
  return (
    <div className="animate-fade-in text-text-primary" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
          Flood Risk{' '}
          <span className="bg-gradient-to-r from-primary-light via-primary to-blue-400 bg-clip-text text-transparent">
            User Dashboard
          </span>
        </h2>
        <p className="text-text-muted" style={{ fontSize: '0.875rem', marginTop: 6 }}>
          Select a location on the map or use GPS — get instant flood risk analysis and local weather.
        </p>
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,5fr) minmax(0,7fr)', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Form Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Location Card */}
          <div className="glass-card" style={{ padding: '20px 20px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📍</span> Location
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchError(''); }}
                placeholder="Search city or town…"
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 10, fontSize: '0.8rem',
                  border: '1px solid var(--color-border-subtle)', outline: 'none', color: 'var(--color-text-primary)',
                  transition: 'border .2s', background: 'var(--color-bg-elevated)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border-subtle)'}
              />
              <button
                type="submit"
                disabled={searchLoading}
                style={{
                  padding: '9px 16px', borderRadius: 10, fontSize: '0.78rem',
                  fontWeight: 700, border: 'none', cursor: searchLoading ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))', color: 'white',
                  opacity: searchLoading ? 0.6 : 1, whiteSpace: 'nowrap',
                }}
              >
                {searchLoading ? '…' : '🔍 Search'}
              </button>
            </form>

            {searchError && (
              <p style={{ color: 'var(--color-risk-high)', fontSize: '0.75rem', marginBottom: 10 }}>⚠️ {searchError}</p>
            )}

            {/* Coordinates + GPS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>COORDINATES</span>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-light)', marginTop: 2 }}>
                  {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
                </p>
              </div>
              <button
                onClick={handleGPS}
                style={{
                  padding: '7px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
                  border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  transition: 'all .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary-light)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-subtle)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
              >
                📍 My Location
              </button>
            </div>

            {/* District */}
            <div>
              <label style={labelStyle}>District</label>
              <select
                value={districtIndex}
                onChange={e => setDistrictIndex(parseInt(e.target.value))}
                className="w-full"
                style={{
                  padding: '9px 12px', borderRadius: 10,
                  fontSize: '0.82rem',
                }}
              >
                {DISTRICTS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Auto-Detected Data Card */}
          <div className="glass-card" style={{ padding: '20px 20px 16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🤖</span> Auto-Detected Environmental Data
              </div>
              <span style={{ fontSize: '0.65rem', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-primary-light)', padding: '4px 8px', borderRadius: 20, border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                Powered by AI & Satellite Data
              </span>
            </div>
            
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
              The following parameters are automatically fetched or calculated based on your selected location on the map.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 6 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Elevation</span>
                <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{elevation.toFixed(1)} m</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 6 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>7-Day Rainfall</span>
                <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{weather?.rain7d?.toFixed(1) ?? 0} mm</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 6 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Dist. to River</span>
                <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{DISTRICT_DATA_DICTIONARY[DISTRICTS[districtIndex]]?.distRiver || 2000} m</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 6 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Pop. Density</span>
                <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{DISTRICT_DATA_DICTIONARY[DISTRICTS[districtIndex]]?.pop || 1000}/km²</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 6 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Nearest Hosp.</span>
                <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{manualHospitalKm !== null ? manualHospitalKm : (DISTRICT_DATA_DICTIONARY[DISTRICTS[districtIndex]]?.hosp || 5)} km</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 6 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Infra. Score</span>
                <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{DISTRICT_DATA_DICTIONARY[DISTRICTS[districtIndex]]?.infra || 6.0}/10</span>
              </div>
            </div>
            
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Adjust Nearest Hospital Distance (km)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={manualHospitalKm !== null ? manualHospitalKm : (DISTRICT_DATA_DICTIONARY[DISTRICTS[districtIndex]]?.hosp || 5)}
                  onChange={(e) => setManualHospitalKm(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--color-primary)' }}
                />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', minWidth: 40 }}>
                  {manualHospitalKm !== null ? manualHospitalKm : (DISTRICT_DATA_DICTIONARY[DISTRICTS[districtIndex]]?.hosp || 5)}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 16, textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                *If you wish to manually override other parameters, please switch to <b>Advanced Mode</b>.
              </span>
            </div>

            {(predictError || locationError) && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 10,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <p style={{ color: '#fca5a5', fontSize: '0.78rem', fontWeight: 600 }}>{predictError || locationError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleAnalyze}
              disabled={predictLoading}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                fontWeight: 700, fontSize: '0.875rem', color: 'white',
                cursor: predictLoading ? 'not-allowed' : 'pointer',
                background: predictLoading
                  ? 'linear-gradient(135deg, var(--color-bg-elevated), var(--color-bg-card))'
                  : 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
                boxShadow: predictLoading ? 'none' : '0 4px 16px rgba(6, 182, 212, 0.25)',
                transition: 'all .25s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={e => { if (!predictLoading) e.currentTarget.style.boxShadow = '0 6px 24px rgba(6, 182, 212, 0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = predictLoading ? 'none' : '0 4px 16px rgba(6, 182, 212, 0.25)'; }}
            >
              {predictLoading
                ? <><span style={{ animation: 'spin 1s linear infinite', display:'inline-block' }}>⏳</span> Analyzing…</>
                : '🔍 Analyze Flood Risk'}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Map ── */}
        <div className="glass-card" style={{ padding: 6, position: 'relative', overflow: 'hidden' }}>
          {/* Map header */}
          <div style={{
            padding: '10px 14px 8px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-text-secondary)', display:'flex', alignItems:'center', gap:5 }}>
              🗺️ <span>Interactive Map — Sri Lanka</span>
            </span>
            <span style={{
              fontSize: '0.72rem', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-primary-light)',
              border: '1px solid var(--color-border-subtle)', borderRadius: 6, padding: '3px 8px', fontWeight: 600,
            }}>
              Click to pick location
            </span>
          </div>

          <div
            ref={mapElRef}
            style={{ width: '100%', height: 460, borderRadius: 12 }}
          />

          {/* Map legend */}
          <div style={{
            padding: '10px 14px',
            display: 'flex', gap: 12, alignItems: 'center',
            borderTop: '1px solid var(--color-border-subtle)',
          }}>
            {[['#10b981', 'Low'], ['#f59e0b', 'Medium'], ['#ef4444', 'High'], ['#dc2626', 'Critical']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{l}</span>
              </div>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              Bubbles scale with risk level
            </span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>

        {/* Result Card */}
        <div className="glass-card" style={{ padding: '20px 22px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🔮</span> Assessment Result
          </div>

          <AnimatePresence mode="wait">
            {prediction ? (
              <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Score banner */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 18px', borderRadius: 12,
                  background: prediction.risk_color + '12',
                  border: `1.5px solid ${prediction.risk_color}35`,
                }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Risk Level</p>
                    <p style={{ fontSize: '1.6rem', fontWeight: 800, color: prediction.risk_color, lineHeight: 1.2, marginTop: 2 }}>
                      {prediction.risk_level}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Probability</p>
                    <p style={{ fontSize: '2rem', fontWeight: 900, color: prediction.risk_color, lineHeight: 1 }}>
                      {Math.round(prediction.flood_risk_score * 100)}%
                    </p>
                  </div>
                  {/* Mini gauge */}
                  <div style={{ position: 'relative', width: 52, height: 52 }}>
                    <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-bg-elevated)" strokeWidth="3.5" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke={prediction.risk_color} strokeWidth="3.5"
                        strokeDasharray={`${prediction.flood_risk_score * 100} 100`} strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Advice */}
                {(() => {
                  const adv = getAdvice(prediction.risk_level);
                  return (
                    <div style={{ padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${adv.border}30`, background: adv.bg }}>
                      <p style={{ fontWeight: 700, fontSize: '0.82rem', color: adv.border, marginBottom: 4 }}>
                        {adv.icon} {adv.title}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: adv.text_color, lineHeight: 1.55 }}>{adv.text}</p>
                    </div>
                  );
                })()}

                <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 10 }}>
                  {DISTRICTS[districtIndex]} · {lat.toFixed(3)}°N {lng.toFixed(3)}°E · ID: {prediction.prediction_id.slice(0, 8)}…
                </p>

                {/* Download Report Button */}
                <DownloadReport
                  prediction={prediction}
                  weather={weather}
                  locationName={locationName}
                  districtIndex={districtIndex}
                  lat={lat}
                  lng={lng}
                  mode="user"
                />
              </motion.div>
            ) : (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem', marginBottom: 10 }}>📡</span>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Ready for Assessment</p>
                <p style={{ fontSize: '0.78rem', marginTop: 4 }}>
                  Select a location and click <strong style={{ color: 'var(--color-primary-light)' }}>Analyze Flood Risk</strong>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Weather Card */}
        <div className="glass-card" style={{ padding: '20px 22px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span>🌦️</span> Weather</span>
            {locationName && (
              <span style={{
                fontSize: '0.72rem', background: 'rgba(22, 163, 74, 0.1)', color: '#4ade80',
                border: '1px solid rgba(22, 163, 74, 0.2)', borderRadius: 6, padding: '3px 8px', fontWeight: 600,
              }}>
                📌 {locationName}
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {weatherLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[90, 70, 100, 60].map((w, i) => (
                  <div key={i} className="skeleton" style={{ height: i === 1 ? 40 : 18, width: `${w}%` }} />
                ))}
              </motion.div>
            ) : weather ? (
              <motion.div key="weather" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Main temp row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <p style={{ fontSize: '2.6rem', fontWeight: 900, color: 'var(--color-text-primary)', lineHeight: 1 }}>{weather.temp}°C</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {weather.info.emoji} {weather.info.desc} · Feels {weather.feelsLike}°C
                    </p>
                  </div>
                  <div style={{
                    textAlign: 'right', padding: '12px 16px', borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05), rgba(6, 182, 212, 0.15))',
                    border: '1px solid var(--color-border-subtle)',
                  }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-primary-light)', textTransform: 'uppercase', letterSpacing: '.06em' }}>7-Day Rainfall</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1.2 }}>{weather.rain7d}<span style={{ fontSize: '0.8rem' }}> mm</span></p>
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Humidity', val: `${weather.humidity}%`, icon: '💧' },
                    { label: 'Wind',     val: `${weather.wind} km/h`, icon: '🌬️' },
                    { label: 'Now Rain', val: `${weather.rain} mm`,   icon: '☔' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                      <p style={{ fontSize: '1.1rem', marginBottom: 2 }}>{s.icon}</p>
                      <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</p>
                      <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 2 }}>{s.val}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="wplaceholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem', marginBottom: 10 }}>🌡️</span>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Weather Loading</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Select a location to see conditions</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Inline style for keyframes */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .leaflet-tooltip-custom {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid var(--color-border-subtle);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--color-text-primary);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .leaflet-control-attribution {
          font-size: 9px;
        }
      `}</style>
    </div>
  );
}
