"use client";

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

// ─────────────────────────────────────────────────────────────────────────────
// Providers
//
// This component is the sole 'use client' boundary at the layout level.
// Keeping it here (rather than marking app/layout.tsx as a client component)
// means Server Components elsewhere in the tree continue to benefit from
// server-side rendering and streaming.
//
// QueryClient is created inside useState so each user session gets its own
// instance — important for SSR correctness (avoids shared state between
// requests on the server).
// ─────────────────────────────────────────────────────────────────────────────

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Don't re-fetch on window focus in development — reduces noise.
        refetchOnWindowFocus: process.env.NODE_ENV === "production",
        // Treat server-fetched data as fresh for 60 seconds before
        // background re-validation kicks in.
        staleTime: 60_000,
        // Retry failed queries once before surfacing the error.
        retry: 1,
      },
    },
  });
}

// Singleton for the browser (avoids creating a new client on every render
// while still creating a fresh client per SSR request).
let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: always create a fresh client.
    return makeQueryClient();
  }
  // Browser: reuse the existing client or create one on first call.
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  // useState ensures the client is stable across renders without needing a
  // module-level singleton on the server.
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
