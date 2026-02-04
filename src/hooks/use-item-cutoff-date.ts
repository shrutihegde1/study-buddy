"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "item_cutoff_date";

function getDefaultCutoff(): string {
  const now = new Date();
  const year = now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();
  return `${year}-08-01`;
}

function loadCutoff(): string | null {
  if (typeof window === "undefined") return getDefaultCutoff();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) return raw || null;
  } catch {
    // Ignore corrupt data
  }
  return getDefaultCutoff();
}

function saveCutoff(date: string | null) {
  if (date === null) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, date);
  }
}

export function useItemCutoffDate() {
  const [cutoffDate, setCutoffDateState] = useState<string | null>(loadCutoff);

  useEffect(() => {
    saveCutoff(cutoffDate);
  }, [cutoffDate]);

  const setCutoffDate = useCallback((date: string | null) => {
    setCutoffDateState(date);
  }, []);

  const clearCutoff = useCallback(() => {
    setCutoffDateState(null);
  }, []);

  return { cutoffDate, setCutoffDate, clearCutoff };
}
