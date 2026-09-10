"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RemediationResponse } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RemediationInput {
  nodeId: string;
  misconceptionId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API helper with robust network failure handling
// ─────────────────────────────────────────────────────────────────────────────

async function fetchRemediation(
  input: RemediationInput
): Promise<RemediationResponse> {
  let res: Response;
  try {
    res = await fetch("/api/remediate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (netErr) {
    console.error("[useRemediation] Network failure:", netErr);
    throw new Error(
      "Unable to connect to the remediation service. Please check your internet connection and try again."
    );
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      // ignore json failure
    }
    throw new Error(message);
  }

  return res.json() as Promise<RemediationResponse>;
}

// ─────────────────────────────────────────────────────────────────────────────
// useRemediation
// ─────────────────────────────────────────────────────────────────────────────

export function useRemediation() {
  const queryClient = useQueryClient();

  return useMutation<RemediationResponse, Error, RemediationInput>({
    mutationFn: fetchRemediation,

    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ["remediation", variables.nodeId, variables.misconceptionId],
        data
      );
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// useRemediationResult
// ─────────────────────────────────────────────────────────────────────────────

export function useRemediationResult(
  nodeId: string,
  misconceptionId: string
): RemediationResponse | undefined {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<RemediationResponse>([
    "remediation",
    nodeId,
    misconceptionId,
  ]);
}
