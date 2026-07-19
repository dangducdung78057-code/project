import { MODULE_STATUS_META, STAGEOS_MODULES } from "@/lib/stageos";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SETTINGS_SAFE_COLUMNS } from "@/lib/settingsColumns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToneBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

export default function Modules() {
  const [apiMode, setApiMode] = useState("mock");
  const [apiBaseUrl, setApiBaseUrl] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select(SETTINGS_SAFE_COLUMNS).eq("id", "global").maybeSingle();
      const row = data as { api_mode?: string; api_base_url?: string | null } | null;
      if (row) { setApiMode(row.api_mode ?? "mock"); setApiBaseUrl(row.api_base_url ?? ""); }
    })();
  }, []);

  async function save() {
    await supabase.from("settings").upsert({ id: "global", api_mode: apiMode, api_base_url: apiBaseUrl || null });
    toast.success("模块设置已保存");
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold">模块注册表</h1>
        <p className="text-sm text-muted-foreground">
          StageOS 能力清单与真实实现位置。状态分为「已实现 / 部分实现 / 规划中」，规划中的能力不会在用户流程中显示为可用。
        </p>
      </div>

      <div className="space-y-3">
        {STAGEOS_MODULES.map((m) => {
          const meta = MODULE_STATUS_META[m.status];
          const planned = m.status === "planned";
          return (
            <div className={`panel ${planned ? "opacity-60" : ""}`} key={m.group}>
              <div className="panel-header">
                <div>
                  <h3 className="text-sm font-semibold">{m.group}</h3>
                  <div className="text-xs text-muted-foreground">{m.desc}</div>
                </div>
                <ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>
              </div>
              {m.entries.length > 0 && (
                <div className="panel-body flex flex-wrap gap-1.5">
                  {m.entries.map((r) => <span key={r} className="kbd-route">{r}</span>)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2 className="text-sm font-semibold">外部 API 接入（预留配置）</h2>
          <ToneBadge tone="muted">预留</ToneBadge>
        </div>
        <div className="panel-body grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">apiMode</Label>
            <select className="h-9 w-full rounded border bg-background px-2 text-sm" value={apiMode} onChange={(e) => setApiMode(e.target.value)}>
              <option value="mock">local (默认，本地规则引擎)</option>
              <option value="api">api (预留)</option>
            </select>
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">apiBaseUrl (可选，未来集成真实 StageOS 后端)</Label>
            <Input value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} placeholder="https://api.stageos.example.com" />
          </div>
          <div className="md:col-span-3">
            <Button size="sm" onClick={save}>保存</Button>
            <span className="ml-3 text-xs text-muted-foreground">
              当前默认走本地规则引擎，离线可用、无需 Token；真实 API 模式仅为保留配置，不依赖已部署的后端。
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
