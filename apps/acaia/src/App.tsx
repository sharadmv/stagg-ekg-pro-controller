import { useState, useEffect, useRef } from 'react'
import { AcaiaScale } from '@coffee-tools/acaia-sdk'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const acaia = new AcaiaScale();

function App() {
    const [status, setStatus] = useState('Disconnected');
    const [weight, setWeight] = useState(0.0);
    const [timerStr, setTimerStr] = useState('00:00');
    const [isConnected, setIsConnected] = useState(false);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    // Chart State
    const [chartData] = useState<{ labels: number[], datasets: any[] }>({
        labels: [],
        datasets: [{
            label: 'Weight (g)',
            data: [],
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
            pointRadius: 0
        }]
    });

    // Mutable refs for high-frequency updates to avoid re-renders of the whole component for every packet
    const chartDataRef = useRef<{ labels: number[], data: number[] }>({ labels: [], data: [] });
    const currentExperimentTimeRef = useRef(0.0);
    const lastTimerPacketTimeRef = useRef(Date.now());
    const lastChartUpdateRef = useRef(0);
    const chartInstanceRef = useRef<any>(null);

    useEffect(() => {
        const handleStatus = (e: CustomEvent<string>) => setStatus(e.detail);
        const handleConnected = () => {
            setIsConnected(true);
            resetChart();
        };
        const handleDisconnected = () => {
            setIsConnected(false);
            setIsTimerRunning(false);
            setStatus('Disconnected');
        };

        const handleWeight = (e: CustomEvent<number>) => {
            const w = e.detail;
            setWeight(w);
            updateChart(w);
        };

        const handleTimer = (e: CustomEvent<{ min: number, sec: number, dec: number }>) => {
            const { min, sec, dec } = e.detail;
            setTimerStr(`${pad(min)}:${pad(sec)}`);

            currentExperimentTimeRef.current = (min * 60) + sec + (dec / 10.0);
            lastTimerPacketTimeRef.current = Date.now();
        };

        acaia.addEventListener('status', handleStatus as EventListener);
        acaia.addEventListener('connected', handleConnected);
        acaia.addEventListener('disconnected', handleDisconnected);
        acaia.addEventListener('weight', handleWeight as EventListener);
        acaia.addEventListener('timer', handleTimer as EventListener);

        return () => {
            acaia.removeEventListener('status', handleStatus as EventListener);
            acaia.removeEventListener('connected', handleConnected);
            acaia.removeEventListener('disconnected', handleDisconnected);
            acaia.removeEventListener('weight', handleWeight as EventListener);
            acaia.removeEventListener('timer', handleTimer as EventListener);
        };
    }, [isTimerRunning]); // Dependencies mostly static, but isTimerRunning used in updateChart closure if defined there? No, refs used.

    const updateChart = (w: number) => {
        if (!isTimerRunning) return;

        const now = Date.now();

        // Interpolate time
        const timeSinceTimer = (now - lastTimerPacketTimeRef.current) / 1000;
        const interpolatedTime = currentExperimentTimeRef.current + timeSinceTimer;

        chartDataRef.current.labels.push(interpolatedTime);
        chartDataRef.current.data.push(w);

        if (chartDataRef.current.labels.length > 3000) {
            chartDataRef.current.labels.shift();
            chartDataRef.current.data.shift();
        }

        // Throttle to 20Hz (50ms)
        if (now - lastChartUpdateRef.current > 50) {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.data.labels = chartDataRef.current.labels;
                chartInstanceRef.current.data.datasets[0].data = chartDataRef.current.data;
                chartInstanceRef.current.update('none');
            }
            lastChartUpdateRef.current = now;
        }
    };

    const resetChart = () => {
        currentExperimentTimeRef.current = 0.0;
        lastTimerPacketTimeRef.current = Date.now();
        chartDataRef.current = { labels: [], data: [] };
        if (chartInstanceRef.current) {
            chartInstanceRef.current.data.labels = [];
            chartInstanceRef.current.data.datasets[0].data = [];
            chartInstanceRef.current.update();
        }
    };

    const pad = (n: number) => n < 10 ? '0' + n : n;

    const handleConnect = () => {
        if (isConnected) acaia.disconnect();
        else acaia.connect();
    };

    const handleStart = async () => {
        await acaia.startTimer();
        setIsTimerRunning(true);
        resetChart();
    };

    const handleStop = async () => {
        await acaia.stopTimer();
        setIsTimerRunning(false);
    };

    const handleReset = async () => {
        await acaia.resetTimer();
        setIsTimerRunning(false);
        resetChart(); // Also clear chart on reset
    };

    return (
        <div className="container">
            <h1>Acaia Pearl Controller</h1>
            <button
                onClick={handleConnect}
                className={`btn-connect ${isConnected ? 'active' : ''}`}
            >
                {isConnected ? 'Disconnect' : 'Connect Scale'}
            </button>

            <div className="display">
                <div className="weight">{weight.toFixed(1)}</div>
                <div className="unit">g</div>
                <div className="timer">{timerStr}</div>
            </div>

            <div className="controls">
                <button onClick={() => acaia.tare()} disabled={!isConnected} className="btn-tare">TARE</button>
                <button onClick={handleStart} disabled={!isConnected} className="btn-timer">START</button>
                <button onClick={handleStop} disabled={!isConnected} className="btn-stop">STOP</button>
                <button onClick={handleReset} disabled={!isConnected} className="btn-reset">RESET</button>
            </div>

            <div className="chart-container" style={{ height: '300px', marginTop: '20px' }}>
                <Line
                    ref={chartInstanceRef}
                    data={chartData}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: false,
                        scales: {
                            x: {
                                type: 'linear',
                                position: 'bottom',
                                title: { display: true, text: 'Time (s)' }
                            }
                        }
                    }}
                />
            </div>

            <div className="status">{status}</div>
        </div>
    )
}

export default App
