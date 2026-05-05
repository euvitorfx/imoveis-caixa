"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  label: string;
  options: string[];
  value: string[];
  onChange: (vals: string[]) => void;
  disabled?: boolean;
  searchable?: boolean;
}

export default function MultiSelect({
  label,
  options,
  value,
  onChange,
  disabled = false,
  searchable = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };

  const filtered =
    searchable && search
      ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
      : options;

  const buttonLabel =
    value.length === 0
      ? label
      : value.length === 1
      ? value[0]
      : `${value[0]} +${value.length - 1}`;

  const hasValue = value.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
        className={[
          "w-full rounded-lg border px-3 py-2 text-sm text-left flex items-center justify-between",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors",
          disabled ? "opacity-50 cursor-not-allowed border-gray-300" : "cursor-pointer hover:border-gray-400",
          hasValue ? "border-blue-400" : "border-gray-300",
        ].join(" ")}
      >
        <span className={`truncate ${hasValue ? "text-blue-700 font-medium" : "text-gray-500"}`}>
          {buttonLabel}
        </span>
        <svg
          className={`ml-1 w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col max-h-60 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-100 shrink-0">
              <input
                autoFocus
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          )}
          <div className="overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-2">Sem resultados</p>
            ) : (
              filtered.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 cursor-pointer text-sm select-none"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(opt)}
                    onChange={() => toggle(opt)}
                    className="accent-blue-600 shrink-0"
                  />
                  <span className="truncate">{opt}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
