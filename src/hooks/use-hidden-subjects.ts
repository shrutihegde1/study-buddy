"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "board_hidden_subjects";

function loadHidden(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    // Ignore corrupt data
  }
  return new Set();
}

function saveHidden(hidden: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden]));
}

export function useHiddenSubjects() {
  const [hiddenSubjects, setHiddenSubjects] = useState<Set<string>>(loadHidden);

  // Sync to localStorage on change
  useEffect(() => {
    saveHidden(hiddenSubjects);
  }, [hiddenSubjects]);

  const toggleSubject = useCallback((name: string) => {
    setHiddenSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const isHidden = useCallback(
    (name: string) => hiddenSubjects.has(name),
    [hiddenSubjects]
  );

  return { hiddenSubjects, toggleSubject, isHidden };
}
