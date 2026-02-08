import * as React from "react";

type HeroProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  pill?: string;
};

export const Hero: React.FC<HeroProps> = ({ title, subtitle, eyebrow, pill }) => {
  return (
    <section className="page">
      <div className="container">
        {pill ? <span className="pill">{pill}</span> : null}
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1 className="hero-title">{title}</h1>
        <p className="hero-subtitle">{subtitle}</p>
      </div>
    </section>
  );
};
