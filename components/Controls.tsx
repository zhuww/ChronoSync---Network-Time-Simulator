import React from 'react';
import { Play, Pause, RefreshCw, Activity, Zap, Info, Code } from 'lucide-react';

interface ControlsProps {
  isRunning: boolean;
  onToggle: () => void;
  onReset: () => void;
  onShowCode: () => void;
  jitter: number;
  setJitter: (val: number) => void;
  latency: number;
  setLatency: (val: number) => void;
  syncInterval: number;
}

const Controls: React.FC<ControlsProps> = ({ 
  isRunning, 
  onToggle, 
  onReset,
  onShowCode,
  jitter, 
  setJitter,
  latency,
  setLatency,
  syncInterval
}) => {
  return (
    <div className="bg-cyber-900 border-b border-cyber-700 p-4 flex flex-wrap items-center gap-6 shadow-lg z-30">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyber-primary to-cyber-secondary flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                <Activity className="text-white" />
            </div>
            <div>
                <h1 className="font-bold text-white tracking-widest text-lg">CHRONOSYNC</h1>
                <p className="text-[10px] text-cyber-primary font-mono tracking-wider">PROTOCOL SIMULATION v1.0</p>
            </div>
        </div>

        <div className="h-8 w-px bg-cyber-700 mx-2"></div>

        <div className="flex items-center gap-2">
            <button 
                onClick={onToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-mono text-sm font-bold transition-all ${
                    isRunning 
                    ? 'bg-cyber-danger/10 text-cyber-danger border border-cyber-danger/50 hover:bg-cyber-danger/20' 
                    : 'bg-cyber-success/10 text-cyber-success border border-cyber-success/50 hover:bg-cyber-success/20'
                }`}
            >
                {isRunning ? <Pause size={16} /> : <Play size={16} />}
                {isRunning ? 'HALT' : 'INIT'}
            </button>

            <button 
                onClick={onReset}
                className="p-2 rounded-md bg-cyber-700 text-gray-300 hover:text-white hover:bg-cyber-600 transition-colors"
                title="Reset Simulation"
            >
                <RefreshCw size={16} />
            </button>

            <button 
                onClick={onShowCode}
                className="p-2 rounded-md bg-cyber-700 text-cyber-primary hover:bg-cyber-600 transition-colors border border-cyber-primary/30"
                title="View Implementation Code"
            >
                <Code size={16} />
            </button>
        </div>

        <div className="flex-1"></div>

        <div className="flex items-center gap-6 text-sm font-mono text-gray-400">
            {/* Latency Control with Tooltip */}
            <div className="flex flex-col gap-1 w-40 relative group">
                <div className="flex justify-between text-xs items-center">
                    <div className="flex items-center gap-1 cursor-help">
                        <span>LATENCY (ms)</span>
                        <Info size={12} className="text-gray-500 group-hover:text-cyber-primary transition-colors" />
                    </div>
                    <span className="text-cyber-primary">{latency}</span>
                </div>
                
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-cyber-800 border border-cyber-primary/30 text-gray-300 text-[11px] leading-tight rounded shadow-[0_0_15px_rgba(0,0,0,0.5)] w-56 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 backdrop-blur-sm">
                    Base signal propagation delay. <br/><br/>
                    <span className="text-cyber-primary">Impact:</span> PTP can mathematically remove constant latency. However, high latency increases the "control loop" time, making the clock slower to react to changes.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-cyber-primary/30"></div>
                </div>

                <input 
                    type="range" 
                    min="10" 
                    max="500" 
                    value={latency} 
                    onChange={(e) => setLatency(Number(e.target.value))}
                    className="h-1 bg-cyber-700 rounded-lg appearance-none cursor-pointer accent-cyber-primary"
                />
            </div>

            {/* Jitter Control with Tooltip */}
            <div className="flex flex-col gap-1 w-40 relative group">
                <div className="flex justify-between text-xs items-center">
                    <div className="flex items-center gap-1 cursor-help">
                         <span>JITTER (ms)</span>
                         <Info size={12} className="text-gray-500 group-hover:text-cyber-warning transition-colors" />
                    </div>
                    <span className="text-cyber-warning">{jitter}</span>
                </div>

                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-cyber-800 border border-cyber-warning/30 text-gray-300 text-[11px] leading-tight rounded shadow-[0_0_15px_rgba(0,0,0,0.5)] w-56 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 backdrop-blur-sm">
                    Variance in packet arrival time (Noise). <br/><br/>
                    <span className="text-cyber-warning">Impact:</span> This is the enemy of sync. High jitter creates asymmetry in the path delay calculation, leading to incorrect clock offsets and drift.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-cyber-warning/30"></div>
                </div>

                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={jitter} 
                    onChange={(e) => setJitter(Number(e.target.value))}
                    className="h-1 bg-cyber-700 rounded-lg appearance-none cursor-pointer accent-cyber-warning"
                />
            </div>

             <div className="flex items-center gap-2 px-3 py-1 bg-cyber-800 rounded border border-cyber-700">
                <Zap size={14} className="text-yellow-400" />
                <span className="text-xs">SYNC RATE: {syncInterval}ms</span>
            </div>
        </div>
    </div>
  );
};

export default Controls;