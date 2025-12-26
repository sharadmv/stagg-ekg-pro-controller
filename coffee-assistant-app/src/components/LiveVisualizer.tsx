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

    // Handle high DPI and resizing
    const resize = () => {
       const parent = canvas.parentElement;
       if (parent) {
           // We use the parent's width, but we might want the height to match the container
           // The container is absolutely positioned, so we can just fill it.
           canvas.width = parent.clientWidth * window.devicePixelRatio;
           canvas.height = parent.clientHeight * window.devicePixelRatio;
           // Scale context to match device pixel ratio
           ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
           // Style width/height
           canvas.style.width = `${parent.clientWidth}px`;
           canvas.style.height = `${parent.clientHeight}px`;
       }
    };

    window.addEventListener('resize', resize);
    resize(); // Initial sizing

    const draw = () => {
      // Logic variables
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      timeRef.current += 0.02; // Faster time base for high frequency movement
      ctx.clearRect(0, 0, width, height);

      // --- CONFIGURATION ---
      // Coffee Palette: Brown (#6F4E37), Amber (#A85D1D), Gold (#D4A373)
      // We want to create a "Glow" effect, so we use lighter variants and transparency.

      let amplitudeMultiplier = 0.1; // Idle state amplitude (very low)

      if (isConnected && analyserRef.current) {
        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        // Focus on lower frequencies for "bass" movement which usually looks better on waves
        const relevantData = dataArray.slice(0, bufferLength / 2);
        const avg = relevantData.reduce((a, b) => a + b, 0) / relevantData.length;

        // Map 0-255 to a multiplier.
        // Idle is 0.1. Active can go up to 1.5 or 2.0 depending on volume.
        const normalizedVol = avg / 255;
        amplitudeMultiplier = 0.2 + (normalizedVol * 1.5);

        // Speed up time slightly with volume
        timeRef.current += normalizedVol * 0.05;
      }

      // We will draw 3 layers of waves
      const layers = [
        {
          colorStart: 'rgba(111, 78, 55, 0.4)', // Coffee Brown
          colorEnd: 'rgba(111, 78, 55, 0)',
          speed: 2.0,
          offset: 0,
          frequency: 0.002, // Lower frequency = wider waves
          heightOffset: 20 // Moves the wave up/down
        },
        {
          colorStart: 'rgba(168, 93, 29, 0.5)', // Dark Amber
          colorEnd: 'rgba(168, 93, 29, 0)',
          speed: 3.0,
          offset: 2,
          frequency: 0.003,
          heightOffset: 10
        },
        {
          colorStart: 'rgba(212, 163, 115, 0.6)', // Gold
          colorEnd: 'rgba(212, 163, 115, 0)',
          speed: 4.0,
          offset: 4,
          frequency: 0.004,
          heightOffset: 0
        }
      ];

      // Global Composite Operation "screen" or "lighter" makes overlaps glow
      ctx.globalCompositeOperation = 'screen';

      layers.forEach(layer => {
         ctx.beginPath();

         const waveHeight = height * 0.3 * amplitudeMultiplier; // Max height of wave peaks
         const baseHeight = height; // Bottom of canvas

         ctx.moveTo(0, baseHeight);

         for (let x = 0; x <= width; x += 10) {
            // Sine wave formula for Standing Wave: y = A * sin(B * x + Offset) * cos(Time * Speed)
            // This creates nodes that don't travel horizontally.

            // We use multiple sines for organic look
            // Note: separation of spatial (x) and temporal (time) terms
            const y1 = Math.sin(x * layer.frequency + layer.offset) * Math.cos(timeRef.current * layer.speed);
            const y2 = Math.sin(x * (layer.frequency * 2) + layer.offset * 1.5) * Math.cos(timeRef.current * layer.speed * 1.5);

            // Combine them and normalize slightly
            const normalizedY = (y1 + y2 * 0.5) / 1.5;

            // Calculate final Y position.
            // We want the wave to be at the bottom, so we subtract from height.
            // Lift the baseline to height * 0.5 (middle of canvas) to be behind text
            const y = height - (normalizedY * waveHeight) - (height * 0.5);

            ctx.lineTo(x, y);
         }

         ctx.lineTo(width, baseHeight);
         ctx.closePath();

         // Gradient Fill
         // Gradient goes from the "peak" of the wave down to the bottom?
         // Or strictly vertical gradient on the canvas?
         // Let's do a vertical gradient based on the wave bounding box essentially.
         const gradient = ctx.createLinearGradient(0, height - (height * 0.6), 0, height);
         gradient.addColorStop(0, layer.colorEnd); // Top (transparent)
         gradient.addColorStop(1, layer.colorStart); // Bottom (color)

         ctx.fillStyle = gradient;
         ctx.fill();
      });

      // Restore default composite operation for next frame (though we clear rect anyway)
      ctx.globalCompositeOperation = 'source-over';

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isConnected, analyserRef]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block"
    />
  );
};

export default LiveVisualizer;
