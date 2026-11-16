"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, setToken } from "@/lib/api";
import type { User } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ user: User & { token: string } }>("/users/login", {
        method: "POST",
        body: { email, password },
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
      <h1>登录</h1>
      <p className="sub">
        还没有账号？<Link href="/register">立即注册</Link>
      </p>
      <form onSubmit={submit}>
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
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn" style={{ width: "100%" }} disabled={busy}>
          {busy ? "登录中…" : "登录"}
        </button>
      </form>
      <p className="hint">演示账号：alice@example.com / password123</p>
    </div>
  );
}
