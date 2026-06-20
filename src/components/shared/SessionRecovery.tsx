"use client";

import { useSessionRecovery } from "@/hooks/useSessionRecovery";

export function SessionRecovery({ sessionKey }: { sessionKey: string }) {
  useSessionRecovery(sessionKey);
  return null;
}
