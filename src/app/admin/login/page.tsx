import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { authConfigured, isAdmin } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "로그인 · mylink", robots: { index: false } };

async function Gate() {
  await connection();
  if (await isAdmin()) redirect("/admin");
  if (!authConfigured()) {
    return (
      <div className="space-y-3 text-sm text-neutral-600">
        <p className="font-semibold text-neutral-900">관리자 비밀번호가 설정되지 않았어요.</p>
        <p>
          프로젝트 루트의 <code className="rounded bg-neutral-100 px-1">.env.local</code>에 아래 두 값을 넣고 서버를 다시 시작해 주세요.
        </p>
        <pre className="rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100">{`ADMIN_PASSWORD=긴-비밀번호\nSESSION_SECRET=32자-이상-임의-문자열`}</pre>
      </div>
    );
  }
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-5 text-lg font-bold">mylink 관리자</h1>
        <Suspense>
          <Gate />
        </Suspense>
      </div>
    </main>
  );
}
