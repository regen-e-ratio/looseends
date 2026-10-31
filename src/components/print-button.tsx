"use client";

import { Button } from "./ui";

export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()} className="no-print">
      🖨️ Print / save as PDF
    </Button>
  );
}
