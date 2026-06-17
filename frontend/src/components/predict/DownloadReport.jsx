import { useRef, useState } from 'react';
import { DISTRICTS } from '../../utils/constants';

/**
 * DownloadReport — generates a clean PDF report from prediction results.
 * Uses jspdf + html2canvas to render a hidden DOM element as a PDF.
 * Works in both User Mode and Advanced Mode.
 */
export default function DownloadReport({ prediction, weather, locationName, districtIndex, lat, lng, mode = 'user' }) {
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef(null);

  if (!prediction) return null;

  const districtName = DISTRICTS[districtIndex] || 'Unknown';
  const timestamp = prediction.timestamp ? new Date(prediction.timestamp).toLocaleString() : new Date().toLocaleString();

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const el = reportRef.current;
      if (!el) return;

      // Temporarily show the hidden report element
      el.style.display = 'block';

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#0f172a',
        logging: false,
        useCORS: true,
      });

      el.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
      pdf.save(`flood-risk-report-${districtName}-${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const riskColorMap = {
    Low: '#10b981', Medium: '#f59e0b', High: '#ef4444', Critical: '#dc2626',
  };
  const riskColor = riskColorMap[prediction.risk_level] || '#06b6d4';

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={generating}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 16px', borderRadius: 10,
          fontSize: '0.78rem', fontWeight: 700,
          border: '1px solid rgba(6, 182, 212, 0.25)',
          background: 'rgba(6, 182, 212, 0.08)',
          color: '#22d3ee',
          cursor: generating ? 'not-allowed' : 'pointer',
          opacity: generating ? 0.6 : 1,
          transition: 'all .2s',
          width: '100%', justifyContent: 'center',
        }}
        onMouseEnter={e => { if (!generating) { e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)'; e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)'; } }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)'; e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.25)'; }}
      >
        {generating ? '⏳ Generating PDF…' : '📥 Download Report'}
      </button>

      {/* Hidden report template for PDF rendering */}
      <div ref={reportRef} style={{
        display: 'none', position: 'absolute', left: '-9999px', top: 0,
        width: 800, padding: 40, fontFamily: "'Inter', 'Segoe UI', sans-serif",
        background: '#0f172a', color: '#e2e8f0',
      }}>
        {/* Header */}
        <div style={{ borderBottom: '2px solid #06b6d4', paddingBottom: 20, marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#22d3ee' }}>
            Resilience Lanka
          </h1>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Flood Risk Assessment Report
          </p>
        </div>

        {/* Location Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Location</p>
            <p style={{ fontSize: 16, fontWeight: 700 }}>{locationName || districtName}</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {lat?.toFixed(4)}°N, {lng?.toFixed(4)}°E · {districtName} District
            </p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Generated</p>
            <p style={{ fontSize: 16, fontWeight: 700 }}>{timestamp}</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              ID: {prediction.prediction_id}
            </p>
          </div>
        </div>

        {/* Risk Result */}
        <div style={{
          background: `${riskColor}12`, border: `2px solid ${riskColor}40`,
          borderRadius: 12, padding: 24, marginBottom: 24, textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Flood Risk Assessment</p>
          <p style={{ fontSize: 48, fontWeight: 900, color: riskColor, lineHeight: 1 }}>
            {Math.round(prediction.flood_risk_score * 100)}%
          </p>
          <p style={{ fontSize: 22, fontWeight: 700, color: riskColor, marginTop: 8 }}>
            {prediction.risk_level} Risk
          </p>
        </div>

        {/* Weather Info */}
        {weather && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Weather Conditions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: 'Temperature', val: `${weather.temp}°C` },
                { label: 'Humidity', val: `${weather.humidity}%` },
                { label: 'Wind', val: `${weather.wind} km/h` },
                { label: '7-Day Rain', val: `${weather.rain7d} mm` },
              ].map(s => (
                <div key={s.label} style={{ background: '#1e293b', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', marginTop: 4 }}>{s.val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature Importance (Advanced Mode) */}
        {mode === 'advanced' && prediction.feature_importance && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Model Feature Importance</h3>
            {prediction.feature_importance.map((f, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#cbd5e1' }}>{f.feature}</span>
                  <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{f.importance}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: '#1e293b', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, width: `${f.importance}%`, background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #334155', paddingTop: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 10, color: '#475569' }}>
            Generated by Resilience Lanka · Flood Risk Analytics Platform · {new Date().getFullYear()}
          </p>
          <p style={{ fontSize: 9, color: '#334155', marginTop: 4 }}>
            This report is for informational purposes only. Always follow official disaster management guidelines.
          </p>
        </div>
      </div>
    </>
  );
}
