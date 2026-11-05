"use client";

import { Button } from "@/components/ui/button";

export function ReportActions({ html, filename }: { html: string; filename: string }) {
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
    <div className="mb-4 flex flex-wrap gap-2 print:hidden">
      <Button onClick={download} className="font-bold">
        Download HTML
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        Print
      </Button>
    </div>
  );
}
