import { DeviceNode } from "./types";

export const INITIAL_NODES: DeviceNode[] = [
  {
    id: 'master',
    name: 'Grandmaster Clock',
    isMaster: true,
    localTime: Date.now(),
    drift: 1.0,
    offset: 0,
    delay: 0,
    x: 50,
    y: 150,
  },
  {
    id: 'slave-1',
    name: 'IoT Sensor A (WiFi)',
    isMaster: false,
    localTime: Date.now() - 5000, // Initial large error
    drift: 1.0005, // Drifts significantly
    offset: 0,
    delay: 0,
    x: 300,
    y: 80,
  },
  {
    id: 'slave-2',
    name: 'Edge Server B',
    isMaster: false,
    localTime: Date.now() + 2000,
    drift: 0.9998,
    offset: 0,
    delay: 0,
    x: 300,
    y: 220,
  },
];

export const PACKET_SPEED = 0.02; // Progress per tick
export const TICK_RATE = 16; // ms
