import { Icons } from "@/components/ui/icons"

interface MovieAudioSubsProps {
  audioTracks: string[]
  subtitles: string[]
}

export function MovieAudioSubs({ audioTracks, subtitles }: MovieAudioSubsProps) {
  if (!audioTracks.length && !subtitles.length) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
      {/* Audio Tracks */}
      {audioTracks.length > 0 && (
        <div className="bg-surface-container border border-outline-variant rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4 text-on-surface-variant">
            <Icons.media.volume2 className="w-5 h-5 text-on-surface-variant" />
            <span className="text-[10px] font-black uppercase tracking-widest">Audios Incluidos</span>
          </div>
          <div className="flex flex-col gap-2">
            {audioTracks.map((track, idx) => (
              <span key={idx} className="text-sm font-medium text-on-surface-variant bg-surface-container-high px-3 py-1.5 rounded-lg border border-outline-variant w-fit">
                {track}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Subtitles */}
      {subtitles.length > 0 && (
        <div className="bg-surface-container border border-outline-variant rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4 text-on-surface-variant">
            <Icons.ui.messageText className="w-5 h-5 text-on-surface-variant" />
            <span className="text-[10px] font-black uppercase tracking-widest">Subtítulos</span>
          </div>
          <div className="flex flex-col gap-2">
            {subtitles.map((sub, idx) => (
              <span key={idx} className="text-sm font-medium text-on-surface-variant bg-surface-container-high px-3 py-1.5 rounded-lg border border-outline-variant w-fit">
                {sub}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
