"use client";

import { useState, useEffect } from "react";
import type { DocsPersona } from "@/lib/docs-registry";

export type PersonaFilterProps = {
  value: DocsPersona | null;
  onChange: (persona: DocsPersona | null) => void;
};

const PERSONAS: Array<{ value: DocsPersona | null; label: string; description: string }> = [
  { value: null, label: "All", description: "Show all documentation" },
  { value: "designers", label: "Designers", description: "Visual tools and components" },
  { value: "developers", label: "Developers", description: "Technical reference and APIs" },
];

export function PersonaFilter({ value, onChange }: PersonaFilterProps) {
  return (
    <div className="persona-filter">
      <div className="persona-filter-label">I am a:</div>
      <div className="persona-filter-pills">
        {PERSONAS.map((persona) => (
          <button
            key={persona.label}
            className={`persona-pill ${value === persona.value ? "active" : ""}`}
            onClick={() => onChange(persona.value)}
            title={persona.description}
          >
            {persona.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Hook for managing persona filter state with localStorage persistence
 */
export function usePersonaFilter(): [DocsPersona | null, (persona: DocsPersona | null) => void] {
  const [persona, setPersona] = useState<DocsPersona | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Initialize from localStorage on client
  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem("babulus-docs-persona");
    if (stored && (stored === "designers" || stored === "developers")) {
      setPersona(stored as DocsPersona);
    }
  }, []);

  const updatePersona = (newPersona: DocsPersona | null) => {
    setPersona(newPersona);
    if (isClient) {
      if (newPersona) {
        localStorage.setItem("babulus-docs-persona", newPersona);
      } else {
        localStorage.removeItem("babulus-docs-persona");
      }
    }
  };

  return [persona, updatePersona];
}
