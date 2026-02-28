import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { ChevronRight, ChevronLeft, Phone } from 'lucide-react';

const steps = [
  { id: 1, title: 'Contexto de empresa' },
  { id: 2, title: 'Evaluación videollamadas' },
  { id: 3, title: 'Evaluación llamadas telefónicas' },
  { id: 4, title: 'Reglas de etiquetas' },
  { id: 5, title: 'Métricas personalizadas' },
];

const defaultPromptEmpresa =
  'Somos una empresa de formación en ventas. Ofrecemos programas de 90 días con mentoría y seguimiento. Nuestro diferencial es el acompañamiento 1:1.';
const defaultPromptEvaluacion =
  'Evalúa la videollamada según: 1) Claridad del valor ofrecido, 2) Manejo de objeciones, 3) Cierre o siguiente paso definido. Asigna puntaje 1-10 por criterio.';
const defaultPromptLlamadas =
  'Evalúa la llamada telefónica según: 1) Saludo y presentación, 2) Calificación del lead (interés, autoridad, necesidad), 3) Manejo de objeciones, 4) Cierre o siguiente paso (agendar, callback). Asigna puntaje 1-10 por criterio. Indica si el lead califica para reunión.';

export default function SystemControl() {
  const [currentStep, setCurrentStep] = useState(1);
  const [promptEmpresa, setPromptEmpresa] = useState(defaultPromptEmpresa);
  const [promptEvaluacion, setPromptEvaluacion] = useState(defaultPromptEvaluacion);
  const [promptLlamadas, setPromptLlamadas] = useState(defaultPromptLlamadas);
  const [tagRules, setTagRules] = useState<
    { id: string; condition: string; tag: string; source: string }[]
  >([
    { id: '1', condition: "mencionan 'pollo con arroz'", tag: 'pollo_con_arroz', source: 'call' },
    { id: '2', condition: 'amountPaid > 5,000,000 COP', tag: 'high_ticket', source: 'meeting' },
  ]);
  const [metricRules, setMetricRules] = useState<
    { id: string; name: string; description: string; condition: string; increment: number }[]
  >([
    {
      id: '1',
      name: 'Mención de precio',
      description: 'Cada vez que en llamada se menciona el precio',
      condition: "transcript contains 'precio' or 'costo'",
      increment: 1,
    },
  ]);

  const addTagRule = () => {
    setTagRules((r) => [
      ...r,
      {
        id: Date.now().toString(),
        condition: '',
        tag: '',
        source: 'call',
      },
    ]);
  };

  const addMetricRule = () => {
    setMetricRules((r) => [
      ...r,
      {
        id: Date.now().toString(),
        name: '',
        description: '',
        condition: '',
        increment: 1,
      },
    ]);
  };

  return (
    <>
      <PageHeader
        title="Control del sistema"
        subtitle="Prompts / Etiquetas / Métricas"
      />
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        {/* Wizard steps */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentStep(s.id)}
              className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentStep === s.id
                  ? 'bg-accent-cyan text-black'
                  : 'bg-surface-700 text-gray-400 hover:text-white'
              }`}
            >
              {s.id}. {s.title}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-surface-500 bg-surface-800 p-4 md:p-6 min-h-[320px]">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                Prompt de contexto de empresa
              </h3>
              <p className="text-sm text-gray-400">
                Describe qué hace la empresa para que la IA tenga contexto en análisis.
              </p>
              <textarea
                value={promptEmpresa}
                onChange={(e) => setPromptEmpresa(e.target.value)}
                className="w-full rounded-lg bg-surface-700 border border-surface-500 p-3 text-sm text-white placeholder-gray-500 min-h-[180px] focus:ring-2 focus:ring-accent-cyan/50"
                placeholder="Qué hace la empresa..."
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                Evaluación de videollamadas
              </h3>
              <p className="text-sm text-gray-400">
                Prompt / rúbrica para evaluar reuniones (criterios, puntajes).
              </p>
              <textarea
                value={promptEvaluacion}
                onChange={(e) => setPromptEvaluacion(e.target.value)}
                className="w-full rounded-lg bg-surface-700 border border-surface-500 p-3 text-sm text-white placeholder-gray-500 min-h-[180px] focus:ring-2 focus:ring-accent-cyan/50"
                placeholder="Evalúa la videollamada según..."
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Phone className="w-5 h-5 text-accent-cyan" />
                Evaluación de llamadas telefónicas
              </h3>
              <p className="text-sm text-gray-400">
                Prompt con el que la IA evaluará cada llamada (criterios, puntajes, si el lead califica).
              </p>
              <textarea
                value={promptLlamadas}
                onChange={(e) => setPromptLlamadas(e.target.value)}
                className="w-full rounded-lg bg-surface-700 border border-surface-500 p-3 text-sm text-white placeholder-gray-500 min-h-[180px] focus:ring-2 focus:ring-accent-cyan/50"
                placeholder="Evalúa la llamada telefónica según..."
              />
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                Reglas de etiquetas para GHL
              </h3>
              <p className="text-sm text-gray-400">
                Si en llamada/chats/meetings pasa X → aplicar etiqueta Y.
              </p>
              <ul className="space-y-3">
                {tagRules.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-700 p-3"
                  >
                    <span className="text-gray-400 text-sm">Si</span>
                    <input
                      type="text"
                      value={r.condition}
                      onChange={(e) =>
                        setTagRules((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, condition: e.target.value } : x
                          )
                        )
                      }
                      placeholder="condición (ej: mencionan 'pollo')"
                      className="flex-1 min-w-[140px] rounded bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white"
                    />
                    <span className="text-gray-400 text-sm">→ tag</span>
                    <input
                      type="text"
                      value={r.tag}
                      onChange={(e) =>
                        setTagRules((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, tag: e.target.value } : x))
                        )
                      }
                      placeholder="nombre_etiqueta"
                      className="w-32 rounded bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white"
                    />
                    <select
                      value={r.source}
                      onChange={(e) =>
                        setTagRules((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, source: e.target.value } : x))
                        )
                      }
                      className="rounded bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white"
                    >
                      <option value="call">Llamada</option>
                      <option value="chat">Chat</option>
                      <option value="meeting">Meeting</option>
                    </select>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={addTagRule}
                className="text-sm text-accent-cyan hover:underline"
              >
                + Añadir regla
              </button>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                Reglas para métricas personalizadas
              </h3>
              <p className="text-sm text-gray-400">
                Esta métrica suma N cada vez que pase X en llamadas/chats/meetings.
              </p>
              <ul className="space-y-3">
                {metricRules.map((r) => (
                  <li key={r.id} className="rounded-lg bg-surface-700 p-3 space-y-2">
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) =>
                        setMetricRules((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x))
                        )
                      }
                      placeholder="Nombre de la métrica"
                      className="w-full rounded bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white"
                    />
                    <input
                      type="text"
                      value={r.description}
                      onChange={(e) =>
                        setMetricRules((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, description: e.target.value } : x
                          )
                        )
                      }
                      placeholder="Descripción"
                      className="w-full rounded bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white"
                    />
                    <input
                      type="text"
                      value={r.condition}
                      onChange={(e) =>
                        setMetricRules((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, condition: e.target.value } : x))
                        )
                      }
                      placeholder="Condición (ej: transcript contains 'precio')"
                      className="w-full rounded bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Incremento:</span>
                      <input
                        type="number"
                        value={r.increment}
                        onChange={(e) =>
                          setMetricRules((prev) =>
                            prev.map((x) =>
                              x.id === r.id ? { ...x, increment: +e.target.value } : x
                            )
                          )
                        }
                        className="w-16 rounded bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white"
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={addMetricRule}
                className="text-sm text-accent-cyan hover:underline"
              >
                + Añadir métrica
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-surface-700 border border-surface-500 text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep((s) => Math.min(5, s + 1))}
            disabled={currentStep === 5}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
