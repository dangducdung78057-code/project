import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { PROGRAM_TYPES, SCHOOL_STAGES, type StageInputData } from "@/lib/stageos";
import { engineModeLabel } from "@/domain/stageos";
import { extractEditorSnapshot, useStageEditorStore } from "@/stores/stage-editor-store";
import { Stage25DWorkbench } from "@/features/stage-2.5d/Stage25DWorkbench";
import { FullPageLoader } from "@/components/FullPageLoader";

/**
 * 2.5D 舞台预览与队形编排工作台(路由页)。
 * 数据流:stage_inputs.data → stage-editor-store → Pixi 视口;
 * 保存:序列化快照写回 stage_inputs.data.__stageEditor(+ localStorage 兜底)。
 */
export default function Stage25DPreview() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projectTitle, setProjectTitle] = useState("未命名项目");
  const [input, setInput] = useState<StageInputData | null>(null);
  const [provenanceBadge, setProvenanceBadge] = useState("本地规则生成");
  const [privacyConfirmed, setPrivacyConfirmed] = useState<boolean | null>(null);

  const initFromStageInput = useStageEditorStore((s) => s.initFromStageInput);
  const serialize = useStageEditorStore((s) => s.serialize);
  const markSaved = useStageEditorStore((s) => s.markSaved);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [{ data: project }, { data: stageInputRow }, { data: snapshots }, { data: confirmations }] =
        await Promise.all([
          supabase.from("projects").select("title").eq("id", id).maybeSingle(),
          supabase.from("stage_inputs").select("data").eq("project_id", id).maybeSingle(),
          supabase
            .from("plan_snapshots")
            .select("mode, provider_status")
            .eq("project_id", id)
            .order("version", { ascending: false })
            .limit(1),
          supabase.from("confirmation_records").select("id").eq("project_id", id).limit(1),
        ]);
      if (cancelled) return;

      if (project?.title) setProjectTitle(project.title);
      const stageInput = (stageInputRow?.data ?? {}) as StageInputData;
      setInput(stageInput);
      const restored = extractEditorSnapshot(stageInputRow?.data);
      initFromStageInput(id, stageInput, restored);

      const latest = snapshots?.[0];
      if (latest) setProvenanceBadge(engineModeLabel(latest.mode, latest.provider_status));
      setPrivacyConfirmed(Array.isArray(confirmations) && confirmations.length > 0);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, initFromStageInput]);

  const inputSummary = useMemo(() => {
    const programLabel =
      PROGRAM_TYPES.find((t) => t.value === input?.programType)?.label ?? input?.programType ?? "未填写";
    const stageLabel = SCHOOL_STAGES.find((s) => s.value === input?.schoolStage)?.label ?? "未填写";
    return {
      programLabel,
      venueType: input?.venueType ?? "未填写",
      budgetLevel: typeof input?.perPersonBudget === "number" ? `¥${input.perPersonBudget}/人` : "未填写",
      ageRange: stageLabel,
    };
  }, [input]);

  const handleSave = async () => {
    if (!id || !user) {
      toast({ title: "未登录,无法保存", variant: "destructive" });
      return;
    }
    setSaving(true);
    const snapshot = serialize();
    const merged = { ...(input as Record<string, unknown>), __stageEditor: snapshot };
    const { data: existing } = await supabase.from("stage_inputs").select("id").eq("project_id", id).maybeSingle();
    const { error } = existing
      ? await supabase.from("stage_inputs").update({ data: merged, user_id: user.id }).eq("project_id", id)
      : await supabase.from("stage_inputs").insert({ project_id: id, user_id: user.id, data: merged });
    if (error) {
      // 本地兜底:离线/RLS 异常时不丢工作成果
      try {
        localStorage.setItem(`stageos.editor.${id}`, JSON.stringify(snapshot));
        toast({ title: "云端保存失败,已保存到本机", description: error.message, variant: "destructive" });
      } catch {
        toast({ title: "保存失败", description: error.message, variant: "destructive" });
      }
    } else {
      try {
        localStorage.setItem(`stageos.editor.${id}`, JSON.stringify(snapshot));
      } catch {
        /* 忽略本地缓存失败 */
      }
      markSaved();
      toast({ title: "已保存当前队形与设置" });
    }
    setSaving(false);
  };

  if (loading) return <FullPageLoader label="正在加载 2.5D 舞台预览…" />;

  return (
    <div className="flex flex-col">
      {privacyConfirmed === false && (
        <div className="mx-2 mt-2 flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          本项目尚未完成隐私确认。预览与队形编排仅使用匿名编号,请在项目详情页完成确认后再生成正式方案。
        </div>
      )}
      <Stage25DWorkbench
        projectId={id ?? ""}
        projectTitle={projectTitle}
        inputSummary={inputSummary}
        provenanceBadge={provenanceBadge}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
