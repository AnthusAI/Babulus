"use client";

import { ReactNode } from "react";
import { AlertCircle, AlertTriangle, Info, Lightbulb } from "lucide-react";

export type CalloutType = "info" | "warning" | "tip" | "danger";

type CalloutProps = {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
};

const calloutConfig: Record<
  CalloutType,
  {
    icon: typeof Info;
    borderColor: string;
    bgColor: string;
    iconColor: string;
    titleColor: string;
  }
> = {
  info: {
    icon: Info,
    borderColor: "border-blue-500/50",
    bgColor: "bg-blue-500/10",
    iconColor: "text-blue-500",
    titleColor: "text-blue-600 dark:text-blue-400",
  },
  warning: {
    icon: AlertTriangle,
    borderColor: "border-yellow-500/50",
    bgColor: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
    titleColor: "text-yellow-600 dark:text-yellow-400",
  },
  tip: {
    icon: Lightbulb,
    borderColor: "border-green-500/50",
    bgColor: "bg-green-500/10",
    iconColor: "text-green-500",
    titleColor: "text-green-600 dark:text-green-400",
  },
  danger: {
    icon: AlertCircle,
    borderColor: "border-red-500/50",
    bgColor: "bg-red-500/10",
    iconColor: "text-red-500",
    titleColor: "text-red-600 dark:text-red-400",
  },
};

export function Callout({ type = "info", title, children }: CalloutProps) {
  const config = calloutConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`my-6 rounded-lg border-l-4 ${config.borderColor} ${config.bgColor} p-4`}
      role="note"
    >
      <div className="flex gap-3">
        <div className={`flex-shrink-0 ${config.iconColor} mt-0.5`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <div className={`font-semibold mb-2 ${config.titleColor}`}>
              {title}
            </div>
          )}
          <div className="text-sm text-foreground/80 leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
