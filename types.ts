export enum PacketType {
  SYNC = 'SYNC',
  FOLLOW_UP = 'FOLLOW_UP',
  DELAY_REQ = 'DELAY_REQ',
  DELAY_RESP = 'DELAY_RESP',
}

export interface NetworkPacket {
  id: string;
  type: PacketType;
  fromId: string;
  toId: string;
  timestamp: number;
  progress: number; // 0 to 1
  data?: any;
}

export interface DeviceNode {
  id: string;
  name: string;
  isMaster: boolean;
  localTime: number; // Simulated local timestamp
  drift: number; // Multiplier (1.0 = perfect, 1.01 = fast)
  offset: number; // Calculated offset from master
  delay: number; // Calculated network delay
  x: number;
  y: number;
  lastSyncTime?: number;
}

export interface SimulationState {
  nodes: DeviceNode[];
  packets: NetworkPacket[];
  globalTime: number;
  isRunning: boolean;
  networkJitter: number; // ms
  baseLatency: number; // ms
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}