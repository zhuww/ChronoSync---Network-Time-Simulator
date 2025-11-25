import React, { useState } from 'react';
import { X, Copy, Check, Terminal } from 'lucide-react';

interface CodeViewerProps {
  onClose: () => void;
}

const MASTER_CODE = `import socket
import time
import struct
import json

# Configuration
MULTICAST_GROUP = '224.1.1.1'
PORT = 5007

# Setup UDP Socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)

print(f"[*] Master Clock Active on {MULTICAST_GROUP}:{PORT}")

def get_precise_time():
    return time.time()

while True:
    try:
        # 1. SYNC Message
        # In real PTP, this is hardware timestamped
        t1 = get_precise_time()
        
        # 2. FOLLOW_UP Message
        # Contains the precise t1
        payload = json.dumps({
            'type': 'FOLLOW_UP',
            't1': t1
        }).encode('utf-8')
        
        sock.sendto(payload, (MULTICAST_GROUP, PORT))
        print(f"[>] Sent Sync Pulse: {t1}")
        
        # Listen for DELAY_REQ from Slaves
        sock.settimeout(0.1)
        try:
            data, addr = sock.recvfrom(1024)
            req = json.loads(data.decode('utf-8'))
            
            if req.get('type') == 'DELAY_REQ':
                t4 = get_precise_time()
                
                # 4. DELAY_RESP
                resp = json.dumps({
                    'type': 'DELAY_RESP',
                    't3': req['t3'],
                    't4': t4
                }).encode('utf-8')
                sock.sendto(resp, addr)
                print(f"[>] Replied to {addr}")
                
        except socket.timeout:
            pass
            
        time.sleep(1.0) # Sync Interval
        
    except KeyboardInterrupt:
        break`;

const SLAVE_CODE = `import socket
import time
import struct
import json

# Configuration
MULTICAST_GROUP = '224.1.1.1'
PORT = 5007

# Setup UDP Socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.bind(('', PORT))

# Join Multicast Group
mreq = struct.pack("4sl", socket.inet_aton(MULTICAST_GROUP), socket.INADDR_ANY)
sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)

print("[*] Slave Node Listening...")

def get_local_time():
    return time.time()

def adjust_clock(offset):
    # In a real system, you would use 'date -s' or adjtimex
    # Here we just print the adjustment
    print(f"[*] ADJUST CLOCK BY: {offset*1000:.4f} ms")

while True:
    data, addr = sock.recvfrom(1024)
    t2 = get_local_time() # Capture Arrival Time
    
    try:
        msg = json.loads(data.decode('utf-8'))
        
        if msg['type'] == 'FOLLOW_UP':
            t1 = msg['t1']
            
            # 3. Send DELAY_REQ
            t3 = get_local_time()
            req = json.dumps({
                'type': 'DELAY_REQ',
                't3': t3
            }).encode('utf-8')
            sock.sendto(req, addr)
            
            # Wait for DELAY_RESP
            data_resp, _ = sock.recvfrom(1024)
            resp = json.loads(data_resp.decode('utf-8'))
            
            if resp['type'] == 'DELAY_RESP':
                t4 = resp['t4']
                
                # PTP Calculation
                # MeanPathDelay = [(t2 - t1) + (t4 - t3)] / 2
                path_delay = ((t2 - t1) + (t4 - t3)) / 2
                
                # Offset = (t2 - t1) - MeanPathDelay
                offset = (t2 - t1) - path_delay
                
                print(f"Offset: {offset*1000:.3f}ms | Delay: {path_delay*1000:.3f}ms")
                adjust_clock(offset * -1)
                
    except Exception as e:
        print(f"Error: {e}")`;

export const CodeViewer: React.FC<CodeViewerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'master' | 'slave'>('master');
  const [copied, setCopied] = useState(false);

  const activeCode = activeTab === 'master' ? MASTER_CODE : SLAVE_CODE;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
      <div className="w-full max-w-4xl bg-cyber-900 border border-cyber-700 rounded-lg shadow-2xl flex flex-col max-h-full overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-700 bg-cyber-800">
          <div className="flex items-center gap-2">
            <Terminal className="text-cyber-primary" />
            <h2 className="text-white font-mono font-bold">IMPLEMENTATION_SOURCE</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-cyber-700 bg-cyber-800/50">
          <button
            onClick={() => setActiveTab('master')}
            className={`px-6 py-3 font-mono text-sm transition-colors ${
              activeTab === 'master' 
                ? 'bg-cyber-primary/10 text-cyber-primary border-b-2 border-cyber-primary' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            master_node.py
          </button>
          <button
            onClick={() => setActiveTab('slave')}
            className={`px-6 py-3 font-mono text-sm transition-colors ${
              activeTab === 'slave' 
                ? 'bg-cyber-primary/10 text-cyber-primary border-b-2 border-cyber-primary' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            slave_node.py
          </button>
          <div className="flex-1 flex justify-end items-center px-4">
             <button 
                onClick={handleCopy}
                className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors"
             >
                {copied ? <Check size={14} className="text-cyber-success" /> : <Copy size={14} />}
                {copied ? 'COPIED' : 'COPY SOURCE'}
             </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto bg-[#0a0f18] p-6">
            <pre className="font-mono text-sm text-gray-300 leading-relaxed">
                {activeCode}
            </pre>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyber-700 bg-cyber-800 text-xs text-gray-500 font-mono">
           Requires Python 3. Standard libraries only. Run on separate terminals or devices connected to the same LAN.
        </div>
      </div>
    </div>
  );
};