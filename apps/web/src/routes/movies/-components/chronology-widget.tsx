import type { MovieChronology } from "@/api/types/movie.types"

interface ChronologyWidgetProps {
  chronology: MovieChronology | null
}

export function ChronologyWidget({ chronology }: ChronologyWidgetProps) {
  if (!chronology || !chronology.startEpisodeContext) return null

  return (
    <div className="bg-surface-container border border-outline-variant rounded-2xl p-6 mt-8 cursor-pointer">
      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant mb-6">
        Ubicación Cronológica
      </h4>

      <div className="relative flex items-center justify-between w-full max-w-2xl mx-auto px-4">
        {/* Background Line */}
        <div className="absolute left-0 right-0 h-1 bg-outline-variant top-1/2 -translate-y-1/2 rounded-full z-0" />

        {/* Active Line segment */}
        <div className="absolute left-1/4 right-1/4 h-1 bg-on-surface-variant top-1/2 -translate-y-1/2 rounded-full z-0" />

        {/* Start Episode Node */}
        <div className="relative z-10 flex flex-col items-center gap-2 -ml-4">
          <div className="w-4 h-4 rounded-full bg-surface-container-high border-2 border-outline-variant" />
          <span className="text-xs font-bold text-on-surface-variant">Ep {chronology.startEpisodeContext}</span>
        </div>

        {/* Current Movie Node */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-on-surface border-4 border-surface" />
          <span className="text-[10px] uppercase font-black tracking-widest text-on-surface">
            Esta Película
          </span>
        </div>

        {/* End Episode Node */}
        <div className="relative z-10 flex flex-col items-center gap-2 -mr-4">
          <div className="w-4 h-4 rounded-full bg-surface-container-high border-2 border-outline-variant" />
          <span className="text-xs font-bold text-on-surface-variant">Ep {chronology.endEpisodeContext}</span>
        </div>
      </div>

      {/* Chronology Notes */}
      {chronology.chronologyNotes && (
        <p className="text-center text-sm text-on-surface-variant mt-6 max-w-lg mx-auto">
          {chronology.chronologyNotes}
        </p>
      )}
    </div>
  )
}
