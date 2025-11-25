import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Cpu } from 'lucide-react';

interface CodeViewerProps {
  onClose: () => void;
}

const MASTER_CODE = `#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>

// Configuration
#define MCAST_GROUP "224.1.1.1"
#define PORT 5007
#define BILLION 1000000000L

// Packet Structure - Binary packed for speed (No JSON overhead)
typedef struct __attribute__((packed)) {
    uint8_t type; // 0=SYNC, 1=FOLLOW_UP, 2=DELAY_REQ, 3=DELAY_RESP
    struct timespec t1;
    struct timespec t2;
    struct timespec t3;
    struct timespec t4;
} ptp_msg_t;

void error(char *msg) {
    perror(msg);
    exit(1);
}

// Get high-precision kernel time (Nanosecond resolution)
void get_time(struct timespec *ts) {
    clock_gettime(CLOCK_REALTIME, ts);
}

int main(int argc, char *argv[]) {
    int sock;
    struct sockaddr_in addr;
    int ttl = 2;
    ptp_msg_t msg;

    // 1. Setup UDP Multicast Socket
    sock = socket(AF_INET, SOCK_DGRAM, 0);
    if (sock < 0) error("socket");

    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = inet_addr(MCAST_GROUP);
    addr.sin_port = htons(PORT);

    if (setsockopt(sock, IPPROTO_IP, IP_MULTICAST_TTL, &ttl, sizeof(ttl)) < 0)
        error("setsockopt");

    printf("[*] MASTER Clock Active (High-Precision Mode)\\n");
    printf("[*] Target: %s:%d\\n", MCAST_GROUP, PORT);

    while (1) {
        // --- STEP 1: SYNC ---
        // In hardware implementations, this triggers the PHY to latch time
        msg.type = 0; 
        sendto(sock, &msg, sizeof(msg), 0, (struct sockaddr*)&addr, sizeof(addr));

        // --- STEP 2: FOLLOW_UP ---
        // Capture exact kernel time immediately after send
        get_time(&msg.t1);
        msg.type = 1; 
        
        // Short busy-wait to ensure ordering on fast networks
        usleep(500); 

        sendto(sock, &msg, sizeof(msg), 0, (struct sockaddr*)&addr, sizeof(addr));
        printf("[>] Pulse Sent T1: %ld.%09ld\\n", msg.t1.tv_sec, msg.t1.tv_nsec);

        // --- STEP 4: DELAY_RESP ---
        // Listen for DELAY_REQ from any slave
        struct sockaddr_in client_addr;
        socklen_t addrlen = sizeof(client_addr);
        
        // Non-blocking check or short timeout would be used in production
        // Here we block briefly to service requests
        struct timeval tv;
        tv.tv_sec = 0;
        tv.tv_usec = 500000; // 500ms timeout
        setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (const char*)&tv, sizeof tv);

        if (recvfrom(sock, &msg, sizeof(msg), 0, (struct sockaddr*)&client_addr, &addrlen) > 0) {
            if (msg.type == 2) { // DELAY_REQ
                 // Capture T4 (Arrival time of Req)
                 get_time(&msg.t4);
                 msg.type = 3; // DELAY_RESP
                 
                 // Send back to specific slave
                 sendto(sock, &msg, sizeof(msg), 0, (struct sockaddr*)&client_addr, addrlen);
                 printf("[<] Serviced Delay Req\\n");
            }
        }
        
        // Sync Interval
        sleep(1);
    }
    return 0;
}`;

const SLAVE_CODE = `#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>

#define MCAST_GROUP "224.1.1.1"
#define PORT 5007
#define BILLION 1000000000L

typedef struct __attribute__((packed)) {
    uint8_t type;
    struct timespec t1;
    struct timespec t2;
    struct timespec t3;
    struct timespec t4;
} ptp_msg_t;

void error(char *msg) {
    perror(msg);
    exit(1);
}

void get_time(struct timespec *ts) {
    clock_gettime(CLOCK_REALTIME, ts);
}

double to_seconds(struct timespec ts) {
    return (double)ts.tv_sec + (double)ts.tv_nsec / BILLION;
}

int main(int argc, char *argv[]) {
    int sock;
    struct sockaddr_in addr;
    struct ip_mreq mreq;
    ptp_msg_t msg;
    socklen_t addrlen = sizeof(addr);

    // 1. Setup UDP Socket
    sock = socket(AF_INET, SOCK_DGRAM, 0);
    if (sock < 0) error("socket");

    // Allow multiple instances to bind port
    u_int yes = 1;
    if (setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, &yes, sizeof(yes)) < 0)
        error("reuseaddr");

    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_ANY);
    addr.sin_port = htons(PORT);

    if (bind(sock, (struct sockaddr*)&addr, sizeof(addr)) < 0)
        error("bind");

    // Join Multicast
    mreq.imr_multiaddr.s_addr = inet_addr(MCAST_GROUP);
    mreq.imr_interface.s_addr = htonl(INADDR_ANY);
    if (setsockopt(sock, IPPROTO_IP, IP_ADD_MEMBERSHIP, &mreq, sizeof(mreq)) < 0)
        error("mreq");

    printf("[*] SLAVE Node Locked. Waiting for Pulses...\\n");

    while (1) {
        if (recvfrom(sock, &msg, sizeof(msg), 0, (struct sockaddr*)&addr, &addrlen) < 0)
            continue;
        
        // --- Capture T2 (Arrival) ---
        struct timespec t2;
        get_time(&t2);

        if (msg.type == 1) { // Received FOLLOW_UP
            // We now have T1 (from master) and T2 (local)
            
            // --- STEP 3: Send DELAY_REQ ---
            msg.type = 2;
            get_time(&msg.t3); // T3
            
            sendto(sock, &msg, sizeof(msg), 0, (struct sockaddr*)&addr, addrlen);
            
            // --- STEP 4: Wait for DELAY_RESP ---
            if (recvfrom(sock, &msg, sizeof(msg), 0, (struct sockaddr*)&addr, &addrlen) > 0) {
                 if (msg.type == 3) { // Received DELAY_RESP
                     // We now have T4 (from master)
                     
                     double t1 = to_seconds(msg.t1);
                     double t2_d = to_seconds(t2);
                     double t3 = to_seconds(msg.t3);
                     double t4 = to_seconds(msg.t4);

                     // PTP Calculations
                     double master_to_slave = t2_d - t1;
                     double slave_to_master = t4 - t3;
                     
                     double mean_path_delay = (master_to_slave + slave_to_master) / 2.0;
                     double offset = master_to_slave - mean_path_delay;

                     printf("OFFSET: %+.9f s | DELAY: %.9f s\\n", offset, mean_path_delay);
                     
                     // NOTE: In production, use adjtimex() to slew clock
                 }
            }
        }
    }
    return 0;
}`;

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
            <Cpu className="text-cyber-primary" />
            <h2 className="text-white font-mono font-bold">KERNEL_LEVEL_SOURCE_C</h2>
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
            master.c
          </button>
          <button
            onClick={() => setActiveTab('slave')}
            className={`px-6 py-3 font-mono text-sm transition-colors ${
              activeTab === 'slave' 
                ? 'bg-cyber-primary/10 text-cyber-primary border-b-2 border-cyber-primary' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            slave.c
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
        <div className="p-4 border-t border-cyber-700 bg-cyber-800 text-xs text-gray-500 font-mono flex justify-between items-center">
           <span>Use CLOCK_REALTIME for kernel timestamping.</span>
           <code className="bg-black px-2 py-1 rounded text-cyber-primary">gcc {activeTab}.c -o {activeTab} && ./{activeTab}</code>
        </div>
      </div>
    </div>
  );
};
