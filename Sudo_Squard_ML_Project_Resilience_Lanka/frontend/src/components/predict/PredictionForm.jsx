import { useState } from 'react';
import { motion } from 'framer-motion';
import { predictFloodRisk } from '../../api/client';
import {
  DISTRICTS,
  LANDCOVER_TYPES,
  SOIL_TYPES,
  WATER_SUPPLY,
  ELECTRICITY,
  ROAD_QUALITY,
  URBAN_RURAL,
} from '../../utils/constants';

const defaultValues = {
  latitude: 7.8,
  longitude: 80.6,
  district: 0,
  geo_cluster: 0,
  rainfall_7d_mm: 120,
  monthly_rainfall_mm: 450,
  elevation_m: 100,
  distance_to_river_m: 5000,
  nearest_hospital_km: 10,
  nearest_evac_km: 8,
  infrastructure_score: 5,
  population_density_per_km2: 500,
  landcover: 0,
  soil_type: 0,
  water_supply: 0,
  electricity: 0,
  road_quality: 1,
  urban_rural: 0,
  water_presence_flag: 0,
  flood_occurrence_current_event: 0,
  is_good_to_live: 1,
};

function SliderInput({ label, name, min, max, step, value, onChange, unit }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm text-text-secondary font-medium">{label}</label>
        <span className="text-sm font-semibold text-primary-light tabular-nums">
          {typeof value === 'number' ? (step < 1 ? value.toFixed(1) : value) : value}
          {unit && <span className="text-text-muted text-xs ml-1">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        name={name}
        min={min}
        max={max}
        step={step || 1}
        value={value}
        onChange={(e) => onChange(name, parseFloat(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-text-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function SelectInput({ label, name, options, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-text-secondary font-medium">{label}</label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(name, parseInt(e.target.value))}
        className="w-full"
      >
        {options.map((opt, i) => (
          <option key={i} value={i}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleInput({ label, name, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-text-secondary font-medium">{label}</label>
      <button
        type="button"
        onClick={() => onChange(name, value === 1 ? 0 : 1)}
        className={`toggle-switch ${value === 1 ? 'active' : ''}`}
        aria-label={label}
      />
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4 mt-2">
      <span className="text-lg">{icon}</span>
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{title}</h3>
      <div className="flex-1 h-px bg-gradient-to-r from-border-subtle to-transparent" />
    </div>
  );
}

export default function PredictionForm({ onResult, onLoading }) {
  const [form, setForm] = useState(defaultValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    onLoading?.(true);

    try {
      const result = await predictFloodRisk(form);
      onResult?.(result);
    } catch (err) {
      setError(err.detail || 'Prediction failed. Please try again.');
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="glass-card p-6 sm:p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <span className="text-3xl">🌊</span>
          <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">
            Flood Risk Assessment
          </span>
        </h2>
        <p className="text-text-muted text-sm mt-2">
          Enter environmental parameters to predict flood risk in real-time
        </p>
      </div>

      {/* ── Location ── */}
      <SectionHeader icon="📍" title="Location" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <SliderInput label="Latitude" name="latitude" min={5.9} max={9.9} step={0.1} value={form.latitude} onChange={handleChange} unit="°N" />
        <SliderInput label="Longitude" name="longitude" min={79.5} max={81.9} step={0.1} value={form.longitude} onChange={handleChange} unit="°E" />
        <SelectInput label="District" name="district" options={DISTRICTS} value={form.district} onChange={handleChange} />
        <SelectInput label="Geo Cluster" name="geo_cluster" options={Array.from({ length: 35 }, (_, i) => `Cluster ${i}`)} value={form.geo_cluster} onChange={handleChange} />
      </div>

      {/* ── Rainfall & Weather ── */}
      <SectionHeader icon="🌧️" title="Rainfall & Weather" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <SliderInput label="7-Day Rainfall" name="rainfall_7d_mm" min={0} max={500} step={5} value={form.rainfall_7d_mm} onChange={handleChange} unit="mm" />
        <SliderInput label="Monthly Rainfall" name="monthly_rainfall_mm" min={0} max={2000} step={10} value={form.monthly_rainfall_mm} onChange={handleChange} unit="mm" />
      </div>

      {/* ── Terrain & Geography ── */}
      <SectionHeader icon="⛰️" title="Terrain & Geography" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <SliderInput label="Elevation" name="elevation_m" min={0} max={2500} step={10} value={form.elevation_m} onChange={handleChange} unit="m" />
        <SliderInput label="Distance to River" name="distance_to_river_m" min={0} max={50000} step={500} value={form.distance_to_river_m} onChange={handleChange} unit="m" />
      </div>

      {/* ── Infrastructure ── */}
      <SectionHeader icon="🏗️" title="Infrastructure" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <SliderInput label="Nearest Hospital" name="nearest_hospital_km" min={0} max={100} step={1} value={form.nearest_hospital_km} onChange={handleChange} unit="km" />
        <SliderInput label="Nearest Evacuation" name="nearest_evac_km" min={0} max={100} step={1} value={form.nearest_evac_km} onChange={handleChange} unit="km" />
        <SliderInput label="Infrastructure Score" name="infrastructure_score" min={0} max={10} step={0.5} value={form.infrastructure_score} onChange={handleChange} />
        <SliderInput label="Population Density" name="population_density_per_km2" min={0} max={5000} step={50} value={form.population_density_per_km2} onChange={handleChange} unit="/km²" />
      </div>

      {/* ── Land & Environment ── */}
      <SectionHeader icon="🏷️" title="Land & Environment" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <SelectInput label="Land Cover" name="landcover" options={LANDCOVER_TYPES} value={form.landcover} onChange={handleChange} />
        <SelectInput label="Soil Type" name="soil_type" options={SOIL_TYPES} value={form.soil_type} onChange={handleChange} />
        <SelectInput label="Water Supply" name="water_supply" options={WATER_SUPPLY} value={form.water_supply} onChange={handleChange} />
        <SelectInput label="Electricity" name="electricity" options={ELECTRICITY} value={form.electricity} onChange={handleChange} />
        <SelectInput label="Road Quality" name="road_quality" options={ROAD_QUALITY} value={form.road_quality} onChange={handleChange} />
        <SelectInput label="Urban / Rural" name="urban_rural" options={URBAN_RURAL} value={form.urban_rural} onChange={handleChange} />
      </div>

      {/* ── Toggles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8 p-4 rounded-xl" style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
        <ToggleInput label="Water Presence" name="water_presence_flag" value={form.water_presence_flag} onChange={handleChange} />
        <ToggleInput label="Current Flood Event" name="flood_occurrence_current_event" value={form.flood_occurrence_current_event} onChange={handleChange} />
        <ToggleInput label="Safe to Live" name="is_good_to_live" value={form.is_good_to_live} onChange={handleChange} />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm text-risk-high bg-risk-high/10 border border-risk-high/20">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl font-semibold text-white text-sm tracking-wide
          transition-all duration-300 cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: loading
            ? 'rgba(6, 182, 212, 0.3)'
            : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
          boxShadow: loading ? 'none' : '0 0 20px rgba(6, 182, 212, 0.3)',
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.boxShadow = '0 0 30px rgba(6, 182, 212, 0.5)';
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.3)';
        }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing...
          </span>
        ) : (
          'Analyze Flood Risk →'
        )}
      </button>
    </motion.form>
  );
}
