"use client";

import { useQuery } from "@tanstack/react-query";
import type { ConceptTree } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// API helper with robust network failure handling
// ─────────────────────────────────────────────────────────────────────────────

async function fetchConceptTree(topic: string): Promise<ConceptTree> {
  const clean = topic.trim();
  if (!clean) {
    throw new Error("Topic cannot be empty or whitespace-only.");
  }

  let res: Response;
  try {
    res = await fetch("/api/concept-tree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: clean }),
    });
  } catch (netErr) {
    console.error("[useConceptTree] Network failure:", netErr);
    throw new Error(
      "Unable to connect to the server. Please check your internet connection and try again."
    );
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      // ignore json parse failure
    }
    throw new Error(message);
  }

  return res.json() as Promise<ConceptTree>;
}

// ─────────────────────────────────────────────────────────────────────────────
// useConceptTree
// ─────────────────────────────────────────────────────────────────────────────

export function useConceptTree(topic: string) {
  const clean = topic ? topic.trim() : "";

  return useQuery<ConceptTree, Error>({
    queryKey: ["tree", clean],
    queryFn: () => fetchConceptTree(clean),

    // Do not fetch until caller supplies a non-empty, non-whitespace topic
    enabled: clean.length > 0,

    staleTime: 5 * 60_000,
    retry: 1, // Auto retry once on failure before presenting error UI
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
