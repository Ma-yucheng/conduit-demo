"use client";

import { useCallback, useEffect, useState } from "react";

import ArticlePreview from "@/components/ArticlePreview";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Article } from "@/lib/types";

const PAGE_SIZE = 10;

type ListResponse = { articles: Article[]; articlesCount: number };

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"all" | "feed">("all");
  const [tag, setTag] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = page * PAGE_SIZE;
      let data: ListResponse;

      if (tab === "feed") {
        data = await api<ListResponse>(
          `/articles/feed?limit=${PAGE_SIZE}&offset=${offset}`,
        );
      } else {
        const qs = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (tag) qs.set("tag", tag);
        data = await api<ListResponse>(`/articles?${qs.toString()}`);
      }

      setArticles(data.articles);
      setTotal(data.articlesCount);
    } catch (e) {
      setError((e as Error).message);
      setArticles([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tab, tag, page]);

  useEffect(() => {
    if (tab === "feed" && !user && !authLoading) {
      setTab("all");
      return;
    }
    load();
  }, [load, tab, user, authLoading]);

  useEffect(() => {
    api<{ tags: string[] }>("/tags", { auth: false })
      .then((d) => setTags(d.tags))
      .catch(() => setTags([]));
  }, []);

  const updateArticle = (next: Article) => {
    setArticles((prev) => prev.map((a) => (a.slug === next.slug ? next : a)));
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <header className="banner">
        <h1>Conduit</h1>
        <p>一个 RealWorld 规范的全栈示例 · FastAPI + Next.js</p>
      </header>

      <div className="container layout">
        <main>
          <div className="tabs">
            <button
              className={tab === "all" ? "active" : ""}
              onClick={() => {
                setTab("all");
                setPage(0);
              }}
            >
              全部文章
            </button>
            {user && (
              <button
                className={tab === "feed" ? "active" : ""}
                onClick={() => {
                  setTab("feed");
                  setPage(0);
                }}
              >
                我的关注
              </button>
            )}
          </div>

          {tag && (
            <p className="hint" style={{ marginBottom: 12 }}>
              正在筛选标签 <strong>#{tag}</strong> ·{" "}
              <button
                className="fav-btn"
                onClick={() => {
                  setTag(null);
                  setPage(0);
                }}
              >
                清除
              </button>
            </p>
          )}

          {loading && <p className="empty">加载中…</p>}
          {error && !loading && <p className="error">{error}</p>}
          {!loading && !error && articles.length === 0 && (
            <p className="empty">
              {tab === "feed" ? "你还没有关注任何人，去关注几位作者吧。" : "还没有文章。"}
            </p>
          )}

          {articles.map((a) => (
            <ArticlePreview key={a.slug} article={a} onChange={updateArticle} />
          ))}

          {pages > 1 && (
            <div className="btn-row" style={{ justifyContent: "center" }}>
              <button
                className="btn btn-outline btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                上一页
              </button>
              <span className="hint" style={{ alignSelf: "center" }}>
                {page + 1} / {pages}
              </span>
              <button
                className="btn btn-outline btn-sm"
                disabled={page + 1 >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </main>

        <aside className="sidebar">
          <h3>热门标签</h3>
          <div className="tag-list">
            {tags.length === 0 && <span className="hint">暂无标签</span>}
            {tags.map((t) => (
              <button
                key={t}
                className="tag"
                onClick={() => {
                  setTag(t);
                  setTab("all");
                  setPage(0);
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
