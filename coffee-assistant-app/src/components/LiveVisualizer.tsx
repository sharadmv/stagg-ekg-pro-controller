import React, { useEffect, useRef } from 'react';

interface LiveVisualizerProps {
  analyserRef: React.RefObject<AnalyserNode | null>;
  isConnected: boolean;
}

const LiveVisualizer: React.FC<LiveVisualizerProps> = ({ analyserRef, isConnected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    // We'll set the display size via CSS, but internal resolution here
    // Assuming a max visualizer size of around 400px for mobile
    canvas.width = 400 * dpr;
    canvas.height = 400 * dpr;
    ctx.scale(dpr, dpr);

    // Virtual width/height for drawing calculations
    const width = 400;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;

    const draw = () => {
      timeRef.current += 0.01;
      ctx.clearRect(0, 0, width, height);

      // --- IDLE STATE ---
      if (!isConnected || !analyserRef.current) {
        // Breathing effect
        const breathe = (Math.sin(timeRef.current * 2) + 1) / 2; // 0 to 1
        const radius = 60 + (breathe * 10);

        // Outer glow (Brown/Orange)
        const gradient = ctx.createRadialGradient(centerX, centerY, radius - 20, centerX, centerY, radius + 40);
        gradient.addColorStop(0, 'rgba(111, 78, 55, 0.8)');   // Coffee brown
        gradient.addColorStop(0.5, 'rgba(168, 93, 29, 0.3)'); // Dark Amber
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 40, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Inner circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212, 163, 115, 0.5)'; // Gold
        ctx.lineWidth = 2;
        ctx.stroke();

        // Idle particles or subtle rotation could go here

        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      // --- ACTIVE STATE ---
      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Calculate volume/intensity
      const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
      const intensity = avg / 255; // 0.0 to 1.0

      // Base Radius grows with volume
      const baseRadius = 70 + (intensity * 30);

      // 1. Outer Glow (Dynamic Size & Color)
      const glowRadius = baseRadius + 60 + (intensity * 80);
      const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, glowRadius);
      gradient.addColorStop(0, `rgba(168, 93, 29, ${0.6 + intensity * 0.4})`); // Dark Amber core
      gradient.addColorStop(0.6, `rgba(111, 78, 55, ${0.3 + intensity * 0.2})`); // Coffee Brown mid
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // 2. Frequency Waveform (Circular)
      // We'll draw 2 mirrored semi-circles for symmetry or a full circle
      ctx.beginPath();
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        const percent = value / 255;
        const angle = (i / bufferLength) * Math.PI * 2;
        
        // Distort radius based on frequency data
        const r = baseRadius + (percent * 40) + (Math.sin(timeRef.current * 5 + i * 0.1) * 5);

        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#d4a373'; // Gold
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = 'rgba(111, 78, 55, 0.2)'; // Coffee tint fill
      ctx.fill();

      // 3. Inner Core (High energy)
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245, 158, 11, ${0.8 + intensity * 0.2})`; // Bright Amber
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#f59e0b';
      ctx.fill();
      ctx.shadowBlur = 0;

      // 4. Floating Particles (optional "fanciness")
      // Simple rotation of secondary ring
      const ringRadius = baseRadius + 20 + (intensity * 20);
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0 + timeRef.current, Math.PI * 1.5 + timeRef.current);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isConnected, analyserRef]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full object-contain"
      style={{ maxWidth: '400px', maxHeight: '400px' }}
    />
  );
};

export default LiveVisualizer;
