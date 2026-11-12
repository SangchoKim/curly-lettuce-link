"use client";

import { useState } from "react";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      window.location.href = "/admin";
      return;
    }
    const body = await res.json().catch(() => null);
    setError(body?.error?.message ?? "로그인하지 못했어요");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm font-medium text-neutral-700" htmlFor="pw">
        비밀번호
      </label>
      <input
        id="pw"
        type="password"
        autoFocus
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={busy || !password}
        className="h-11 w-full rounded-xl bg-neutral-900 text-sm font-semibold text-white disabled:opacity-40"
      >
        {busy ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
