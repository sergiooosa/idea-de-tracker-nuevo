"use client";

import { X } from "lucide-react";

interface TagFilterProps {
  tags: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function TagFilter({ tags, selected, onChange }: TagFilterProps) {
  if (tags.length === 0) return null;

  const toggle = (tag: string) => {
    onChange(
      selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag],
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mr-1">Etiquetas:</span>
      {tags.map((tag) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
              active
                ? "bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40"
                : "bg-surface-700 text-gray-400 border-surface-500 hover:bg-surface-600 hover:text-white"
            }`}
          >
            {tag}
            {active && <X className="w-3 h-3" />}
          </button>
        );
      })}
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-[10px] text-gray-500 hover:text-white ml-1 underline"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
