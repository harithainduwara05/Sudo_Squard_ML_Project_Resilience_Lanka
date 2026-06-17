import { useState, useRef } from 'react';
import { predictFloodRisk } from '../../api/client';
import { DISTRICTS } from '../../utils/constants';


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
  const parseNum = (val, defaultVal, min, max) => {
    const parsed = parseFloat(val);
    const num = isNaN(parsed) ? defaultVal : parsed;
    if (min !== undefined && num < min) return min;
    if (max !== undefined && num > max) return max;
    return num;
  };

  const parseIntSafe = (val, defaultVal, min, max) => {
    const parsed = parseInt(val, 10);
    const num = isNaN(parsed) ? defaultVal : parsed;
    if (min !== undefined && num < min) return min;
    if (max !== undefined && num > max) return max;
    return num;
  };

  const parseDistrict = (val) => {
    if (!val) return 0;
    if (!isNaN(parseInt(val, 10))) return parseInt(val, 10);
    const idx = DISTRICTS.findIndex(d => d.toLowerCase() === String(val).trim().toLowerCase());
    return idx !== -1 ? idx : 0;
  };

  const district = parseDistrict(row.district);
  const clampedDistrict = district < 0 ? 0 : (district > 25 ? 25 : district);

  return {
    latitude: parseNum(row.latitude, 7.0, 5.9, 9.9),
    longitude: parseNum(row.longitude, 80.0, 79.5, 81.9),
    district: clampedDistrict,
    geo_cluster: clampedDistrict % 35,
    rainfall_7d_mm: parseNum(row.rainfall_7d_mm, 50.0, 0.0, 500.0),
    monthly_rainfall_mm: parseNum(row.monthly_rainfall_mm, 200.0, 0.0, 2000.0),
    elevation_m: parseNum(row.elevation_m, 100.0, 0.0, 2500.0),
    distance_to_river_m: parseNum(row.distance_to_river_m, 5000.0, 0.0, 50000.0),
    nearest_hospital_km: parseNum(row.nearest_hospital_km, 10.0, 0.0, 100.0),
    nearest_evac_km: parseNum(row.nearest_evac_km, 15.0, 0.0, 100.0),
    population_density_per_km2: parseNum(row.population_density_per_km2, 500.0, 0.0, 5000.0),
    infrastructure_score: parseNum(row.infrastructure_score, 5.0, 0.0, 10.0),
    landcover: parseIntSafe(row.landcover, 0, 0, 10),
    soil_type: parseIntSafe(row.soil_type, 0, 0, 10),
    water_supply: parseIntSafe(row.water_supply, 0, 0, 5),
    electricity: parseIntSafe(row.electricity, 0, 0, 5),
    road_quality: parseIntSafe(row.road_quality, 0, 0, 5),
    urban_rural: parseIntSafe(row.urban_rural, 0, 0, 2),
    water_presence_flag: parseIntSafe(row.water_presence_flag, 0, 0, 1),
    flood_occurrence_current_event: parseIntSafe(row.flood_occurrence_current_event, 0, 0, 1),
    is_good_to_live: parseIntSafe(row.is_good_to_live, 1, 0, 1),
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
  const [generatingPdf, setGeneratingPdf] = useState(false);
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

      const batchResults = [];
      for (let i = 0; i < rows.length; i++) {
        try {
          const payload = buildPayload(rows[i]);
          const result = await predictFloodRisk(payload);
          batchResults.push({
            row: i + 1,
            input: rows[i],
            district: DISTRICTS[payload.district] || 'Unknown',
            lat: payload.latitude,
            lng: payload.longitude,
            score: result.flood_risk_score,
            level: result.risk_level,
            color: result.risk_color,
          });
        } catch (err) {
          batchResults.push({
            row: i + 1,
            input: rows[i],
            district: 'Error',
            lat: parseFloat(rows[i].latitude) || 0,
            lng: parseFloat(rows[i].longitude) || 0,
            score: -1,
            level: 'Error',
            color: '#64748b',
          });
        }
        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      setResults(batchResults);
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

  const downloadPdf = async () => {
    if (results.length === 0) return;
    setGeneratingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF('p', 'pt', 'a4');
      const timestamp = new Date().toLocaleString();

      // Header
      doc.setFontSize(22);
      doc.setTextColor(34, 211, 238); // Cyan
      doc.text('Resilience Lanka', 40, 50);

      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text('Bulk Flood Risk Assessment Report', 40, 70);
      doc.text(`Generated: ${timestamp} | Total Predictions: ${results.length}`, 40, 85);

      // Data formatting
      const tableData = results.map(r => [
        r.row,
        r.district,
        r.lat?.toFixed(3) || '-',
        r.lng?.toFixed(3) || '-',
        r.input?.rainfall_7d_mm || '-',
        r.input?.elevation_m || '-',
        r.score >= 0 ? (r.score * 100).toFixed(1) + '%' : 'Error',
        r.level
      ]);

      autoTable(doc, {
        startY: 110,
        head: [['#', 'District', 'Lat', 'Lng', 'Rain (7d)', 'Elev', 'Risk %', 'Risk Level']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, lineColor: [51, 65, 85], lineWidth: 1 },
        bodyStyles: { fillColor: [30, 41, 59], textColor: 226, lineColor: [51, 65, 85], lineWidth: 1 },
        alternateRowStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 8, cellPadding: 4, halign: 'center' },
        columnStyles: {
          6: { fontStyle: 'bold' },
          7: { fontStyle: 'bold' }
        },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 7) {
            const val = data.cell.raw;
            if (val === 'Critical') data.cell.styles.textColor = [239, 68, 68];
            else if (val === 'High') data.cell.styles.textColor = [248, 113, 113];
            else if (val === 'Medium') data.cell.styles.textColor = [251, 191, 36];
            else if (val === 'Low') data.cell.styles.textColor = [52, 211, 153];
            else data.cell.styles.textColor = [148, 163, 184];
          }
          if (data.section === 'body' && data.column.index === 6) {
            const val = data.row.raw[7];
            if (val === 'Critical') data.cell.styles.textColor = [239, 68, 68];
            else if (val === 'High') data.cell.styles.textColor = [248, 113, 113];
            else if (val === 'Medium') data.cell.styles.textColor = [251, 191, 36];
            else if (val === 'Low') data.cell.styles.textColor = [52, 211, 153];
          }
        }
      });

      doc.save(`bulk-risk-report-${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setError('Failed to generate PDF. Please ensure all libraries are loaded.');
    } finally {
      setGeneratingPdf(false);
    }
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
          <p className="text-xs text-text-muted mb-2 font-semibold">Required CSV Format (Unlimited rows):</p>
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
              <p className="text-xs text-text-muted mt-1">Unlimited rows · .csv only · Max 1MB</p>
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
            <div className="flex gap-2">
              <button
                onClick={downloadPdf}
                disabled={generatingPdf}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
                  border: '1px solid rgba(139,92,246,0.25)', background: 'rgba(139,92,246,0.08)',
                  color: '#c4b5fd', cursor: generatingPdf ? 'not-allowed' : 'pointer',
                  opacity: generatingPdf ? 0.6 : 1, transition: 'all 0.2s'
                }}
              >
                {generatingPdf ? '⏳ Generating…' : '📥 Download PDF'}
              </button>
              <button
                onClick={downloadResults}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
                  border: '1px solid rgba(6,182,212,0.25)', background: 'rgba(6,182,212,0.08)',
                  color: '#22d3ee', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                📥 Download CSV
              </button>
            </div>
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
