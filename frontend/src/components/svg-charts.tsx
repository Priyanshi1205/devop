import React from 'react';

// Common Chart Container interface
interface ChartProps {
  data?: number[];
  labels?: string[];
  color?: string;
  height?: number;
}

// 1. Traffic Growth (Area Chart with Linear Gradient)
export const TrafficAreaChart: React.FC<ChartProps> = ({
  data = [12000, 14500, 13000, 16800, 19200, 18500, 22400],
  labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  color = '#6366f1',
  height = 200,
}) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = range * 0.1;

  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 90 - ((val - min + padding) / (range + padding * 2)) * 70; // Map value to 15-85% height
    return { x, y, val };
  });

  const pathD = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    '',
  );
  
  const areaD = `${pathD} L 100 90 L 0 90 Z`;

  return (
    <div className="w-full">
      <svg viewBox="0 0 100 100" className="w-full overflow-visible" style={{ height }}>
        <defs>
          <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        
        {/* Horizontal grid lines */}
        <line x1="0" y1="20" x2="100" y2="20" stroke="#1e293b" strokeWidth="0.25" strokeDasharray="1" />
        <line x1="0" y1="55" x2="100" y2="55" stroke="#1e293b" strokeWidth="0.25" strokeDasharray="1" />
        <line x1="0" y1="90" x2="100" y2="90" stroke="#1e293b" strokeWidth="0.5" />
        
        {/* Area fill */}
        <path d={areaD} fill="url(#trafficGrad)" />
        
        {/* Line stroke */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i} className="group cursor-pointer">
            <circle cx={p.x} cy={p.y} r="1.5" fill="#070a13" stroke={color} strokeWidth="1" />
            <circle cx={p.x} cy={p.y} r="4" fill={color} opacity="0" className="hover:opacity-20 transition-opacity" />
          </g>
        ))}
      </svg>
      {/* Labels */}
      <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-1">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  );
};

// 2. Keyword Growth (Bar Chart with Rounded Corners)
export const KeywordBarChart: React.FC<ChartProps> = ({
  data = [420, 510, 480, 690, 810, 950, 1100],
  labels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'],
  color = '#10b981',
  height = 200,
}) => {
  const max = Math.max(...data);
  
  return (
    <div className="w-full">
      <svg viewBox="0 0 100 100" className="w-full overflow-visible" style={{ height }}>
        <line x1="0" y1="20" x2="100" y2="20" stroke="#1e293b" strokeWidth="0.25" strokeDasharray="1" />
        <line x1="0" y1="55" x2="100" y2="55" stroke="#1e293b" strokeWidth="0.25" strokeDasharray="1" />
        <line x1="0" y1="90" x2="100" y2="90" stroke="#1e293b" strokeWidth="0.5" />

        {data.map((val, i) => {
          const w = 6;
          const x = (i / data.length) * 100 + 4;
          const h = (val / max) * 70;
          const y = 90 - h;
          
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={w}
              height={h}
              rx="1.5"
              fill={color}
              className="hover:opacity-85 transition-opacity cursor-pointer"
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-3">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  );
};

// 3. AI Visibility Growth (Spline Line Chart)
export const AiVisibilityLineChart: React.FC<ChartProps> = ({
  data = [12, 18, 15, 34, 45, 42, 58],
  labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
  color = '#a855f7',
  height = 200,
}) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 85 - ((val - min) / range) * 65; // Map to 20-85% height
    return { x, y };
  });

  const pathD = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    '',
  );

  return (
    <div className="w-full">
      <svg viewBox="0 0 100 100" className="w-full overflow-visible" style={{ height }}>
        <line x1="0" y1="20" x2="100" y2="20" stroke="#1e293b" strokeWidth="0.25" strokeDasharray="1" />
        <line x1="0" y1="55" x2="100" y2="55" stroke="#1e293b" strokeWidth="0.25" strokeDasharray="1" />
        <line x1="0" y1="90" x2="100" y2="90" stroke="#1e293b" strokeWidth="0.5" />

        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />

        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="#070a13" stroke={color} strokeWidth="1.25" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-1">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  );
};

// 4. GEO Growth (Radial-like Spline Chart)
export const GeoGrowthChart: React.FC<ChartProps> = ({
  data = [45, 52, 50, 68, 72, 75, 84],
  labels = ['May 1', 'May 8', 'May 15', 'May 22', 'May 29', 'Jun 5', 'Jun 12'],
  color = '#ec4899',
  height = 200,
}) => {
  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 90 - (val / 100) * 75; // Map percentage (0-100) to height
    return { x, y };
  });

  const pathD = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    '',
  );

  return (
    <div className="w-full">
      <svg viewBox="0 0 100 100" className="w-full overflow-visible" style={{ height }}>
        <line x1="0" y1="15" x2="100" y2="15" stroke="#1e293b" strokeWidth="0.2" strokeDasharray="2" />
        <line x1="0" y1="40" x2="100" y2="40" stroke="#1e293b" strokeWidth="0.2" strokeDasharray="2" />
        <line x1="0" y1="65" x2="100" y2="65" stroke="#1e293b" strokeWidth="0.2" strokeDasharray="2" />
        <line x1="0" y1="90" x2="100" y2="90" stroke="#1e293b" strokeWidth="0.5" />

        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="#070a13" stroke={color} strokeWidth="1.25" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-1">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  );
};

// 5. Backlink Growth (Dual Line / Area Chart)
export const BacklinkGrowthChart: React.FC<ChartProps> = ({
  data = [1200, 1340, 1500, 1420, 1800, 2100, 2450],
  labels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'],
  color = '#06b6d4',
  height = 200,
}) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 85 - ((val - min) / range) * 65;
    return { x, y };
  });

  const pathD = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    '',
  );

  return (
    <div className="w-full">
      <svg viewBox="0 0 100 100" className="w-full overflow-visible" style={{ height }}>
        <line x1="0" y1="20" x2="100" y2="20" stroke="#1e293b" strokeWidth="0.25" strokeDasharray="1" />
        <line x1="0" y1="55" x2="100" y2="55" stroke="#1e293b" strokeWidth="0.25" strokeDasharray="1" />
        <line x1="0" y1="90" x2="100" y2="90" stroke="#1e293b" strokeWidth="0.5" />

        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="#070a13" stroke={color} strokeWidth="1.25" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-2">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  );
};
