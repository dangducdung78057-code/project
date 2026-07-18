-- StageOS 主线整理:来源标识列 + 编辑器快照/资产/审计/导出新表
-- 所有项目数据按 user_id 隔离(RLS)。

-- plan_snapshots:来源标识与约束结果
alter table public.plan_snapshots
  add column if not exists engine text,
  add column if not exists schema_version text,
  add column if not exists provenance jsonb,
  add column if not exists warnings jsonb;

-- 队形快照(2.5D/3D 共享,不可变版本)
create table if not exists public.formation_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  name text not null default '未命名队形',
  keyframe_id text,
  formation jsonb not null,
  schema_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);
alter table public.formation_snapshots enable row level security;
create policy "users manage own formation_snapshots"
  on public.formation_snapshots for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists formation_snapshots_project_idx on public.formation_snapshots (project_id, created_at desc);

-- 外观快照(服装/配色应用状态)
create table if not exists public.appearance_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  name text not null default '未命名外观',
  appearance jsonb not null,
  palette jsonb,
  schema_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);
alter table public.appearance_snapshots enable row level security;
create policy "users manage own appearance_snapshots"
  on public.appearance_snapshots for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists appearance_snapshots_project_idx on public.appearance_snapshots (project_id, created_at desc);

-- 资产清单(服装 GLB / 精灵 / 材质,含顶点与材质预算校验结果)
create table if not exists public.asset_manifests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kind text not null, -- 'outfit' | 'sprite' | 'texture' | 'model'
  manifest jsonb not null,
  vertex_count integer,
  triangle_count integer,
  material_count integer,
  status text not null default 'pending', -- 'pending' | 'validated' | 'rejected'
  issues jsonb,
  created_at timestamptz not null default now()
);
alter table public.asset_manifests enable row level security;
create policy "users manage own asset_manifests"
  on public.asset_manifests for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 审计日志(所有写入动作:用户归属、版本、载荷)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create policy "users read own audit_logs"
  on public.audit_logs for select
  using (auth.uid() = user_id);
create policy "users insert own audit_logs"
  on public.audit_logs for insert
  with check (auth.uid() = user_id);
create index if not exists audit_logs_project_idx on public.audit_logs (project_id, created_at desc);

-- 导出任务(与 export_records 互补:异步任务状态机)
create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  kind text not null, -- 'png' | 'svg' | 'pdf' | 'markdown'
  status text not null default 'queued', -- 'queued' | 'running' | 'done' | 'failed'
  snapshot_version integer,
  payload jsonb,
  result_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.export_jobs enable row level security;
create policy "users manage own export_jobs"
  on public.export_jobs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists export_jobs_project_idx on public.export_jobs (project_id, created_at desc);
