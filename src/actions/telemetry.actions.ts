"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "./auth.actions";

export async function logTelemetryAction(
  name: string,
  params: any = {},
  severity: string = "warning"
) {
  try {
    const session = await verifySession();
    const userId = session?.uid || null;

    const telemetryRef = adminDb.collection("telemetry").doc();
    await telemetryRef.set({
      id: telemetryRef.id,
      name,
      params,
      severity,
      userId,
      createdAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error("[Telemetry server action failed]:", error);
    return { success: false };
  }
}
