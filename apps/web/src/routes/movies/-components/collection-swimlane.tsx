import { Play } from "lucide-react"

interface CollectionMovie {
  id: string
  title: string
  posterUrl: string
  year?: number
}

interface CollectionSwimlaneProps {
  collectionId: string
  collectionName: string
  movies: CollectionMovie[]
  onMovieSelect: (id: string) => void
}

export function CollectionSwimlane({ collectionId, collectionName, movies, onMovieSelect }: CollectionSwimlaneProps) {
  if (!movies || movies.length === 0) return null

  return (
    <div className="w-full mt-12 pb-8">
      <h3 className="text-2xl font-display tracking-[0.15em] text-white uppercase border-b border-white/5 pb-3 mb-6">
        Colección: {collectionName}
      </h3>
      
      <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
        {movies.map((movie) => (
          <div 
            key={movie.id} 
            onClick={() => onMovieSelect(movie.id)}
            className="flex-shrink-0 w-44 sm:w-56 snap-start group cursor-pointer"
          >
            <div className="w-full aspect-[2/3] rounded-xl overflow-hidden relative shadow-lg bg-zinc-900 border border-transparent group-hover:border-amber-500/50 transition-colors duration-300">
              <img 
                src={movie.posterUrl} 
                alt={movie.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center">
                  <Play className="w-5 h-5 ml-1" fill="currentColor" />
                </div>
              </div>
            </div>
            <div className="mt-2 text-center px-1">
              <h4 className="text-sm font-bold text-gray-300 group-hover:text-amber-500 transition-colors line-clamp-2">
                {movie.title}
              </h4>
              {movie.year && (
                <span className="text-[10px] text-gray-500 font-black mt-1 block">
                  {movie.year}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
