import { createFileRoute } from "@tanstack/react-router"
import { dbzData } from "@/lib/dbz-data"
import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

export const Route = createFileRoute("/series/")({
    component: SeriesPage,
})

function SeriesPage() {
    const navigate = useNavigate()
    const [hoveredId, setHoveredId] = useState<string | null>(null)

    return (
        <div className="fixed inset-0 bg-ui-background overflow-hidden flex flex-col items-center justify-center p-4">
            <h1 className="text-4xl font-extrabold mb-12 text-gray-100 tracking-tight">KameHouse</h1>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-center w-full max-w-7xl h-[60vh] relative">
                {dbzData.map((series) => {
                    const isHovered = hoveredId === series.id
                    const isAnyHovered = hoveredId !== null

                    return (
                        <div
                            key={series.id}
                            onMouseEnter={() => setHoveredId(series.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onClick={() => navigate({ to: `/series/${series.id}` })}
                            className={`relative h-full rounded-[16px] cursor-pointer overflow-hidden transition-all duration-\\[250ms\\] ease-\\[cubic-bezier(0.25\\,0.1\\,0.25\\,1)\\]
                                ${isHovered ? "w-full md:w-[60%] z-10 shadow-2xl scale-[1.02]" : isAnyHovered ? "w-full md:w-[10%] opacity-40 blur-sm" : "w-full md:w-[25%]"}
                                bg-ui-surface border-2 border-[rgba(255,255,255,0.05)]
                            `}
                        >
                            <img
                                src={series.image}
                                alt={series.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-\\[5s\\] ease-out"
                                style={{ transform: isHovered ? "scale(1.05)" : "scale(1)" }}
                            />
                            {/* Gradient Overlay */}
                            <div className={`absolute inset-0 bg-gradient-to-t from-[rgba(11,11,15,1)] via-[rgba(11,11,15,0.4)] to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-80'}`} />

                            {/* Content */}
                            <div className={`absolute bottom-0 left-0 p-8 flex flex-col justify-end transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                <p className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-widest">{series.year} • {series.episodesCount} EPISODIOS</p>
                                <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-none">{series.title}</h2>
                                {isHovered && (
                                    <p className="text-gray-300 max-w-xl text-lg animate-slide-up leading-relaxed">
                                        {series.description}
                                    </p>
                                )}
                            </div>

                            {/* Vertical Title (when not hovered) */}
                            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isHovered || (!isHovered && !isAnyHovered) ? 'opacity-0' : 'opacity-100'}`}>
                                <h3 className="text-white font-black text-3xl whitespace-nowrap -rotate-90 tracking-widest">{series.title}</h3>
                            </div>
                        </div>
                    )
                })}
            </div>
            <p className="fixed bottom-8 text-gray-500 text-sm font-medium tracking-widest uppercase">Selecciona una serie para comenzar</p>
        </div>
    )
}
