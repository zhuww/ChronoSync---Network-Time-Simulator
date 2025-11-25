import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { generateEducationalContent } from '../services/gemini';
import { Send, Bot, User, Loader2 } from 'lucide-react';

interface ChatInterfaceProps {
  simulationContext: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ simulationContext }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "Hello! I'm Chronos, your Network Time Engineer. Ask me about PTP, NTP, or how signal latency impacts synchronization.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const responseText = await generateEducationalContent(userMsg.text, simulationContext);
    
    const botMsg: Message = { role: 'model', text: responseText, timestamp: new Date() };
    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-cyber-800 border-l border-cyber-700">
      <div className="p-4 border-b border-cyber-700 bg-cyber-900/50 flex items-center gap-2">
        <Bot className="text-cyber-primary w-5 h-5" />
        <h2 className="font-bold text-cyber-primary tracking-wider">CHRONOS_AI</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-cyber-500' : 'bg-cyber-900 border border-cyber-primary'}`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} className="text-cyber-primary" />}
            </div>
            <div className={`p-3 rounded-lg text-sm max-w-[80%] leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-cyber-500 text-white' 
                : 'bg-cyber-900/80 border border-cyber-700 text-gray-300'
            }`}>
               {/* Basic markdown rendering support */}
               {msg.text.split('\n').map((line, i) => (
                   <p key={i} className={line.startsWith('-') || line.startsWith('*') ? 'ml-4' : ''}>
                       {line}
                   </p>
               ))}
               <div className="text-[10px] opacity-50 mt-1 text-right">
                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
               </div>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex gap-3">
                 <div className="w-8 h-8 rounded-full bg-cyber-900 border border-cyber-primary flex items-center justify-center">
                    <Bot size={14} className="text-cyber-primary" />
                 </div>
                 <div className="bg-cyber-900/80 border border-cyber-700 p-3 rounded-lg flex items-center gap-2 text-cyber-primary text-sm">
                    <Loader2 className="animate-spin w-4 h-4" />
                    <span>Processing signal data...</span>
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-cyber-900 border-t border-cyber-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about synchronization..."
            className="flex-1 bg-cyber-800 border border-cyber-600 rounded-md px-4 py-2 text-sm text-white focus:outline-none focus:border-cyber-primary transition-colors"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading}
            className="bg-cyber-primary/10 hover:bg-cyber-primary/20 text-cyber-primary border border-cyber-primary/50 rounded-md px-4 py-2 transition-colors disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
