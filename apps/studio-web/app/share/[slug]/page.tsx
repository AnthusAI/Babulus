import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { notFound, redirect } from "next/navigation";
import { SharePlayer } from "@/components/share-player";
import { PasswordPrompt } from "@/components/password-prompt";
import outputs from "../../../amplify_outputs.json";
// @ts-ignore
import type { Schema } from "../../../amplify/data/resource";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { Metadata } from "next";

Amplify.configure(outputs);

const client = generateClient<Schema>({
  authMode: "apiKey",
});

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = params;

  try {
    const { data: videos } = await client.models.PublishedVideo.list({
      filter: { slug: { eq: slug } },
      authMode: "apiKey",
    });

    const video = videos[0];

    if (!video) {
      return {
        title: "Video Not Found",
        description: "The requested video could not be found.",
      };
    }

    const title = `Video - ${slug}`;
    const description = "Watch this video shared on Babulus";
    const videoUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://studio.babulus.ai"}/share/${slug}`;
    const thumbnailUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://studio.babulus.ai"}/og-image.png`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: videoUrl,
        type: "video.other",
        videos: [
          {
            url: `${process.env.NEXT_PUBLIC_CDN_URL || "https://studio.babulus.ai"}/published/${slug}.mp4`,
            type: "video/mp4",
          },
        ],
        images: [
          {
            url: thumbnailUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "player",
        title,
        description,
        images: [thumbnailUrl],
        players: [
          {
            playerUrl: videoUrl,
            streamUrl: `${process.env.NEXT_PUBLIC_CDN_URL || "https://studio.babulus.ai"}/published/${slug}.mp4`,
            width: 1280,
            height: 720,
          },
        ],
      },
    };
  } catch (error) {
    console.error("Failed to generate metadata", error);
    return {
      title: "Babulus Video",
      description: "Watch video on Babulus",
    };
  }
}

export default async function SharePage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { password?: string };
}) {
  const { slug } = params;
  const { password } = searchParams;

  try {
    const { data: videos } = await client.models.PublishedVideo.list({
      filter: { slug: { eq: slug } },
      authMode: "apiKey",
    });

    const video = videos[0];

    if (!video) {
      return notFound();
    }

    // Handle access control based on policy
    if (video.accessPolicy === "password") {
      // Check if password is provided in URL (from form submission)
      if (!password) {
        return <PasswordPrompt slug={slug} />;
      }

      // Verify password
      if (!video.passwordHash) {
        console.error("Password policy set but no password hash found");
        return notFound();
      }

      const passwordMatches = await bcrypt.compare(password, video.passwordHash);
      if (!passwordMatches) {
        return <PasswordPrompt slug={slug} error="Incorrect password" />;
      }

      // Password is correct, continue to show video
    } else if (video.accessPolicy === "org_only") {
      // For org-only videos, we would need to check authentication
      // For now, show a message that the user needs to log in
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-bold">Organization Access Required</h1>
            <p className="text-muted-foreground">
              This video is restricted to members of the organization. Please log in to access it.
            </p>
            <a
              href="/login"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Log In
            </a>
          </div>
        </div>
      );
    }

    // Public or authorized access - show the video
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <SharePlayer video={video as any} />
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch published video", error);
    return notFound();
  }
}
