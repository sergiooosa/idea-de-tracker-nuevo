import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';

// Placeholder: en V1 simulamos respuestas por reglas. Dejar listo para endpoint de IA.
const MOCK_ANSWERS: Record<string, string> = {
  objeciones: 'Esta semana las objeciones más repetidas en videollamadas fueron: **precio** (19x), **competencia** (11x), **desconfianza** (9x) y **tiempo** (8x). Te recomiendo preparar respuestas tipo para precio y competencia.',
  speed: 'El asesor con peor speed to lead en los últimos 7 días es **María** (promedio 24 min). Los que mejor responden son **Sergio** y **Ana** (≈12 min). Revisa carga de trabajo de María.',
  leads_caida: 'Hay **5 leads** sin contacto en más de 24h: Laura Sánchez, Felipe Moreno, Carmen Fernández, Sebastián Ruiz y Alejandro Mendoza. Prioriza llamadas a estos hoy.',
  default:
    'Puedo ayudarte con: objeciones que se repiten, speed to lead por asesor, leads a punto de caerse por falta de seguimiento, y más. Escribe una pregunta concreta.',
};

function getMockReply(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('objecion') || q.includes('objeciones')) return MOCK_ANSWERS.objeciones;
  if (q.includes('speed') || q.includes('peor') || q.includes('mejor')) return MOCK_ANSWERS.speed;
  if (q.includes('caída') || q.includes('caida') || q.includes('seguimiento') || q.includes('sin contacto'))
    return MOCK_ANSWERS.leads_caida;
  return MOCK_ANSWERS.default;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function InsightsChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Hola. Soy tu copiloto de resumen. Puedes preguntar por objeciones, tiempo al lead, leads sin seguimiento, etc.',
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    // Simular latencia y respuesta
    setTimeout(() => {
      const reply = getMockReply(text);
      setMessages((m) => [
        ...m,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: reply },
      ]);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:max-w-md md:right-6 md:bottom-24 md:top-auto md:rounded-2xl md:inset-auto md:h-[480px] bg-surface-800 border border-surface-500 shadow-2xl animate-fade-in overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-surface-500 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent-cyan" />
          <span className="font-semibold text-white">Resumen y análisis</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-accent-cyan/20 text-white'
                  : 'bg-surface-700 text-gray-200'
              }`}
            >
              {msg.role === 'assistant' && msg.content.includes('**') ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent-cyan">$1</strong>'),
                  }}
                />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-surface-500 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ej: ¿Qué objeciones se repiten esta semana?"
            className="flex-1 rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/50"
          />
          <button
            type="button"
            onClick={send}
            className="p-2 rounded-lg bg-accent-cyan text-white hover:opacity-90"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
