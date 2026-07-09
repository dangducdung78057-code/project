import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsEmailConfirm?: boolean }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let done = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!done) { done = true; setLoading(false); }
    });
    // 会话持久化:登录一次后保存在 localStorage,自动续期,
    // 直到用户主动点「退出登录」才失效。
    // 开发预览沙盒例外:v0 预览每次重启换域名,localStorage 按域隔离导致会话必丢,
    // 无会话时用测试账号静默登录(仅 DEV 构建含此逻辑,生产环境不受影响)
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session && import.meta.env.DEV) {
        // 依次尝试:1) 环境变量账号登录 2) 该账号不存在则自动注册
        // 3) 都不行(如账号已存在但密码不符)则用内置开发预览账号,保证预览必能进
        const email = import.meta.env.VITE_DEV_LOGIN_EMAIL as string | undefined;
        const password = import.meta.env.VITE_DEV_LOGIN_PASSWORD as string | undefined;
        const candidates: Array<{ email: string; password: string }> = [];
        if (email && password) candidates.push({ email, password });
        candidates.push({ email: "dev-preview-stageos@example.com", password: "DevPreview2026!x" });
        for (const cred of candidates) {
          const { data: auto } = await supabase.auth.signInWithPassword(cred);
          if (auto.session) return; // onAuthStateChange 会接管 session 更新
          const { data: reg } = await supabase.auth.signUp(cred);
          if (reg.session) return;
        }
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (!done) { done = true; setLoading(false); }
    }).catch(() => { if (!done) { done = true; setLoading(false); } });
    // Timeout guard: never hang on white screen
    const t = setTimeout(() => { if (!done) { done = true; setLoading(false); } }, 6000);
    return () => { clearTimeout(t); sub.subscription.unsubscribe(); };
  }, []);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  };
  const signUp: AuthCtx["signUp"] = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) return { error: error.message };
    // 项目开启邮箱确认时,注册成功但没有 session,需要用户去邮箱点确认链接
    return { needsEmailConfirm: !data.session };
  };
  const signOut = async () => { await supabase.auth.signOut(); };

  return <Ctx.Provider value={{ user, session, loading, signIn, signUp, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
