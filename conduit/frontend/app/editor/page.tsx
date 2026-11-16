"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Article } from "@/lib/types";

function EditorForm() {
  const router = useRouter();
  const params = useSearchParams();
  const slug = params.get("slug");
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!slug) return;
    api<{ article: Article }>(`/articles/${slug}`, { auth: false })
      .then(({ article }) => {
        if (!user || article.author.username !== user.username) {
          router.replace(`/article/${slug}`);
          return;
        }
        setTitle(article.title);
        setDescription(article.description);
        setBody(article.body);
        setTagInput(article.tagList.join(", "));
      })
      .catch((e) => setError((e as Error).message));
  }, [slug, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      title,
      description,
      body,
      tagList: tagInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    try {
      const data = slug
        ? await api<{ article: Article }>(`/articles/${slug}`, {
            method: "PUT",
            body: payload,
          })
        : await api<{ article: Article }>("/articles", {
            method: "POST",
            body: payload,
          });
      router.push(`/article/${data.article.slug}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page" style={{ maxWidth: 720 }}>
      <h1>{slug ? "编辑文章" : "写文章"}</h1>
      <p className="sub">标签用英文逗号分隔，例如 realworld, fastapi</p>
      <form onSubmit={submit}>
        <div className="field">
          <label>标题</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="field">
          <label>一句话摘要</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label>正文</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} required />
        </div>
        <div className="field">
          <label>标签</label>
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
        </div>
        {error && <p className="error">{error}</p>}
        <div className="btn-row">
          <button className="btn" disabled={busy} type="submit">
            {busy ? "保存中…" : "发布文章"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<p className="empty">加载中…</p>}>
      <EditorForm />
    </Suspense>
  );
}
