"use client";

import { Download, Printer } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

export function ReportActions({ html, filename }: { html: string; filename: string }) {
  const printable = useRef<HTMLIFrameElement>(null);

  function download() {
    // The BOM keeps UTF-8 characters like ₹ intact when the file is opened from disk.
    const blob = new Blob(["﻿", html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={download}>
        <Download aria-hidden />
        Download HTML
      </Button>
      <Button variant="outline" onClick={() => printable.current?.contentWindow?.print()}>
        <Printer aria-hidden />
        Print
      </Button>
      {/* window.print() would clip the on-screen frame: its height is fitted to screen width,
          not paper. This one paginates on its own. allow-modals is what print() needs. */}
      <iframe
        ref={printable}
        srcDoc={html}
        title="Printable report"
        aria-hidden
        tabIndex={-1}
        sandbox="allow-same-origin allow-modals"
        className="fixed size-0"
      />
    </div>
  );
}
