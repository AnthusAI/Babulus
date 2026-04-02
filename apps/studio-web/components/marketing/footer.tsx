import AnthusFooter from "anthus-footer";

export function Footer() {
  const theme = {
    background: "hsl(var(--background))",
    groupedBackground: "hsl(var(--muted))",
    panelBackground: "hsl(var(--card))",
    foreground: "hsl(var(--foreground))",
    mutedForeground: "hsl(var(--muted-foreground))",
    link: "hsl(var(--foreground))",
    fontFamilyBody: "var(--font-body)",
    fontFamilyHeading: "var(--font-heading), var(--font-body)",
    maxWidth: "1120px",
  };

  return (
    <AnthusFooter
      siteId="babulus"
      mode="auto"
      subtitle="Part of the Anthus Platform"
      description="Babulus is an AI-agent-driven marketing automation system for turning VideoML workflows into repeatable video production pipelines."
      theme={theme}
      additionalColumns={[
        {
          title: "Product",
          links: [
            { label: "Join waitlist", href: "/waitlist", external: false },
            { label: "Docs", href: "/docs", external: false },
            { label: "GitHub", href: "https://github.com/AnthusAI/Babulus" },
          ],
        },
      ]}
    />
  );
}
