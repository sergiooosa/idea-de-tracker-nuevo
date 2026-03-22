"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, MessageSquare, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function InsightsChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: 'Hola. Soy tu copiloto de datos v2.0. Puedo responderte con información real de los últimos 7 días. Pregunta por objeciones, speed to lead, ranking, revenue, citas, embudo personalizado, etiquetas internas, triggers de chat y más.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Compute date range once (last 7 days)
  const dateRange = useRef({
    from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    // Add typing indicator
    const typingId = (Date.now() + 1).toString();
    setMessages((m) => [...m, { id: typingId, role: 'assistant', content: '...' }]);

    try {
      const res = await fetch('/api/insights/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          dateFrom: dateRange.current.from,
          dateTo: dateRange.current.to,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const reply: string = data.message ?? 'No pude generar una respuesta.';
      setMessages((m) => m.map((msg) => msg.id === typingId
        ? { ...msg, content: reply }
        : msg,
      ));
    } catch (err) {
      const errorText = err instanceof Error ? err.message : 'Error desconocido';
      setMessages((m) => m.map((msg) => msg.id === typingId
        ? { ...msg, content: `Lo siento, tuve un problema al procesar tu pregunta. ${errorText}` }
        : msg,
      ));
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:max-w-md md:right-6 md:bottom-24 md:top-auto md:rounded-2xl md:inset-auto md:h-[480px] bg-surface-800 border border-surface-500 shadow-2xl animate-fade-in overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-surface-500 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-cyan" />
          <span className="font-semibold text-white">Habla con tus datos</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-purple/20 text-accent-purple border border-accent-purple/30">Beta</span>
        </div>
        <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-line ${msg.role === 'user' ? 'bg-accent-cyan/20 text-white' : 'bg-surface-700 text-gray-200'} ${msg.content === '...' ? 'animate-pulse' : ''}`}>
              {msg.role === 'assistant' && msg.content.includes('**') ? (
                <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent-cyan">$1</strong>') }} />
              ) : msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-surface-500 shrink-0">
        <div className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ej: ¿Cómo va la facturación esta semana?"
            disabled={loading}
            className="flex-1 rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/50 disabled:opacity-60" />
          <button type="button" onClick={send} disabled={loading} className="p-2 rounded-lg bg-accent-cyan text-white hover:opacity-90 disabled:opacity-60">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
