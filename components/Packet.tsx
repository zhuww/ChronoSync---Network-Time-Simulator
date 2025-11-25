import React from 'react';
import { NetworkPacket, PacketType } from '../types';

interface PacketProps {
  packet: NetworkPacket;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const Packet: React.FC<PacketProps> = ({ packet, startX, startY, endX, endY }) => {
  // Linear interpolation based on progress
  const currentX = startX + (endX - startX) * packet.progress;
  const currentY = startY + (endY - startY) * packet.progress;

  let color = 'bg-white';
  switch (packet.type) {
    case PacketType.SYNC: color = 'bg-cyber-primary shadow-[0_0_10px_#00f0ff]'; break;
    case PacketType.FOLLOW_UP: color = 'bg-cyber-secondary shadow-[0_0_10px_#7000ff]'; break;
    case PacketType.DELAY_REQ: color = 'bg-cyber-warning shadow-[0_0_10px_#ffbe0b]'; break;
    case PacketType.DELAY_RESP: color = 'bg-cyber-success shadow-[0_0_10px_#00ff9d]'; break;
  }

  return (
    <div
      className={`absolute w-3 h-3 rounded-full ${color} z-20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2`}
      style={{ left: currentX, top: currentY }}
    >
      <div className="absolute inset-0 rounded-full animate-ping opacity-75 bg-inherit"></div>
    </div>
  );
};

export default Packet;
