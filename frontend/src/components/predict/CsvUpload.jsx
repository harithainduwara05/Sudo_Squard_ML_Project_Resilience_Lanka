import { useState, useRef } from 'react';
import { predictFloodRisk } from '../../api/client';
import { DISTRICTS } from '../../utils/constants';

const MAX_ROWS = 20;

const REQUIRED_COLUMNS = [
  'latitude', 'longitude', 'district', 'rainfall_7d_mm', 'monthly_rainfall_mm',
  'elevation_m', 'distance_to_river_m', 'nearest_hospital_km', 'nearest_evac_km',
  'population_density_per_km2', 'infrastructure_score',
];

const SAMPLE_CSV = `latitude,longitude,district,rainfall_7d_mm,monthly_rainfall_mm,elevation_m,distance_to_river_m,nearest_hospital_km,nearest_evac_km,population_density_per_km2,infrastructure_score
6.9271,79.8612,0,120,350,15,800,3.5,5,3400,7
7.2931,80.635,3,80,200,500,500,5,3,700,6.5`;

function parseCsv(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
  return { headers, rows };
}

function buildPayload(row) {
  return {
    latitude: parseFloat(row.latitude) || 7.0,
    longitude: parseFloat(row.longitude) || 80.0,
    district: parseInt(row.district) || 0,
    geo_cluster: (parseInt(row.district) || 0) % 35,
    rainfall_7d_mm: parseFloat(row.rainfall_7d_mm) || 50,
    monthly_rainfall_mm: parseFloat(row.monthly_rainfall_mm) || 200,
    elevation_m: parseFloat(row.elevation_m) || 100,
    distance_to_river_m: parseFloat(row.distance_to_river_m) || 5000,
    nearest_hospital_km: parseFloat(row.nearest_hospital_km) || 10,
    nearest_evac_km: parseFloat(row.nearest_evac_km) || 15,
    population_density_per_km2: parseFloat(row.population_density_per_km2) || 500,
    infrastructure_score: parseFloat(row.infrastructure_score) || 5,
    landcover: parseInt(row.landcover) || 0,
    soil_type: parseInt(row.soil_type) || 0,
    water_supply: parseInt(row.water_supply) || 0,
    electricity: parseInt(row.electricity) || 0,
    road_quality: parseInt(row.road_quality) || 0,
    urban_rural: parseInt(row.urban_rural) || 0,
    water_presence_flag: parseInt(row.water_presence_flag) || 0,
    flood_occurrence_current_event: parseInt(row.flood_occurrence_current_event) || 0,
    is_good_to_live: parseInt(row.is_good_to_live) ?? 1,
  };
}

const riskColors = {
  Low: '#10b981', Medium: '#f59e0b', High: '#ef4444', Critical: '#dc2626',
};

export default function CsvUpload() {
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [showFormat, setShowFormat] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file only.');
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      setError('File size must be less than 1MB.');
      return;
    }

    setError('');
    setResults([]);
    setProcessing(true);
    setProgress(0);

    try {
      const text = await file.text();
      const { headers, rows } = parseCsv(text);

      // Validate headers
      const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c));
      if (missing.length > 0) {
        setError(`Missing required columns: ${missing.join(', ')}`);
        setProcessing(false);
        return;
      }

      if (rows.length === 0) {
        setError('CSV file contains no data rows.');
        setProcessing(false);
        return;
      }

      const limitedRows = rows.slice(0, MAX_ROWS);
      const batchResults = [];

      for (let i = 0; i < limitedRows.length; i++) {
        try {
          const payload = buildPayload(limitedRows[i]);
          const result = await predictFloodRisk(payload);
          batchResults.push({
            row: i + 1,
            input: limitedRows[i],
            district: DISTRICTS[payload.district] || 'Unknown',
            lat: payload.latitude,
            lng: payload.longitude,
            score: result.flood_risk_score,
            level: result.risk_level,
            color: result.risk_color,
          });
        } catch {
          batchResults.push({
            row: i + 1,
            input: limitedRows[i],
            district: 'Error',
            lat: parseFloat(limitedRows[i].latitude) || 0,
            lng: parseFloat(limitedRows[i].longitude) || 0,
            score: -1,
            level: 'Error',
            color: '#64748b',
          });
        }
        setProgress(Math.round(((i + 1) / limitedRows.length) * 100));
      }

      setResults(batchResults);
      if (rows.length > MAX_ROWS) {
        setError(`Only first ${MAX_ROWS} rows processed (${rows.length} total in file).`);
      }
    } catch {
      setError('Failed to parse CSV file.');
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const downloadResults = () => {
    if (results.length === 0) return;
    const headers = 'Row,District,Latitude,Longitude,Risk Score,Risk Level\n';
    const rows = results.map(r =>
      `${r.row},${r.district},${r.lat},${r.lng},${r.score >= 0 ? r.score.toFixed(4) : 'Error'},${r.level}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <span>📊</span> CSV Batch Prediction
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Upload a CSV file with location data to get batch flood risk predictions.
          </p>
        </div>
        <button
          onClick={() => setShowFormat(!showFormat)}
          style={{
            padding: '6px 12px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
            border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-elevated)',
            color: 'var(--color-primary-light)', cursor: 'pointer',
          }}
        >
          {showFormat ? 'Hide Format' : '📋 View Format'}
        </button>
      </div>

      {/* Format Sample */}
      {showFormat && (
        <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid var(--color-border-subtle)' }}>
          <p className="text-xs text-text-muted mb-2 font-semibold">Required CSV Format (max {MAX_ROWS} rows):</p>
          <div style={{ overflow: 'auto', maxHeight: 200 }}>
            <pre style={{ fontSize: '0.68rem', color: 'var(--color-primary-light)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {SAMPLE_CSV}
            </pre>
          </div>
          <p className="text-xs text-text-muted mt-3">
            <strong>Required:</strong> {REQUIRED_COLUMNS.join(', ')}
          </p>
          <p className="text-xs text-text-muted mt-1">
            <strong>Optional:</strong> landcover, soil_type, water_supply, electricity, road_quality, urban_rural, water_presence_flag
          </p>
          <p className="text-xs text-text-muted mt-1">
            <strong>District codes:</strong> 0=Colombo, 1=Gampaha, 2=Kalutara, 3=Kandy ... (0-24)
          </p>
        </div>
      )}

      {/* Upload Area */}
      <div style={{
        border: '2px dashed var(--color-border-subtle)', borderRadius: 12,
        padding: '24px 16px', textAlign: 'center', marginBottom: 16,
        background: processing ? 'rgba(6,182,212,0.03)' : 'transparent',
        transition: 'all .2s',
      }}>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFile}
          disabled={processing}
          style={{ display: 'none' }}
          id="csv-upload-input"
        />
        <label htmlFor="csv-upload-input" style={{
          cursor: processing ? 'not-allowed' : 'pointer', display: 'block',
        }}>
          {processing ? (
            <div>
              <p className="text-sm text-primary-light font-semibold mb-2">Processing… {progress}%</p>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--color-bg-elevated)', overflow: 'hidden', maxWidth: 300, margin: '0 auto' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${progress}%`, background: '#06b6d4', transition: 'width .3s' }} />
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '2rem', marginBottom: 8 }}>📁</p>
              <p className="text-sm text-text-secondary font-medium">Click to upload CSV file</p>
              <p className="text-xs text-text-muted mt-1">Max {MAX_ROWS} rows · .csv only · Max 1MB</p>
            </>
          )}
        </label>
      </div>

      {error && (
        <p style={{ color: 'var(--color-risk-high)', fontSize: '0.75rem', marginBottom: 12 }}>⚠️ {error}</p>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-text-secondary font-semibold">
              Results ({results.length} predictions)
            </p>
            <button
              onClick={downloadResults}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
                border: '1px solid rgba(6,182,212,0.25)', background: 'rgba(6,182,212,0.08)',
                color: '#22d3ee', cursor: 'pointer',
              }}
            >
              📥 Download CSV
            </button>
          </div>
          <div style={{ overflow: 'auto', maxHeight: 400, borderRadius: 10, border: '1px solid var(--color-border-subtle)' }}>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-elevated)', position: 'sticky', top: 0 }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>District</th>
                  <th style={thStyle}>Lat</th>
                  <th style={thStyle}>Lng</th>
                  <th style={thStyle}>Rainfall (7d)</th>
                  <th style={thStyle}>Elevation</th>
                  <th style={thStyle}>Risk Score</th>
                  <th style={thStyle}>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.row} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={tdStyle}>{r.row}</td>
                    <td style={tdStyle}>{r.district}</td>
                    <td style={tdStyle}>{r.lat?.toFixed(3)}</td>
                    <td style={tdStyle}>{r.lng?.toFixed(3)}</td>
                    <td style={tdStyle}>{r.input?.rainfall_7d_mm || '-'}</td>
                    <td style={tdStyle}>{r.input?.elevation_m || '-'}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: r.color }}>
                      {r.score >= 0 ? (r.score * 100).toFixed(1) + '%' : 'Error'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                        fontSize: '0.68rem', fontWeight: 700,
                        background: `${riskColors[r.level] || '#64748b'}20`,
                        color: riskColors[r.level] || '#64748b',
                        border: `1px solid ${riskColors[r.level] || '#64748b'}30`,
                      }}>
                        {r.level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: 'left', padding: '10px 12px',
  color: 'var(--color-text-muted)', fontSize: '0.68rem',
  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
};

const tdStyle = {
  padding: '10px 12px', color: 'var(--color-text-secondary)',
};
