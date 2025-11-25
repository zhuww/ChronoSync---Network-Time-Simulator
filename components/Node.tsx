import React from 'react';
import { DeviceNode } from '../types';
import { Clock, Wifi, Server } from 'lucide-react';

interface NodeProps {
  node: DeviceNode;
  onClick: (id: string) => void;
}

const Node: React.FC<NodeProps> = ({ node, onClick }) => {
  const timeString = new Date(node.localTime).toISOString().split('T')[1].slice(0, -1);
  const ms = Math.floor(node.localTime % 1000).toString().padStart(3, '0');

  // Color coding based on sync status
  const offsetAbs = Math.abs(node.offset);
  let statusColor = 'border-cyber-success shadow-[0_0_15px_#00ff9d]';
  let textColor = 'text-cyber-success';
  
  if (node.isMaster) {
    statusColor = 'border-cyber-primary shadow-[0_0_20px_#00f0ff]';
    textColor = 'text-cyber-primary';
  } else if (offsetAbs > 1000) {
    statusColor = 'border-cyber-danger shadow-[0_0_15px_#ff0055]';
    textColor = 'text-cyber-danger';
  } else if (offsetAbs > 100) {
    statusColor = 'border-cyber-warning shadow-[0_0_15px_#ffbe0b]';
    textColor = 'text-cyber-warning';
  }

  return (
    <div
      onClick={() => onClick(node.id)}
      className={`absolute w-64 p-4 bg-cyber-800/90 backdrop-blur-md border-2 ${statusColor} rounded-xl cursor-pointer transition-all hover:scale-105 z-10 flex flex-col gap-2`}
      style={{ left: node.x, top: node.y }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
            {node.isMaster ? <Server className="w-4 h-4 text-cyber-primary" /> : <Wifi className="w-4 h-4 text-gray-400" />}
            <span className="font-bold text-sm text-gray-200">{node.name}</span>
        </div>
        {node.isMaster && <span className="text-xs bg-cyber-primary/20 text-cyber-primary px-2 py-0.5 rounded">MASTER</span>}
      </div>

      <div className="font-mono text-xl text-white tracking-wider flex justify-between">
        <span>{timeString}</span>
        <span className="text-sm text-gray-400 mt-1">.{ms}</span>
      </div>

      {!node.isMaster && (
        <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-2 pt-2 border-t border-cyber-700">
          <div>
            <span className="text-gray-500 block">OFFSET</span>
            <span className={`${textColor}`}>{node.offset.toFixed(2)}ms</span>
          </div>
          <div className="text-right">
            <span className="text-gray-500 block">DELAY</span>
            <span className="text-blue-300">{node.delay.toFixed(2)}ms</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500 block">DRIFT FACTOR</span>
            <span className="text-gray-300">{(node.drift * 100 - 100).toFixed(6)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Node;
