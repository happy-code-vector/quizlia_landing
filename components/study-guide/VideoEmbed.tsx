interface VideoEmbedProps {
  youtubeId: string;
  title: string;
}

export function VideoEmbed({ youtubeId, title }: VideoEmbedProps) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📺</span>
        <h2 className="text-xl font-semibold text-white font-rethink-sans">Watch the Lecture</h2>
      </div>

      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/50 ring-1 ring-white/10">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  );
}
