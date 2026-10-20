"use client";
export default function PrintButton() {
  return (
    <button className="button no-print" onClick={() => window.print()}>
      Print / save PDF
    </button>
  );
}
