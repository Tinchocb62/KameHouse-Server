
interface MovieHeroWidescreenProps {
  title: string
  romajiTitle?: string
  backdropUrl: string
  collectionNumber?: number
  rating?: number
}

export function MovieHeroWidescreen({
  title,
  romajiTitle,
  backdropUrl,
  collectionNumber,
  rating,
}: MovieHeroWidescreenProps) {
  return (
    <div className="relative w-full h-[55vh] min-h-[450px] flex items-end">
      {/* Background Image with absolute positioning */}
      <div className="absolute inset-0 z-0">
        <img
          src={backdropUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-8 pb-12">
        <div className="max-w-3xl space-y-4">

          {/* Metadata Badges */}
          <div className="flex items-center space-x-3 text-sm font-bold text-on-surface-variant">
            {collectionNumber && (
              <span className="px-2 py-1 glass-liquid text-on-surface-variant rounded uppercase tracking-wider text-[10px]">
                Película {collectionNumber}
              </span>
            )}
            {rating && (
              <span className="text-on-surface-variant">
                {(rating).toFixed(1)} TMDB
              </span>
            )}
            {romajiTitle && (
              <span className="text-on-surface-variant font-medium tracking-wide">
                {romajiTitle}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-on-surface tracking-tight">
            {title}
          </h1>
        </div>
      </div>
    </div>
  )
}
