"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface FocusTimerState {
  taskId: string | null;
  taskTitle: string;
  secondsRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
}

interface FocusTimerActions {
  startFocusTimer: (taskId: string, taskTitle: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  restart: () => void;
  close: () => void;
}

type FocusTimerContextValue = FocusTimerState & FocusTimerActions;

const FOCUS_DURATION = 30 * 60; // 30 minutes in seconds

const FocusTimerContext = createContext<FocusTimerContextValue | null>(null);

export function FocusTimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FocusTimerState>({
    taskId: null,
    taskTitle: "",
    secondsRemaining: FOCUS_DURATION,
    isRunning: false,
    isPaused: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.isRunning && !state.isPaused && state.secondsRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.secondsRemaining <= 1) {
            return { ...prev, secondsRemaining: 0, isRunning: false };
          }
          return { ...prev, secondsRemaining: prev.secondsRemaining - 1 };
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning, state.isPaused, state.secondsRemaining]);

  const startFocusTimer = useCallback((taskId: string, taskTitle: string) => {
    setState({
      taskId,
      taskTitle,
      secondsRemaining: FOCUS_DURATION,
      isRunning: true,
      isPaused: false,
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: false }));
  }, []);

  const stop = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: false, isPaused: false }));
  }, []);

  const restart = useCallback(() => {
    setState((prev) => ({
      ...prev,
      secondsRemaining: FOCUS_DURATION,
      isRunning: true,
      isPaused: false,
    }));
  }, []);

  const close = useCallback(() => {
    setState({
      taskId: null,
      taskTitle: "",
      secondsRemaining: FOCUS_DURATION,
      isRunning: false,
      isPaused: false,
    });
  }, []);

  return (
    <FocusTimerContext.Provider
      value={{ ...state, startFocusTimer, pause, resume, stop, restart, close }}
    >
      {children}
    </FocusTimerContext.Provider>
  );
}

export function useFocusTimer() {
  const ctx = useContext(FocusTimerContext);
  if (!ctx) {
    throw new Error("useFocusTimer must be used within a FocusTimerProvider");
  }
  return ctx;
}
