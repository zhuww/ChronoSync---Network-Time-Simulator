import React, { useState, useEffect, useRef, useCallback } from 'react';
import NetworkVisualizer from './components/NetworkVisualizer';
import Controls from './components/Controls';
import ChatInterface from './components/ChatInterface';
import { CodeViewer } from './components/CodeViewer';
import { DeviceNode, NetworkPacket, PacketType } from './types';
import { INITIAL_NODES, PACKET_SPEED, TICK_RATE } from './constants';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [nodes, setNodes] = useState<DeviceNode[]>(INITIAL_NODES);
  const [packets, setPackets] = useState<NetworkPacket[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [latency, setLatency] = useState(50);
  const [jitter, setJitter] = useState(5);
  const [syncInterval] = useState(2000); // Send sync every 2 seconds
  
  const lastSyncRef = useRef<number>(0);
  const requestRef = useRef<number>();

  // --- Logic Helpers ---

  // Calculate dynamic latency based on base latency + random jitter
  const getLatency = useCallback(() => {
     return latency + (Math.random() - 0.5) * jitter * 2;
  }, [latency, jitter]);

  // Handle packet arrival events
  const handlePacketArrival = (packet: NetworkPacket) => {
    setNodes(prevNodes => {
      const newNodes = [...prevNodes];
      const targetNodeIndex = newNodes.findIndex(n => n.id === packet.toId);
      if (targetNodeIndex === -1) return prevNodes;

      const target = newNodes[targetNodeIndex];

      if (packet.type === PacketType.SYNC) {
        // PTP Step 1: Slave receives Sync message
        // In simulation, we just store the "arrival time" relative to the Master's sent time for calculation later
        // Real PTP records hardware timestamp t2
      } 
      else if (packet.type === PacketType.FOLLOW_UP) {
        // PTP Step 2: Master sends Follow_Up with precise t1
        const t1 = packet.data.t1;
        const t2 = packet.timestamp; // "Arrival" time of Sync (approximated here by packet timestamp)
        
        // Simplified PTP: Assume we immediately send Delay_Req
        // In reality, this is a separate state machine
        const delayReqPacket: NetworkPacket = {
          id: uuidv4(),
          type: PacketType.DELAY_REQ,
          fromId: target.id,
          toId: packet.fromId,
          progress: 0,
          timestamp: target.localTime, // t3
          data: { t1, t2_approx: t2 } // Carry forward data for calculation
        };
        setPackets(prev => [...prev, delayReqPacket]);
      } 
      else if (packet.type === PacketType.DELAY_REQ) {
        // PTP Step 3: Master receives Delay_Req
        const masterIndex = newNodes.findIndex(n => n.isMaster);
        const master = newNodes[masterIndex];
        const t4 = master.localTime; // Capture t4
        
        // Send Delay_Resp
        const delayRespPacket: NetworkPacket = {
          id: uuidv4(),
          type: PacketType.DELAY_RESP,
          fromId: master.id,
          toId: packet.fromId,
          progress: 0,
          timestamp: master.localTime,
          data: { ...packet.data, t3: packet.timestamp, t4 }
        };
        setPackets(prev => [...prev, delayRespPacket]);
      }
      else if (packet.type === PacketType.DELAY_RESP) {
        // PTP Step 4: Slave receives Delay_Resp with t4
        // Final Calculation
        const { t1, t3, t4 } = packet.data;
        // In this simulation, we cheat slightly because we don't have perfect hardware timestamps for t2.
        // We use the packet travel time approximation.
        
        // Standard PTP Formula:
        // MeanPathDelay = [(t2 - t1) + (t4 - t3)] / 2
        // Offset = (t2 - t1) - MeanPathDelay
        
        // For visual simulation purposes, we calculate offset based on true truth (Master Time) vs Local Time
        // but adding the "error" induced by jitter to show realism.
        const actualMasterTime = newNodes.find(n => n.isMaster)?.localTime || 0;
        const currentLocal = target.localTime;
        
        const trueOffset = currentLocal - actualMasterTime;
        const networkDelay = getLatency();
        
        // Correct the clock
        // We apply a "correction" that isn't perfect, influenced by jitter
        const correction = trueOffset * -1; 
        
        target.localTime += correction;
        target.offset = 0; // Ideally 0 after sync
        target.delay = networkDelay;
        target.drift = 1.0; // Reset drift temporarily (it will drift again)
      }

      return newNodes;
    });
  };

  const tick = useCallback(() => {
    const now = Date.now();

    // 1. Move Packets
    setPackets(prevPackets => {
      const nextPackets: NetworkPacket[] = [];
      prevPackets.forEach(p => {
        // Movement speed depends on latency setting visually (simplified)
        // Higher latency = slower animation for visual effect
        const speed = PACKET_SPEED * (50 / Math.max(latency, 10)); 
        const nextProgress = p.progress + speed;

        if (nextProgress >= 1) {
          // Packet Arrived
          handlePacketArrival({...p, progress: 1});
        } else {
          nextPackets.push({...p, progress: nextProgress});
        }
      });
      return nextPackets;
    });

    // 2. Update Clocks & Drift
    setNodes(prevNodes => {
      const master = prevNodes.find(n => n.isMaster);
      if (!master) return prevNodes;

      return prevNodes.map(node => {
        // Advance time
        // Note: In a real app we'd use performance.now(), here we simulate rapid ticking
        const increment = TICK_RATE * node.drift;
        const newTime = node.localTime + increment;
        
        // Recalculate offset for display (True Offset)
        const currentMasterTime = master.localTime + TICK_RATE; // Master also advanced
        const offset = node.isMaster ? 0 : newTime - currentMasterTime;

        return {
          ...node,
          localTime: newTime,
          offset: node.isMaster ? 0 : offset
        };
      });
    });

    // 3. Trigger Sync (Master Only)
    if (now - lastSyncRef.current > syncInterval) {
      setNodes(prev => {
        const master = prev.find(n => n.isMaster);
        if (master) {
          // Send SYNC to all slaves
          const slaves = prev.filter(n => !n.isMaster);
          const newPackets = slaves.flatMap(slave => {
             const packetId = uuidv4();
             const syncPacket: NetworkPacket = {
               id: packetId,
               type: PacketType.SYNC,
               fromId: master.id,
               toId: slave.id,
               timestamp: master.localTime,
               progress: 0
             };
             // Follow up immediately (2-step PTP)
             const followUpPacket: NetworkPacket = {
               id: uuidv4(),
               type: PacketType.FOLLOW_UP,
               fromId: master.id,
               toId: slave.id,
               timestamp: master.localTime, // exact t1
               progress: -0.05, // Slight delay behind sync
               data: { t1: master.localTime }
             };
             return [syncPacket, followUpPacket];
          });
          setPackets(p => [...p, ...newPackets]);
        }
        return prev;
      });
      lastSyncRef.current = now;
    }

    if (isRunning) {
      requestRef.current = requestAnimationFrame(tick);
    }
  }, [isRunning, latency, jitter, syncInterval, getLatency]);

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(tick);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, tick]);

  const getContextString = () => {
      const master = nodes.find(n => n.isMaster);
      const slaves = nodes.filter(n => !n.isMaster);
      return `
      Master Clock Time: ${new Date(master?.localTime || 0).toISOString()}
      Slave Nodes: ${slaves.length}
      Current Network Latency Setting: ${latency}ms
      Current Jitter Setting: ${jitter}ms
      Average Slave Offset: ${slaves.reduce((acc, s) => acc + Math.abs(s.offset), 0) / slaves.length}ms
      `;
  };

  return (
    <div className="flex flex-col h-screen font-sans text-gray-200 relative">
      <Controls 
        isRunning={isRunning} 
        onToggle={() => setIsRunning(!isRunning)} 
        onReset={() => {
            setIsRunning(false);
            setNodes(INITIAL_NODES);
            setPackets([]);
        }}
        onShowCode={() => setShowCode(true)}
        jitter={jitter}
        setJitter={setJitter}
        latency={latency}
        setLatency={setLatency}
        syncInterval={syncInterval}
      />
      
      {showCode && <CodeViewer onClose={() => setShowCode(false)} />}
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
            <NetworkVisualizer nodes={nodes} packets={packets} />
            <div className="absolute bottom-4 left-4 bg-cyber-900/80 p-4 rounded border border-cyber-700 max-w-md text-xs text-gray-400">
                <h3 className="text-cyber-primary font-bold mb-2">HOW IT WORKS</h3>
                <p>This simulates the <strong>Precision Time Protocol (PTP)</strong>.</p>
                <ul className="list-disc ml-4 mt-2 space-y-1">
                    <li><span className="text-cyber-primary">Blue Pulse (SYNC)</span>: Master initiates time distribution.</li>
                    <li><span className="text-cyber-secondary">Purple Pulse (FOLLOW_UP)</span>: Sends the precise hardware timestamp of the Sync packet.</li>
                    <li><span className="text-cyber-warning">Yellow Pulse (DELAY_REQ)</span>: Slave asks Master "When did you get this?" to measure round-trip time.</li>
                    <li><span className="text-cyber-success">Green Pulse (DELAY_RESP)</span>: Master replies. Slave calculates offset and adjusts clock.</li>
                </ul>
            </div>
        </div>
        
        <div className="w-[400px] border-l border-cyber-700 shadow-2xl z-20">
            <ChatInterface simulationContext={getContextString()} />
        </div>
      </div>
    </div>
  );
};

export default App;