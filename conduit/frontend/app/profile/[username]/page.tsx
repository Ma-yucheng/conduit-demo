"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import ArticlePreview from "@/components/ArticlePreview";
import { api } from "@/lib/api";
import { initialOf } from "@/lib/format";
import type { Article, Profile } from "@/lib/types";

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ profile }, list] = await Promise.all([
        api<{ profile: Profile }>(`/profiles/${username}`),
        api<{ articles: Article[] }>(
          `/articles?author=${encodeURIComponent(username)}&limit=20`,
        ),
      ]);
      setProfile(profile);
      setArticles(list.articles);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFollow = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const data = await api<{ profile: Profile }>(
        `/profiles/${profile.username}/follow`,
        { method: profile.following ? "DELETE" : "POST" },
      );
      setProfile(data.profile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="error container" style={{ padding: 40 }}>{error}</p>;
  if (!profile) return <p className="empty">加载中…</p>;

  return (
    <>
      <header className="banner" style={{ padding: "36px 0" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <span
            className="avatar"
            style={{
              width: 72,
              height: 72,
              fontSize: 26,
              margin: "0 auto 12px",
              background: "rgba(255,255,255,.25)",
              color: "#fff",
            }}
          >
            {initialOf(profile.username)}
          </span>
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>{profile.username}</h1>
          {profile.bio && <p>{profile.bio}</p>}
          <button
            className="btn btn-sm"
            style={{ marginTop: 14, background: "#fff", color: "var(--green)" }}
            onClick={toggleFollow}
            disabled={busy}
          >
            {profile.following ? "已关注" : "关注"}
          </button>
        </div>
      </header>

      <div className="container" style={{ paddingBottom: 60 }}>
        <h3 style={{ fontSize: 15, color: "var(--muted)" }}>TA 的文章</h3>
        {articles.length === 0 && <p className="empty">还没有发布文章。</p>}
        {articles.map((a) => (
          <ArticlePreview
            key={a.slug}
            article={a}
            onChange={(next) =>
              setArticles((prev) => prev.map((x) => (x.slug === next.slug ? next : x)))
            }
          />
        ))}
      </div>
    </>
  );
}
