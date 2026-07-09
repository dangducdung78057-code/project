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
    supabase.auth.getSession().then(async ({ data }) => {
      // 开发预览专用自动登录:v0 预览沙盒每次重启域名会变,localStorage 按域隔离,
      // 旧会话必然丢失。配置 VITE_DEV_LOGIN_EMAIL/PASSWORD 后开发环境自动登录,
      // 生产构建(import.meta.env.DEV = false)完全不含此逻辑。
      if (!data.session && import.meta.env.DEV) {
        const email = import.meta.env.VITE_DEV_LOGIN_EMAIL as string | undefined;
        const password = import.meta.env.VITE_DEV_LOGIN_PASSWORD as string | undefined;
        if (email && password) {
          const { data: auto } = await supabase.auth.signInWithPassword({ email, password });
          if (auto.session) {
            setSession(auto.session);
            setUser(auto.session.user);
            if (!done) { done = true; setLoading(false); }
            return;
          }
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
