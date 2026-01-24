import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { notFound } from "next/navigation";
import { SharePlayer } from "@/components/share-player";
import outputs from "../../../amplify_outputs.json";
// @ts-ignore
import type { Schema } from "../../../amplify/data/resource";

Amplify.configure(outputs);

const client = generateClient<Schema>({
  authMode: "apiKey",
});

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  try {
    const { data: videos } = await client.models.PublishedVideo.list({
      filter: { slug: { eq: slug } },
      authMode: "apiKey",
    });

    const video = videos[0];

    if (!video) {
      return notFound();
    }

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
