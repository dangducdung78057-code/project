// 3D 预览调整功能 · 试用期锁定
// 规则:每个账户自注册时刻(supabase user.created_at,服务端时间,清缓存无法绕过)
// 起 3 天内可自由调整;到期后 3D 预览进入"只读模式"——场景可看、动画可播,
// 但拖拽站位/换队形/换色/换灯光等一切调整操作被拦截。
// 管理员可用口令临时解锁(仅当前浏览器标签页会话内有效)。
import type { User } from "@supabase/supabase-js";

/** 试用时长:3 天 */
export const TRIAL_DAYS = 3;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

/** 管理员解锁口令(发布前可改;解锁状态只存 sessionStorage,关标签页即失效) */
const UNLOCK_PASSPHRASE = "stageos-admin-2026";
const UNLOCK_KEY = "stageos.trial.unlocked.v1";

export type TrialStatus = {
  /** 是否已锁定(试用期结束且未口令解锁) */
  locked: boolean;
  /** 试用剩余毫秒(<=0 表示已到期) */
  remainingMs: number;
  /** 试用截止时刻 */
  expiresAt: Date | null;
  /** 是否处于口令解锁状态 */
  adminUnlocked: boolean;
};

/** 是否已通过口令解锁(仅本会话) */
export function isAdminUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

/** 尝试口令解锁;成功返回 true */
export function tryAdminUnlock(passphrase: string): boolean {
  if (passphrase.trim() !== UNLOCK_PASSPHRASE) return false;
  try {
    sessionStorage.setItem(UNLOCK_KEY, "1");
  } catch {
    // sessionStorage 不可用时仍返回成功,由调用方内存态兜底
  }
  return true;
}

/** 依据账户注册时间计算试用状态;未登录视为锁定 */
export function getTrialStatus(user: User | null): TrialStatus {
  const adminUnlocked = isAdminUnlocked();
  if (!user?.created_at) {
    return { locked: !adminUnlocked, remainingMs: 0, expiresAt: null, adminUnlocked };
  }
  const start = new Date(user.created_at).getTime();
  const expiresAt = new Date(start + TRIAL_MS);
  const remainingMs = expiresAt.getTime() - Date.now();
  return {
    locked: remainingMs <= 0 && !adminUnlocked,
    remainingMs,
    expiresAt,
    adminUnlocked,
  };
}

/** 剩余时间的人话表述,如 "2 天 5 小时" */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return "已结束";
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  if (days > 0) return `${days} 天 ${restHours} 小时`;
  if (hours > 0) return `${hours} 小时`;
  return `${Math.max(1, Math.floor(ms / 60_000))} 分钟`;
}
