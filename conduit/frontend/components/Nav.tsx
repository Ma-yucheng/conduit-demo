"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { clearToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function Nav() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const logout = () => {
    clearToken();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link href="/" className="brand">
          Conduit
        </Link>
        <div className="nav-links">
          <Link href="/">首页</Link>
          {loading ? null : user ? (
            <>
              <Link href="/editor">写文章</Link>
              <Link href="/settings">设置</Link>
              <Link href={`/profile/${user.username}`}>{user.username}</Link>
              <button onClick={logout}>退出</button>
            </>
          ) : (
            <>
              <Link href="/login">登录</Link>
              <Link href="/register">注册</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
