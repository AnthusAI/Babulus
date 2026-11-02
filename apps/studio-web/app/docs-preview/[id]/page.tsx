import { DocsPreviewPlayer } from '@/components/docs/docs-preview-player';

export default function DocsPreviewPage({ params }: { params: { id: string } }) {
  return (
    <div className="w-full bg-background">
      <div className="mx-auto w-full max-w-6xl">
        <DocsPreviewPlayer id={params.id} />
      </div>
    </div>
  );
}
