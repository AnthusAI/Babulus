import * as React from "react";

type CalloutProps = {
  children: React.ReactNode;
  tone?: "info" | "warn" | "success";
};

export const Callout: React.FC<CalloutProps> = ({ children, tone = "info" }) => {
  return <div className={`callout ${tone}`}>{children}</div>;
};
