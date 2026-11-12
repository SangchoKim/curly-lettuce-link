"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Modal, btn } from "../ui";

export function ShareModal({ open, onClose, url }: { open: boolean; onClose: () => void; url: string }) {
  const [png, setPng] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 1024, margin: 4 }).then(setPng);
    QRCode.toString(url, { type: "svg", margin: 4 }).then(setSvg);
  }, [open, url]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal open={open} onClose={onClose} title="내 페이지 공유">
      <div className="space-y-4">
        <div className="flex gap-2">
          <input readOnly value={url} className="h-10 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-neutral-50 px-3 text-sm" />
          <button className={btn.primary} onClick={copy}>
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
        {png && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={png} alt="내 페이지 QR 코드" className="mx-auto h-48 w-48 rounded-xl border border-neutral-200" />
        )}
        <div className="flex justify-center gap-2">
          {png && (
            <a className={btn.ghost + " inline-flex items-center"} href={png} download="mylink-qr.png">
              PNG 저장
            </a>
          )}
          {svg && (
            <a
              className={btn.ghost + " inline-flex items-center"}
              href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
              download="mylink-qr.svg"
            >
              SVG 저장
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
}
