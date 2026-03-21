"use client";

import type { ChangeEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DomainsType, VideoRecoveryUserOption } from "../types/videoRecovery.types";

export interface VideoRecoveryFiltersValues {
  id_evento: string;
  from: string;
  to: string;
  timezone: string;
  teams: string;
  recorded_by: string;
  calendar_invitees_domains: string;
  calendar_invitees_domains_type: DomainsType;
  limit: number;
}

interface VideoRecoveryFiltersProps {
  values: VideoRecoveryFiltersValues;
  users: VideoRecoveryUserOption[];
  loading: boolean;
  onChange: (next: Partial<VideoRecoveryFiltersValues>) => void;
  onSubmit: () => void;
}

export function VideoRecoveryFilters({
  values,
  users,
  loading,
  onChange,
  onSubmit,
}: VideoRecoveryFiltersProps) {
  return (
    <section className="rounded-xl border border-surface-500 bg-surface-800/80 p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-white">Recuperador de videollamadas</h2>
        <p className="text-xs text-gray-400 mt-1">
          Consulta reuniones por rango, revisa la previsualizacion y recupera por lotes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-gray-300">Usuario (id_evento) *</span>
          <select
            value={values.id_evento}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onChange({ id_evento: event.target.value })
            }
            className="w-full h-9 rounded-md border border-surface-500 bg-surface-700 px-3 text-sm text-white"
          >
            <option value="">Seleccionar usuario</option>
            {users.map((user) => (
              <option key={user.id_evento} value={user.id_evento}>
                {user.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-gray-300">Desde *</span>
          <Input
            type="datetime-local"
            value={values.from}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ from: event.target.value })
            }
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-gray-300">Hasta *</span>
          <Input
            type="datetime-local"
            value={values.to}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ to: event.target.value })
            }
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-gray-300">Timezone *</span>
          <Input
            type="text"
            placeholder="America/Bogota"
            value={values.timezone}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ timezone: event.target.value })
            }
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-gray-300">Teams (csv)</span>
          <Input
            type="text"
            placeholder="Ventas,Inbound"
            value={values.teams}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ teams: event.target.value })
            }
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-gray-300">Recorded by (emails csv)</span>
          <Input
            type="text"
            placeholder="user1@dominio.com,user2@dominio.com"
            value={values.recorded_by}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ recorded_by: event.target.value })
            }
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-gray-300">Domains (csv)</span>
          <Input
            type="text"
            placeholder="gmail.com,empresa.com"
            value={values.calendar_invitees_domains}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ calendar_invitees_domains: event.target.value })
            }
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-gray-300">Domains type</span>
          <select
            value={values.calendar_invitees_domains_type}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onChange({ calendar_invitees_domains_type: event.target.value as DomainsType })
            }
            className="w-full h-9 rounded-md border border-surface-500 bg-surface-700 px-3 text-sm text-white"
          >
            <option value="all">all</option>
            <option value="only_internal">only_internal</option>
            <option value="one_or_more_external">one_or_more_external</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-gray-300">Limit</span>
          <Input
            type="number"
            min={1}
            max={200}
            value={String(values.limit)}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({
                limit: Number.isNaN(event.target.valueAsNumber)
                  ? 50
                  : Math.max(1, Math.min(200, event.target.valueAsNumber)),
              })
            }
          />
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={onSubmit} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Buscar reuniones
        </Button>
      </div>
    </section>
  );
}

