/** B2B/VLUER E2E 파이프라인 구조화 로그 (서버) */
export type B2bPipelineStage =
  | "enrollment.documents_uploaded"
  | "enrollment.submitted"
  | "enrollment.submit_failed"
  | "branding.saved"
  | "branding.logo_uploaded"
  | "branding.save_failed"
  | "admin.attribution_approved"
  | "cart.activated"
  | "e2e.check";

export function logB2bPipeline(
  stage: B2bPipelineStage,
  detail: Record<string, unknown> = {}
) {
  const entry = {
    stage,
    at: new Date().toISOString(),
    ...detail
  };
  console.info("[VLUE B2B Pipeline]", JSON.stringify(entry));
  return entry;
}
