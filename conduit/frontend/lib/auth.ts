"use client";

import { useEffect, useState } from "react";

import { api, clearToken, getToken } from "./api";
import type { User } from "./types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!getToken()) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const data = await api<{ user: User }>("/user");
        if (!cancelled) setUser(data.user);
      } catch {
        clearToken();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    window.addEventListener("auth-change", load);
    return () => {
      cancelled = true;
      window.removeEventListener("auth-change", load);
    };
  }, []);

  return { user, loading, logout: clearToken };
}
