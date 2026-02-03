import { DocsPreviewPlayer } from '@/components/docs/docs-preview-player';

export default function DocsPreviewPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
      <div className="h-full w-full max-w-6xl">
        <DocsPreviewPlayer id={params.id} />
      </div>
    </div>
  );
}
