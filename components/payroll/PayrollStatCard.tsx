"use client";

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

type Tone = "blue" | "green" | "amber" | "rose" | "indigo" | "slate";
type DeltaDirection = "up" | "down" | "neutral";

const toneStyles: Record<Tone, { bar: string; badge: string; panel: string; text: string }> = {
  blue: {
    bar: "from-blue-400 to-blue-600",
    badge: "bg-blue-50 text-blue-600",
    panel: "bg-blue-50 border-blue-100",
    text: "text-blue-700",
  },
  green: {
    bar: "from-emerald-400 to-green-600",
    badge: "bg-emerald-50 text-emerald-600",
    panel: "bg-emerald-50 border-emerald-100",
    text: "text-emerald-700",
  },
  amber: {
    bar: "from-amber-400 to-amber-600",
    badge: "bg-amber-50 text-amber-600",
    panel: "bg-amber-50 border-amber-100",
    text: "text-amber-700",
  },
  rose: {
    bar: "from-rose-400 to-rose-600",
    badge: "bg-rose-50 text-rose-600",
    panel: "bg-rose-50 border-rose-100",
    text: "text-rose-700",
  },
  indigo: {
    bar: "from-indigo-400 to-indigo-600",
    badge: "bg-indigo-50 text-indigo-600",
    panel: "bg-indigo-50 border-indigo-100",
    text: "text-indigo-700",
  },
  slate: {
    bar: "from-slate-400 to-slate-600",
    badge: "bg-slate-100 text-slate-600",
    panel: "bg-slate-50 border-slate-200",
    text: "text-slate-700",
  },
};

function DeltaIcon({ direction }: { direction: DeltaDirection }) {
  if (direction === "up") return <ArrowUpRight className="h-3.5 w-3.5" />;
  if (direction === "down") return <ArrowDownRight className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

type Props = {
  label: string;
  value: string;
  helper?: string;
  icon: ReactNode;
  tone?: Tone;
  deltaLabel?: string;
  deltaDirection?: DeltaDirection;
  emphasis?: "default" | "inverted";
};

export default function PayrollStatCard({
  label,
  value,
  helper,
  icon,
  tone = "blue",
  deltaLabel,
  deltaDirection = "neutral",
  emphasis = "default",
}: Props) {
  const styles = toneStyles[tone];
  const isInverted = emphasis === "inverted";

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        isInverted ? "border-slate-800 bg-slate-900 text-white" : "border-gray-100 bg-white",
      ].join(" ")}
    >
      <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${styles.bar}`} />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${isInverted ? "text-slate-400" : "text-gray-500"}`}>{label}</p>
          <p className={`mt-2 text-3xl font-extrabold tracking-tight ${isInverted ? "text-white" : "text-gray-900"}`}>{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isInverted ? "bg-slate-800 text-slate-200" : styles.badge}`}>
          {icon}
        </div>
      </div>

      {(deltaLabel || helper) && (
        <div className="space-y-2">
          {deltaLabel ? (
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${isInverted ? "border-slate-700 bg-slate-800 text-slate-200" : `${styles.panel} ${styles.text}`}`}>
              <DeltaIcon direction={deltaDirection} />
              {deltaLabel}
            </div>
          ) : null}
          {helper ? <p className={`text-xs font-medium ${isInverted ? "text-slate-400" : "text-gray-500"}`}>{helper}</p> : null}
        </div>
      )}
    </div>
  );
}
