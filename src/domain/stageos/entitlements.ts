export type MembershipTier = "free" | "member" | "custom";

export type PreviewRenderMode = "dot-sketch" | "stage-2.5d" | "stage-3d";

export type StageOSEntitlements = {
  tier: MembershipTier;
  previewModes: PreviewRenderMode[];
  maxPerformers: number;
  formationTemplateLimit: number | null;
  canUsePerformerSprites: boolean;
  canUseCostumeEditor: boolean;
  canUseStageAssets: boolean;
  canUseTimeline: boolean;
  canUseMovementPaths: boolean;
  canUseOcclusionAnalysis: boolean;
  canUseSafetyAnalysis: boolean;
  canUse3DSync: boolean;
  canExportDotSketch: boolean;
  canExportHighResolution: boolean;
  maxSavedSnapshots: number | null;
};

export const STAGEOS_ENTITLEMENTS: Record<MembershipTier, StageOSEntitlements> = {
  free: {
    tier: "free",
    previewModes: ["dot-sketch"],
    maxPerformers: 60,
    formationTemplateLimit: 4,
    canUsePerformerSprites: false,
    canUseCostumeEditor: false,
    canUseStageAssets: false,
    canUseTimeline: false,
    canUseMovementPaths: false,
    canUseOcclusionAnalysis: false,
    canUseSafetyAnalysis: false,
    canUse3DSync: false,
    canExportDotSketch: true,
    canExportHighResolution: false,
    maxSavedSnapshots: 1,
  },
  member: {
    tier: "member",
    previewModes: ["dot-sketch", "stage-2.5d", "stage-3d"],
    maxPerformers: 100,
    formationTemplateLimit: null,
    canUsePerformerSprites: true,
    canUseCostumeEditor: true,
    canUseStageAssets: true,
    canUseTimeline: true,
    canUseMovementPaths: true,
    canUseOcclusionAnalysis: true,
    canUseSafetyAnalysis: true,
    canUse3DSync: true,
    canExportDotSketch: true,
    canExportHighResolution: true,
    maxSavedSnapshots: null,
  },
  custom: {
    tier: "custom",
    previewModes: ["dot-sketch", "stage-2.5d", "stage-3d"],
    maxPerformers: 300,
    formationTemplateLimit: null,
    canUsePerformerSprites: true,
    canUseCostumeEditor: true,
    canUseStageAssets: true,
    canUseTimeline: true,
    canUseMovementPaths: true,
    canUseOcclusionAnalysis: true,
    canUseSafetyAnalysis: true,
    canUse3DSync: true,
    canExportDotSketch: true,
    canExportHighResolution: true,
    maxSavedSnapshots: null,
  },
};

export function getStageOSEntitlements(tier: MembershipTier | null | undefined): StageOSEntitlements {
  return STAGEOS_ENTITLEMENTS[tier ?? "free"];
}

export function canUsePreviewMode(
  entitlements: StageOSEntitlements,
  mode: PreviewRenderMode,
): boolean {
  return entitlements.previewModes.includes(mode);
}

export function requireStageOSFeature(
  allowed: boolean,
  featureName: string,
): void {
  if (!allowed) {
    throw new Error(`MEMBERSHIP_REQUIRED:${featureName}`);
  }
}
