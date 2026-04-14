"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastRegion } from "@/components/ToastRegion";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        {children}
        <ToastRegion />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
