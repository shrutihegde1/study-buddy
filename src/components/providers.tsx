"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FocusTimerProvider } from "@/components/focus-timer/focus-timer-context";
import { FocusTimerOverlay } from "@/components/focus-timer/focus-timer-overlay";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <FocusTimerProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <FocusTimerOverlay />
      </FocusTimerProvider>
    </QueryClientProvider>
  );
}
