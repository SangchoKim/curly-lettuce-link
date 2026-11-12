import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { stores } from "@/lib/store";
import { siteUrl } from "@/lib/site-url";
import { Editor } from "@/components/admin/Editor";

export const metadata: Metadata = { title: "편집 · mylink", robots: { index: false } };

async function AdminGate() {
  await connection();
  if (!(await isAdmin())) redirect("/admin/login");
  const site = await stores.site.get();
  const vercelFileWarning = Boolean(process.env.VERCEL) && (process.env.STORAGE_DRIVER || "file") === "file";
  return <Editor initialSite={site} siteUrl={siteUrl()} vercelFileWarning={vercelFileWarning} />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-neutral-100" />}>
      <AdminGate />
    </Suspense>
  );
}
