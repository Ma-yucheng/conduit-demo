"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, initialOf } from "@/lib/format";
import type { Article, Comment } from "@/lib/types";

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ article }, { comments }] = await Promise.all([
        api<{ article: Article }>(`/articles/${slug}`, { auth: false }),
        api<{ comments: Comment[] }>(`/articles/${slug}/comments`, { auth: false }),
      ]);
      setArticle(article);
      setComments(comments);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFavorite = async () => {
    if (!article) return;
    try {
      const data = await api<{ article: Article }>(
        `/articles/${article.slug}/favorite`,
        { method: article.favorited ? "DELETE" : "POST" },
      );
      setArticle(data.article);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggleFollow = async () => {
    if (!article) return;
    try {
      const data = await api<{ profile: { following: boolean } }>(
        `/profiles/${article.author.username}/follow`,
        { method: article.author.following ? "DELETE" : "POST" },
      );
      setArticle({
        ...article,
        author: { ...article.author, following: data.profile.following },
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const data = await api<{ comment: Comment }>(
        `/articles/${slug}/comments`,
        { method: "POST", body: { body: draft.trim() } },
      );
      setComments((prev) => [data.comment, ...prev]);
      setDraft("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeComment = async (id: string) => {
    try {
      await api(`/articles/${slug}/comments/${id}`, { method: "DELETE" });
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const deleteArticle = async () => {
    if (!article || !window.confirm("确定删除这篇文章？")) return;
    try {
      await api(`/articles/${article.slug}`, { method: "DELETE" });
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (error) return <p className="error container" style={{ padding: 40 }}>{error}</p>;
  if (!article) return <p className="empty">加载中…</p>;

  const isMine = user?.username === article.author.username;

  return (
    <>
      <header className="article-header">
        <div className="container">
          <h1>{article.title}</h1>
          <div className="article-meta">
            <div className="article-author">
              <span className="avatar">{initialOf(article.author.username)}</span>
              <div>
                <Link href={`/profile/${article.author.username}`}>
                  {article.author.username}
                </Link>
                <div>{formatDate(article.createdAt)}</div>
              </div>
            </div>

            <div className="btn-row" style={{ margin: 0 }}>
              {isMine ? (
                <>
                  <Link
                    className="btn btn-outline btn-sm"
                    href={`/editor?slug=${article.slug}`}
                  >
                    编辑
                  </Link>
                  <button className="btn btn-sm btn-danger" onClick={deleteArticle}>
                    删除
                  </button>
                </>
              ) : (
                user && (
                  <button
                    className={`btn btn-sm ${article.author.following ? "" : "btn-outline"}`}
                    onClick={toggleFollow}
                  >
                    {article.author.following ? "已关注" : "关注作者"}
                  </button>
                )
              )}
              <button
                className={`fav-btn${article.favorited ? " active" : ""}`}
                onClick={toggleFavorite}
              >
                ♥ {article.favoritesCount}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        <article className="article-body">{article.body}</article>

        <div className="tag-list" style={{ marginTop: 20 }}>
          {article.tagList.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      </div>

      <section className="comments">
        {user ? (
          <form onSubmit={addComment} style={{ marginBottom: 20 }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="写一条评论…"
              style={{ minHeight: 90 }}
            />
            <div className="btn-row">
              <button className="btn btn-sm" disabled={busy}>
                发表评论
              </button>
            </div>
          </form>
        ) : (
          <p className="hint">
            <Link href="/login">登录</Link> 后可以评论。
          </p>
        )}

        {comments.length === 0 && <p className="empty">还没有评论。</p>}

        {comments.map((c) => (
          <div key={c.id} className="comment-card">
            <div className="article-meta">
              <div className="article-author">
                <span className="avatar">{initialOf(c.author.username)}</span>
                <div>
                  <Link href={`/profile/${c.author.username}`}>
                    {c.author.username}
                  </Link>
                  <div>{formatDate(c.createdAt)}</div>
                </div>
              </div>
              {user?.username === c.author.username && (
                <button
                  className="nav-links"
                  style={{ color: "var(--danger)", background: "none", border: 0 }}
                  onClick={() => removeComment(c.id)}
                >
                  删除
                </button>
              )}
            </div>
            <p>{c.body}</p>
          </div>
        ))}
      </section>
    </>
  );
}
