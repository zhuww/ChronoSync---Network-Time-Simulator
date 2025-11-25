import React, { useRef, useEffect } from 'react';
import { DeviceNode, NetworkPacket } from '../types';
import Node from './Node';
import Packet from './Packet';

interface NetworkVisualizerProps {
  nodes: DeviceNode[];
  packets: NetworkPacket[];
}

const NetworkVisualizer: React.FC<NetworkVisualizerProps> = ({ nodes, packets }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-cyber-900 overflow-hidden border-r border-cyber-700">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(to right, #233d6e 1px, transparent 1px), linear-gradient(to bottom, #233d6e 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }}>
      </div>

      {/* Connecting Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        {nodes.filter(n => !n.isMaster).map(slave => {
          const master = nodes.find(n => n.isMaster);
          if (!master) return null;
          // Calculate centers (approximate based on w-64 h-auto)
          const mX = master.x + 128;
          const mY = master.y + 60;
          const sX = slave.x + 128;
          const sY = slave.y + 60;

          return (
            <g key={`link-${slave.id}`}>
               <line 
                x1={mX} y1={mY} x2={sX} y2={sY} 
                stroke="#233d6e" 
                strokeWidth="2" 
                strokeDasharray="5,5" 
               />
               {/* Activity indicator line */}
               <line 
                 x1={mX} y1={mY} x2={sX} y2={sY} 
                 stroke="#00f0ff" 
                 strokeWidth="1"
                 className="opacity-0 transition-opacity duration-200"
               />
            </g>
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map(node => (
        <Node key={node.id} node={node} onClick={() => {}} />
      ))}

      {/* Packets */}
      {packets.map(packet => {
        const fromNode = nodes.find(n => n.id === packet.fromId);
        const toNode = nodes.find(n => n.id === packet.toId);
        if (!fromNode || !toNode) return null;

        return (
            <Packet 
                key={packet.id}
                packet={packet}
                startX={fromNode.x + 128}
                startY={fromNode.y + 60}
                endX={toNode.x + 128}
                endY={toNode.y + 60}
            />
        )
      })}
    </div>
  );
};

export default NetworkVisualizer;
