import React from "react";
import { Lightbulb, TriangleAlert, CircleCheck, CircleX, Info } from "lucide-react";

const STYLES: Record<string, { Icon: typeof Info; cls: string; icon: string }> = {
  tip: { Icon: Lightbulb, cls: "border-brand-500/30 bg-brand-500/5", icon: "text-brand-500" },
  warning: { Icon: TriangleAlert, cls: "border-amber-500/30 bg-amber-500/5", icon: "text-amber-500" },
  success: { Icon: CircleCheck, cls: "border-success/30 bg-success/5", icon: "text-success" },
  danger: { Icon: CircleX, cls: "border-danger/30 bg-danger/5", icon: "text-danger" },
  note: { Icon: Info, cls: "border-[var(--border-strong)] bg-[var(--surface-2)]", icon: "text-[var(--text-dim)]" },
};

export default function Callout({
  className,
  children,
  ...rest
}: { className?: string; children?: React.ReactNode } & Record<string, unknown>) {
  const classes = String(className ?? "");
  if (!classes.includes("callout")) {
    return <blockquote className={className} {...rest}>{children}</blockquote>;
  }
  const type = (["tip", "warning", "success", "danger", "note"].find((t) => classes.includes(`callout-${t}`)) ?? "note") as keyof typeof STYLES;
  const { Icon, cls, icon } = STYLES[type];
  return (
    <div className={`not-prose my-4 flex gap-3 rounded-xl border px-4 py-3 ${cls}`}>
      <Icon size={18} className={`shrink-0 mt-0.5 ${icon}`} />
      <div className="callout-body min-w-0 text-sm leading-relaxed [&>p]:my-1 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}
