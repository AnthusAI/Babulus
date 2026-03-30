import AnthusFooter from "anthus-footer";

export function Footer() {
  return (
    <AnthusFooter
      siteId="babulus"
      subtitle="Part of the Anthus Platform"
      description="Babulus is an AI-agent-driven marketing automation system for turning VideoML workflows into repeatable video production pipelines."
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
