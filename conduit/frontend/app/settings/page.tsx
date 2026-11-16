"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api, clearToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user) {
      setBio(user.bio ?? "");
      setImage(user.image ?? "");
    }
  }, [user, loading, router]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api<{ user: User }>("/user", {
        method: "PUT",
        body: {
          bio,
          image: image || null,
          ...(password ? { password } : {}),
        },
      });
      setPassword("");
      setMessage("已保存");
      window.dispatchEvent(new Event("auth-change"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    clearToken();
    router.push("/");
  };

  if (loading) return <p className="empty">加载中…</p>;
  if (!user) return null;

  return (
    <div className="auth-page">
      <h1>设置</h1>
      <p className="sub">
        当前账号 <strong>{user.username}</strong>（{user.email}）
      </p>

      <form onSubmit={save}>
        <div className="field">
          <label>个人简介</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={{ minHeight: 100 }}
            placeholder="介绍一下自己"
          />
        </div>
        <div className="field">
          <label>头像地址</label>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="field">
          <label>新密码（留空则不修改）</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
          />
        </div>

        {error && <p className="error">{error}</p>}
        {message && <p className="hint">{message}</p>}

        <div className="btn-row" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn btn-danger" onClick={logout}>
            退出登录
          </button>
          <button className="btn" disabled={busy}>
            {busy ? "保存中…" : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
