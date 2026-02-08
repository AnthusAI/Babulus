import * as React from "react";

type HeroProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  pill?: string;
  links?: Array<{ label: string; href: string }>;
};

export const Hero: React.FC<HeroProps> = ({
  title,
  subtitle,
  eyebrow,
  pill,
  links,
}) => {
  return (
    <section className="page">
      <div className="container">
        {pill ? <span className="pill">{pill}</span> : null}
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1 className="hero-title">{title}</h1>
        <p className="hero-subtitle">{subtitle}</p>
        {links && links.length > 0 ? (
          <div className="hero-links" aria-label="Source links">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};
