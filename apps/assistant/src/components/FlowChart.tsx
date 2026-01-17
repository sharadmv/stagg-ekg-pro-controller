import React, { useMemo } from 'react';

interface Sample {
  t: number;
  w: number;
}

interface FlowChartProps {
  samples: Sample[];
  height?: number;
  className?: string;
}

const FlowChart: React.FC<FlowChartProps> = ({ samples, height = 150, className = "" }) => {
  const chartData = useMemo(() => {
    if (samples.length < 2) return null;

    const maxWeight = Math.max(...samples.map(s => s.w), 10);
    const maxTime = Math.max(...samples.map(s => s.t), 1);
    
    // Calculate flow rate (g/s) using a sliding window (e.g., 1 second)
    const flowData: { t: number; f: number }[] = [];
    const windowSize = 1.0; // seconds

    for (let i = 1; i < samples.length; i++) {
      const currentT = samples[i].t;
      // Find a sample about windowSize ago
      let prevIdx = i - 1;
      while (prevIdx > 0 && currentT - samples[prevIdx].t < windowSize) {
        prevIdx--;
      }

      const dt = currentT - samples[prevIdx].t;
      if (dt > 0.2) { // Minimum delta time to avoid noise
        const dw = samples[i].w - samples[prevIdx].w;
        const flowRate = dw / dt;
        flowData.push({ t: currentT, f: Math.max(0, flowRate) });
      }
    }

    const maxFlow = Math.max(...flowData.map(d => d.f), 5);

    return {
      samples,
      flowData,
      maxWeight,
      maxTime,
      maxFlow
    };
  }, [samples]);

  if (!chartData || samples.length < 2) {
    return (
      <div className={`flex items-center justify-center bg-black/20 rounded-2xl border border-white/5 ${className}`} style={{ height }}>
        <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Waiting for data...</p>
      </div>
    );
  }

  const { maxWeight, maxTime, maxFlow, flowData } = chartData;
  const padding = 20;
  const viewWidth = 400;
  const viewHeight = height;
  const graphWidth = viewWidth - padding * 2;
  const graphHeight = viewHeight - padding * 2;

  // Ensure we don't divide by zero and have a minimum time window for better visualization
  const displayMaxTime = Math.max(maxTime, 30); 
  const displayMaxWeight = Math.max(maxWeight, 100);
  const displayMaxFlow = Math.max(maxFlow, 2);

  const getX = (t: number) => padding + (t / displayMaxTime) * graphWidth;
  const getYWeight = (w: number) => viewHeight - padding - (w / displayMaxWeight) * graphHeight;
  const getYFlow = (f: number) => viewHeight - padding - (f / displayMaxFlow) * graphHeight;

  // Generate paths with safety checks
  const weightPath = samples.length > 0 
    ? samples.map((s, i) => `${i === 0 ? 'M' : 'L'} ${getX(s.t).toFixed(2)} ${getYWeight(s.w).toFixed(2)}`).join(' ')
    : '';
    
  const flowPath = flowData.length > 0
    ? flowData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.t).toFixed(2)} ${getYFlow(d.f).toFixed(2)}`).join(' ')
    : '';

  return (
    <div className={`bg-black/20 rounded-2xl border border-white/5 p-2 overflow-hidden ${className}`}>
      <div className="flex justify-between items-center mb-1 px-2">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-coffee-gold" />
           <span className="text-[8px] font-black text-coffee-gold uppercase">Weight ({samples[samples.length-1].w.toFixed(1)}g)</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-sky-500" />
           <span className="text-[8px] font-black text-sky-500 uppercase">Flow ({flowData.length > 0 ? flowData[flowData.length-1].f.toFixed(1) : '0.0'} g/s)</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="w-full h-auto overflow-visible">
        {/* Y Axis Grid Lines */}
        <line x1={padding} y1={viewHeight - padding} x2={viewWidth - padding} y2={viewHeight - padding} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={viewHeight - padding} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        
        {/* Weight Area */}
        {weightPath && (
          <path
            d={`${weightPath} L ${getX(samples[samples.length-1].t).toFixed(2)} ${viewHeight - padding} L ${padding} ${viewHeight - padding} Z`}
            fill="rgba(212, 163, 115, 0.15)"
          />
        )}
        {/* Weight Path */}
        {weightPath && (
          <path
            d={weightPath}
            fill="none"
            stroke="#D4A373"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Flow Rate Path */}
        {flowPath && (
          <path
            d={flowPath}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="1.5"
            strokeDasharray="2 2"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="opacity-80"
          />
        )}
      </svg>
    </div>
  );
};

export default FlowChart;
