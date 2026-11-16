"use client";

import Link from "next/link";
import { useState } from "react";

import { api } from "@/lib/api";
import { formatDate, initialOf } from "@/lib/format";
import type { Article } from "@/lib/types";

export default function ArticlePreview({
  article,
  onChange,
}: {
  article: Article;
  onChange: (next: Article) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFavorite = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ article: Article }>(
        `/articles/${article.slug}/favorite`,
        { method: article.favorited ? "DELETE" : "POST" },
      );
      onChange(data.article);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="article-preview">
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
        <button
          className={`fav-btn${article.favorited ? " active" : ""}`}
          onClick={toggleFavorite}
          disabled={busy}
          title={error ?? "点赞"}
        >
          ♥ {article.favoritesCount}
        </button>
      </div>

      <h2>
        <Link href={`/article/${article.slug}`}>{article.title}</Link>
      </h2>
      <p className="desc">{article.description}</p>

      <div className="article-meta">
        <Link className="tag-list" href={`/article/${article.slug}`}>
          <span className="hint">阅读全文 →</span>
        </Link>
        <div className="tag-list">
          {article.tagList.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
