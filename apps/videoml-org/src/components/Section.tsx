import * as React from "react";

type SectionProps = {
  children: React.ReactNode;
  tone?: "base" | "alt";
};

export const Section: React.FC<SectionProps> = ({ children, tone = "base" }) => {
  const className = tone === "alt" ? "section alt" : "section";
  return (
    <section className="page">
      <div className="container">
        <div className={className}>{children}</div>
      </div>
    </section>
  );
};
