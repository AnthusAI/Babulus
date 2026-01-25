"use client";

import {
  Inter,
  Manrope,
  Space_Grotesk,
  Oswald,
  Open_Sans,
  Bebas_Neue,
  Montserrat,
  Archivo_Black,
  Archivo,
  Syne,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  Work_Sans,
  Raleway,
  Lato,
  DM_Sans,
  Sora,
} from "next/font/google";
import { cn } from "@/lib/utils";

// 1. The Standard
const inter = Inter({ subsets: ["latin"] });

// 2. Modern Geometric
const manrope = Manrope({ subsets: ["latin"] });

// 3. Tech/AI
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

// 4. YouTube Classic
const oswald = Oswald({ subsets: ["latin"] });
const openSans = Open_Sans({ subsets: ["latin"] });

// 5. Impactful
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"] });
const montserrat = Montserrat({ subsets: ["latin"] });

// 6. Digital Screen
const archivoBlack = Archivo_Black({ weight: "400", subsets: ["latin"] });
const archivo = Archivo({ subsets: ["latin"] });

// 7. Artsy/Unique
const syne = Syne({ subsets: ["latin"] });

// 8. Code/Technical
const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});
const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
});

// 9. Friendly Professional
const workSans = Work_Sans({ subsets: ["latin"] });

// 10. Elegant
const raleway = Raleway({ subsets: ["latin"] });
const lato = Lato({ weight: ["400", "700"], subsets: ["latin"] });

// 11. Clean
const dmSans = DM_Sans({ subsets: ["latin"] });

// 12. Modern Digital
const sora = Sora({ subsets: ["latin"] });

const pairings = [
  {
    id: "standard",
    name: "The Standard",
    fonts: { head: inter, body: inter },
    description: "Clean, reliable, and invisible. The default choice for modern SaaS.",
  },
  {
    id: "geometric",
    name: "Modern Geometric",
    fonts: { head: manrope, body: manrope },
    description: "Friendly and approachable but precise. Great for 'video production' vibe.",
  },
  {
    id: "tech",
    name: "Tech / AI",
    fonts: { head: spaceGrotesk, body: spaceGrotesk },
    description: "Futuristic and distinctive. Screams 'AI' and 'Code'.",
  },
  {
    id: "youtube",
    name: "YouTube Classic",
    fonts: { head: oswald, body: openSans },
    description: "Oswald is the quintessential YouTube thumbnail font. High impact.",
  },
  {
    id: "impactful",
    name: "Impactful Studio",
    fonts: { head: bebasNeue, body: montserrat },
    description: "Bebas is loud and cinematic. Montserrat balances it with geometric clarity.",
  },
  {
    id: "screen",
    name: "Digital Screen",
    fonts: { head: archivoBlack, body: archivo },
    description: "Designed for screens. Archivo Black has huge weight for headlines.",
  },
  {
    id: "artsy",
    name: "Artsy / Unique",
    fonts: { head: syne, body: inter },
    description: "Syne has a unique 'art school' vibe. Good for a creative tool.",
  },
  {
    id: "code",
    name: "Code / Technical",
    fonts: { head: ibmPlexSans, body: ibmPlexMono },
    description: "IBM Plex is designed for man-machine interfaces. Very 'developer tool'.",
  },
  {
    id: "friendly",
    name: "Friendly Pro",
    fonts: { head: workSans, body: workSans },
    description: "Work Sans is optimized for on-screen reading. Friendly but professional.",
  },
  {
    id: "elegant",
    name: "Elegant Studio",
    fonts: { head: raleway, body: lato },
    description: "Raleway adds a touch of class and sophistication.",
  },
  {
    id: "clean",
    name: "Ultra Clean",
    fonts: { head: dmSans, body: dmSans },
    description: "DM Sans is low-contrast and highly legible at small sizes.",
  },
  {
    id: "digital",
    name: "Modern Digital",
    fonts: { head: sora, body: sora },
    description: "Sora is designed for digital interfaces. Sharp and distinct.",
  },
];

export default function FontsPage() {
  return (
    <div className="container py-24 space-y-24">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-4xl font-bold">Typography Playground</h1>
        <p className="text-muted-foreground text-lg">
          Evaluating font pairings for the Babulus marketing site.
          <br />
          Looking for a balance of "Studio-Grade Professional" and "AI/Tech".
        </p>
      </div>

      <div className="grid gap-16">
        {pairings.map((pair) => (
          <div key={pair.id} className="space-y-8 p-8 rounded-xl bg-card">
            <div className="flex items-baseline justify-between border-b pb-4">
              <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                {pair.id}
              </h2>
              <div className="text-xs text-muted-foreground">
                Head: {pair.fonts.head.style.fontFamily} / Body:{" "}
                {pair.fonts.body.style.fontFamily}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className={pair.fonts.head.className}>
                  <p className="text-sm font-bold uppercase tracking-widest text-primary/60 mb-2">
                    Production Pipeline
                  </p>
                  <h3 className="text-4xl md:text-5xl font-extrabold leading-tight text-foreground">
                    {pair.name}
                  </h3>
                </div>
                <div className={cn("space-y-4 text-lg", pair.fonts.body.className)}>
                  <p className="font-medium text-foreground/90">
                    {pair.description}
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Babulus automates the video production pipeline. By treating video
                    content as code, we enable AI agents to collaborate with human
                    creators in real-time. This pairing should communicate reliability
                    and precision.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0" />
                  <div className="text-muted-foreground/50 font-medium">
                    16:9 VIDEO PREVIEW
                  </div>
                  
                  <div className="absolute bottom-4 right-4 max-w-[240px] bg-background/90 backdrop-blur p-4 rounded">
                    <div className={pair.fonts.body.className}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Scene 1
                      </p>
                      <p className="text-sm italic text-foreground">
                        "The camera pans slowly across the studio floor, revealing the automated equipment."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
