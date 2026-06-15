import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { simulateRisk } from '../../api/client';

export default function SimulationWidget({ baseRequest }) {
  const [targetFeature, setTargetFeature] = useState('rainfall_7d_mm');
  const [loading, setLoading] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [error, setError] = useState('');

  const features = [
    { id: 'rainfall_7d_mm', label: '7-Day Rainfall (mm)', min: 0, max: 500, current: baseRequest.rainfall_7d_mm },
    { id: 'monthly_rainfall_mm', label: 'Monthly Rainfall (mm)', min: 0, max: 2000, current: baseRequest.monthly_rainfall_mm },
    { id: 'elevation_m', label: 'Elevation (m)', min: 0, max: 2500, current: baseRequest.elevation_m },
    { id: 'distance_to_river_m', label: 'Distance to River (m)', min: 0, max: 50000, current: baseRequest.distance_to_river_m },
  ];

  const handleSimulate = async () => {
    setLoading(true);
    setError('');
    try {
      const selectedFeature = features.find(f => f.id === targetFeature);
      const requestPayload = {
        base_request: baseRequest,
        target_feature: selectedFeature.id,
        min_value: selectedFeature.min,
        max_value: selectedFeature.max,
        steps: 15
      };
      
      const res = await simulateRisk(requestPayload);
      setSimulationData({
        feature: selectedFeature,
        points: res.data_points
      });
    } catch (err) {
      setError(err.detail || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800/95 border border-primary/20 backdrop-blur-md p-3 rounded-lg shadow-xl">
          <p className="text-text-secondary text-xs mb-1">{simulationData.feature.label}</p>
          <p className="text-primary-light font-bold text-lg mb-2">{label}</p>
          <div className="flex justify-between items-center gap-4">
            <span className="text-text-muted text-xs">Risk Score:</span>
            <span className="font-mono text-sm" style={{ color: data.risk_color }}>
              {data.risk_score.toFixed(2)} ({data.risk_level})
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card p-6 border-l-4 mt-6" style={{ borderColor: '#06b6d4' }}>
      <div className="flex items-center gap-2 mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
        </svg>
        <h3 className="font-semibold text-text-primary">What-If Scenario Simulation</h3>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          Researcher Only
        </span>
      </div>
      
      <p className="text-sm text-text-muted mb-5">
        Explore how changing a specific environmental parameter affects the flood risk score while keeping all other inputs constant.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">
            Target Parameter
          </label>
          <select 
            className="w-full bg-slate-800/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            value={targetFeature}
            onChange={(e) => setTargetFeature(e.target.value)}
          >
            {features.map(f => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="sm:self-end">
          <button
            onClick={handleSimulate}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-primary to-blue-500 hover:from-primary-light hover:to-blue-400 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center min-w-[140px]"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : 'Run Simulation'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {simulationData && (
        <div className="mt-6 animate-fade-in">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={simulationData.points} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="value" 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis 
                  domain={[0, 1]} 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => val.toFixed(1)}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '5 5' }} />
                
                {/* Reference line for Current Value */}
                <ReferenceLine 
                  x={simulationData.feature.current} 
                  stroke="#38bdf8" 
                  strokeDasharray="3 3" 
                  label={{ position: 'top', value: 'Current', fill: '#38bdf8', fontSize: 10 }} 
                />
                
                <Line 
                  type="monotone" 
                  dataKey="risk_score" 
                  stroke="url(#colorRisk)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#1e293b', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-[10px] text-text-muted mt-2 px-6 uppercase tracking-wider">
            <span>Low Value</span>
            <span>{simulationData.feature.label}</span>
            <span>High Value</span>
          </div>
        </div>
      )}
    </div>
  );
}
