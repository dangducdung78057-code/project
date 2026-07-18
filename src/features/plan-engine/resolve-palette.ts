import type { KnowledgeRetrieval, PaletteSuggestion } from "@/lib/stageKnowledge";
import type { PalettePreset } from "@/domain/stageos/types";

export type PaletteResolution = {
  palette: PalettePreset | null;
  alternatives: PalettePreset[];
};

function toPreset(s: PaletteSuggestion): PalettePreset {
  return {
    id: s.id,
    name: s.label,
    primary: s.primary,
    primaryHex: s.primaryHex,
    secondary: s.secondary,
    secondaryHex: s.secondaryHex,
    accent: s.accent,
    accentHex: s.accentHex,
    note: s.note,
  };
}

/** 生成配色:知识库命中第一套为主配色,其余为备选。 */
export function resolvePalette(knowledge: KnowledgeRetrieval): PaletteResolution {
  const [first, ...rest] = knowledge.palettes;
  return {
    palette: first ? toPreset(first) : null,
    alternatives: rest.map(toPreset),
  };
}
