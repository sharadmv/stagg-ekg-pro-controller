import React, { useEffect, useRef } from 'react';

interface FloatingVisualizerProps {
    analyserRef: React.RefObject<AnalyserNode | null>;
    onClick: () => void;
}

const FloatingVisualizer: React.FC<FloatingVisualizerProps> = ({ analyserRef, onClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = 64;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        const draw = () => {
            ctx.clearRect(0, 0, size, size);

            let volume = 0;
            if (analyserRef.current) {
                const analyser = analyserRef.current;
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(dataArray);
                const relevantData = dataArray.slice(0, dataArray.length / 4);
                volume = Array.from(relevantData).reduce((a, b) => a + b, 0) / relevantData.length;
            }

            const normalizedVol = volume / 255;
            const baseRadius = 20;
            const time = performance.now() / 1000;

            const layers = [
                { color: 'rgba(111, 78, 55, 0.4)', speed: 2.0, frequency: 4, amplitude: 3 },
                { color: 'rgba(168, 93, 29, 0.5)', speed: 3.0, frequency: 5, amplitude: 4 },
                { color: 'rgba(212, 163, 115, 0.6)', speed: 4.0, frequency: 3, amplitude: 5 }
            ];

            ctx.save();
            ctx.translate(size / 2, size / 2);
            ctx.globalCompositeOperation = 'screen';

            layers.forEach((layer, i) => {
                ctx.beginPath();
                const amplitudeMultiplier = 0.5 + (normalizedVol * 2.5);
                const currentAmplitude = layer.amplitude * amplitudeMultiplier;

                for (let theta = 0; theta <= Math.PI * 2; theta += 0.1) {
                    // Circular standing wave formula
                    // We use multiple sines for complexity
                    const wave1 = Math.sin(theta * layer.frequency) * Math.cos(time * layer.speed + i);
                    const wave2 = Math.sin(theta * (layer.frequency * 2)) * Math.cos(time * layer.speed * 0.8);

                    const normalizedY = (wave1 + wave2 * 0.5) / 1.5;
                    const r = baseRadius + (normalizedY * currentAmplitude);

                    const x = Math.cos(theta) * r;
                    const y = Math.sin(theta) * r;

                    if (theta === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }

                ctx.closePath();
                ctx.strokeStyle = layer.color;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Subtle fill for the "body"
                ctx.fillStyle = layer.color.replace('0.6', '0.1').replace('0.5', '0.1').replace('0.4', '0.1');
                ctx.fill();
            });

            // Center glow
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius);
            glow.addColorStop(0, '#D4A373');
            glow.addColorStop(1, 'rgba(212, 163, 115, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, baseRadius - 2 + (normalizedVol * 2), 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [analyserRef]);

    return (
        <button
            onClick={onClick}
            className="fixed bottom-24 right-6 w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-[70] drop-shadow-[0_0_15px_rgba(212,163,115,0.3)] animate-in fade-in zoom-in duration-500"
            title="Return to Assistant"
        >
            <canvas ref={canvasRef} className="w-full h-full" />
        </button>
    );
};

export default FloatingVisualizer;
