import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Layers, Redo2, Save, Undo2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_KEYFRAMES,
  PRIMARY_TEMPLATE_NAMES,
  RISER_COUNT_OPTIONS,
  listFormationTemplates,
} from "@/domain/stageos";
import { useStageEditorStore } from "@/stores/stage-editor-store";
import { Stage25DViewport, type Stage25DViewportHandle } from "./Stage25DViewport";

export type Stage25DWorkbenchProps = {
  projectId: string;
  projectTitle: string;
  inputSummary: {
    programLabel: string;
    venueType: string;
    budgetLevel: string;
    ageRange: string;
  };
  provenanceBadge: string;
  onSave: () => Promise<void> | void;
  saving?: boolean;
};

/**
 * 2.5D 舞台预览与队形编排工作台。
 * 顶栏:返回 / 项目名 / 3D 切换 / 撤销重做 / 保存 / 导出
 * 左栏:演出资料摘要;右栏:编排 / 队形模板 / 台阶 / 标注开关;底部:关键帧时间轴。
 */
export function Stage25DWorkbench({ projectId, projectTitle, inputSummary, provenanceBadge, onSave, saving }: Stage25DWorkbenchProps) {
  const viewportRef = useRef<Stage25DViewportHandle | null>(null);
  const [webglFallback, setWebglFallback] = useState(false);

  const performerCount = useStageEditorStore((s) => s.performers.length);
  const maleCount = useStageEditorStore((s) => s.performers.filter((p) => p.gender === "male").length);
  const femaleCount = useStageEditorStore((s) => s.performers.filter((p) => p.gender === "female").length);
  const selectedCount = useStageEditorStore((s) => s.selectedIds.length);
  const dirty = useStageEditorStore((s) => s.dirty);
  const lastSavedAt = useStageEditorStore((s) => s.lastSavedAt);
  const canUndo = useStageEditorStore((s) => s.past.length > 0);
  const canRedo = useStageEditorStore((s) => s.future.length > 0);
  const keyframes = useStageEditorStore((s) => s.keyframes);
  const activeKeyframeId = useStageEditorStore((s) => s.activeKeyframeId);
  const labels = useStageEditorStore((s) => s.labels);
  const riserCount = useStageEditorStore((s) => s.stage.riserCount);
  const snapEnabled = useStageEditorStore((s) => s.snapEnabled);

  const applyTemplate = useStageEditorStore((s) => s.applyTemplate);
  const undo = useStageEditorStore((s) => s.undo);
  const redo = useStageEditorStore((s) => s.redo);
  const setLabels = useStageEditorStore((s) => s.setLabels);
  const toggleSnap = useStageEditorStore((s) => s.toggleSnap);
  const setRiserCount = useStageEditorStore((s) => s.setRiserCount);
  const recordKeyframe = useStageEditorStore((s) => s.recordKeyframe);
  const activateKeyframe = useStageEditorStore((s) => s.activateKeyframe);
  const alignSelection = useStageEditorStore((s) => s.alignSelection);
  const distributeSelection = useStageEditorStore((s) => s.distributeSelection);

  const allTemplates = listFormationTemplates();
  const primaryTemplates = PRIMARY_TEMPLATE_NAMES.filter((n) => allTemplates.includes(n));
  const extraTemplates = allTemplates.filter((n) => !primaryTemplates.includes(n));

  const handleTemplate = useCallback(
    (name: string) => {
      const ok = applyTemplate(name);
      if (ok) toast({ title: `已应用队形「${name}」` });
      else toast({ title: `模板「${name}」暂不可用`, variant: "destructive" });
    },
    [applyTemplate],
  );

  const handleExport = useCallback(() => {
    const ok = viewportRef.current?.exportPng(`stage-2.5d-${projectId}.png`) ?? false;
    if (!ok) toast({ title: "导出失败,请重试", variant: "destructive" });
  }, [projectId]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-2 p-2">
      {/* 顶栏 */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/projects/${projectId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> 返回项目
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{projectTitle}</div>
          <div className="text-xs text-muted-foreground">2.5D 舞台预览与队形编排</div>
        </div>
        <Badge variant="outline" className="text-xs">{provenanceBadge}</Badge>
        <Button asChild variant="outline" size="sm">
          <Link to={`/projects/${projectId}`}>
            <Layers className="mr-1 h-4 w-4" /> 3D 验证
          </Link>
        </Button>
        <Button variant="outline" size="sm" disabled={!canUndo} onClick={undo}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" disabled={!canRedo} onClick={redo}>
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={() => void onSave()} disabled={saving}>
          <Save className="mr-1 h-4 w-4" /> {saving ? "保存中…" : dirty ? "保存 *" : "保存"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-1 h-4 w-4" /> 导出 PNG
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr_240px] gap-2">
        {/* 左侧资料面板 */}
        <div className="panel space-y-3 overflow-y-auto p-3 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">演出资料</div>
          <dl className="space-y-2">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">人数</dt>
              <dd className="flex items-center gap-1 font-medium">
                <Users className="h-3.5 w-3.5" /> {performerCount}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">男 / 女</dt>
              <dd className="font-medium">{maleCount} / {femaleCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">节目类型</dt>
              <dd className="font-medium">{inputSummary.programLabel}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">学段</dt>
              <dd className="font-medium">{inputSummary.ageRange}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">场地</dt>
              <dd className="font-medium">{inputSummary.venueType}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">预算</dt>
              <dd className="font-medium">{inputSummary.budgetLevel}</dd>
            </div>
          </dl>
          <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
            人物以匿名编号显示,不包含真实姓名与人脸信息。
            {selectedCount > 0 && <div className="mt-1 text-foreground">已选中 {selectedCount} 人</div>}
            {lastSavedAt && <div className="mt-1">上次保存:{new Date(lastSavedAt).toLocaleTimeString()}</div>}
            {webglFallback && <div className="mt-1 text-amber-500">当前环境无 WebGL,已切换静态降级视图</div>}
          </div>
        </div>

        {/* 中央视口 */}
        <div className="min-h-0">
          <Stage25DViewport
            onReady={(h) => { viewportRef.current = h; }}
            onWebGLFallback={() => setWebglFallback(true)}
          />
        </div>

        {/* 右侧设计面板 */}
        <div className="panel space-y-4 overflow-y-auto p-3 text-sm">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              编排{selectedCount > 0 ? `(选中 ${selectedCount} 人)` : ""}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={selectedCount < 2} onClick={() => alignSelection("left")}>左对齐</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={selectedCount < 2} onClick={() => alignSelection("centerX")}>水平居中</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={selectedCount < 2} onClick={() => alignSelection("right")}>右对齐</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={selectedCount < 2} onClick={() => alignSelection("back")}>后排对齐</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={selectedCount < 2} onClick={() => alignSelection("centerZ")}>纵深居中</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={selectedCount < 2} onClick={() => alignSelection("front")}>前排对齐</Button>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={selectedCount < 3} onClick={() => distributeSelection("x")}>横向等距</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={selectedCount < 3} onClick={() => distributeSelection("z")}>纵向等距</Button>
            </div>
            <label className="mt-2 flex items-center justify-between py-1 text-sm">
              <span>网格吸附 0.25m</span>
              <Switch checked={snapEnabled} onCheckedChange={() => toggleSnap()} />
            </label>
            <div className="text-[11px] leading-snug text-muted-foreground">
              拖拽空白处可框选;Shift 增量选择;拖动多选中的任意一人可整组移动。
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">一键队形</div>
            <div className="grid grid-cols-2 gap-1.5">
              {primaryTemplates.map((name) => (
                <Button key={name} variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleTemplate(name)}>
                  {name}
                </Button>
              ))}
            </div>
            {extraTemplates.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">更多通用队形({extraTemplates.length})</summary>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {extraTemplates.map((name) => (
                    <Button key={name} variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleTemplate(name)}>
                      {name}
                    </Button>
                  ))}
                </div>
              </details>
            )}
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">合唱台阶</div>
            <div className="flex gap-1.5">
              {RISER_COUNT_OPTIONS.map((n) => (
                <Button
                  key={n}
                  variant={riserCount === n ? "default" : "outline"}
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  onClick={() => setRiserCount(n)}
                >
                  {n === 0 ? "无" : `${n}层`}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">标注</div>
            <label className="flex items-center justify-between py-1 text-sm">
              <span>匿名编号</span>
              <Switch checked={labels.id} onCheckedChange={(v) => setLabels({ id: v })} />
            </label>
            <label className="flex items-center justify-between py-1 text-sm">
              <span>身高</span>
              <Switch checked={labels.height} onCheckedChange={(v) => setLabels({ height: v })} />
            </label>
          </div>
        </div>
      </div>

      {/* 底部关键帧时间轴 */}
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2">
        <span className="text-xs text-muted-foreground">关键帧</span>
        <div className="flex flex-1 items-center gap-1.5">
          {keyframes.map((kf) => (
            <Button
              key={kf.id}
              variant={activeKeyframeId === kf.id ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => activateKeyframe(kf.id)}
            >
              {kf.name}
              <span className="ml-1 text-[10px] opacity-70">{kf.timeSec}s</span>
            </Button>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 text-xs"
          disabled={!activeKeyframeId}
          onClick={() => {
            if (!activeKeyframeId) return;
            recordKeyframe(activeKeyframeId);
            const name = DEFAULT_KEYFRAMES.find((k) => k.id === activeKeyframeId)?.name ?? "当前";
            toast({ title: `已记录到「${name}」关键帧` });
          }}
        >
          记录当前队形到此关键帧
        </Button>
      </div>
    </div>
  );
}
