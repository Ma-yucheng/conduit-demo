"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, setToken } from "@/lib/api";
import type { User } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ user: User & { token: string } }>("/users", {
        method: "POST",
        body: { username, email, password },
        auth: false,
      });
      setToken(data.user.token);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <h1>注册</h1>
      <p className="sub">
        已有账号？<Link href="/login">去登录</Link>
      </p>
      <form onSubmit={submit}>
        <div className="field">
          <label>用户名</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="至少 3 个字符"
            required
            minLength={3}
          />
        </div>
        <div className="field">
          <label>邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="field">
          <label>密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
            required
            minLength={6}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn" style={{ width: "100%" }} disabled={busy}>
          {busy ? "注册中…" : "注册"}
        </button>
      </form>
    </div>
  );
}
