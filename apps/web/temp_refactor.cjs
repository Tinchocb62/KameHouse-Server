const fs = require('fs');
const file = 'd:/Proyectos_personales/KameHouse/apps/web/src/routes/series/$seriesId/index.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace top block
const topTarget = `    return (
        <div className="glass-card p-6 md:p-8 mb-8 space-y-6 overflow-visible">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Text details */}
                <div className={cn(
                    "space-y-4 flex flex-col justify-between",
                    sagaImage ? "lg:col-span-8 col-span-12" : "col-span-12"
                )}>
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center text-label-sm text-brand-accent uppercase bg-brand-accent/10 border border-brand-accent/20 px-3 py-1 rounded-full font-bold">
                                Detalles del Arco
                            </span>
                            {saga.episodeRange && (
                                <span className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant bg-white/[0.04] border border-white/10 px-3 py-1 rounded-full">
                                    <Icons.status.tv size={12} className="text-brand-secondary" />
                                    Eps {saga.episodeRange}
                                </span>
                            )}
                            {saga.startEp != null && saga.endEp != null && (
                                <span className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant bg-white/[0.04] border border-white/10 px-3 py-1 rounded-full">
                                    <Icons.time.clock size={12} className="text-brand-success" />
                                    {saga.endEp - saga.startEp + 1} Episodios
                                </span>
                            )}
                            {dominantVibe && (
                                <span className={cn(
                                    "inline-flex items-center gap-1 text-label-sm uppercase border px-3 py-1 rounded-full",
                                    dominantVibe === "Aventura" 
                                        ? "bg-brand-magic/15 text-brand-magic border-brand-magic/25"
                                        : dominantVibe === "Tensión Absoluta" || dominantVibe === "Épico"
                                        ? "bg-brand-secondary/15 text-brand-secondary border-brand-secondary/25"
                                        : "bg-white/[0.04] border-white/10 text-on-surface-variant"
                                )}>
                                    <Icons.status.sparkles size={11} />
                                    {dominantVibe}
                                </span>
                            )}
                            {suggestedSwimlane && (
                                <span className="inline-flex items-center gap-1 text-label-sm uppercase bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary px-3 py-1 rounded-full">
                                    <Icons.navigation.library size={11} />
                                    {suggestedSwimlane}
                                </span>
                            )}
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                            <h2 className="text-h3 font-display text-on-surface uppercase leading-none">
                                {saga.name}
                            </h2>
                            {saga.canonStatus && (
                                <span className={cn(
                                    "inline-flex items-center px-3 py-1 rounded-full text-label-sm uppercase border font-semibold",
                                    saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon"
                                        ? "bg-brand-success/15 text-brand-success border-brand-success/25"
                                        : saga.canonStatus.toLowerCase() === "relleno" || saga.canonStatus === "false"
                                        ? "bg-brand-destructive/15 text-brand-destructive border-brand-destructive/25"
                                        : "bg-brand-secondary/15 text-brand-secondary border-brand-secondary/25"
                                )}>
                                    {saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon" ? "Canon" : saga.canonStatus.toLowerCase() === "relleno" || saga.canonStatus === "false" ? "Relleno" : saga.canonStatus}
                                </span>
                            )}
                        </div>
                    </div>`;

const topReplacement = `    return (
        <div className="glass-card mb-8 overflow-visible">
            {/* Header that is always visible and clickable */}
            <div 
                className="p-6 md:p-8 flex items-center justify-between cursor-pointer group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center text-label-sm text-brand-accent uppercase bg-brand-accent/10 border border-brand-accent/20 px-3 py-1 rounded-full font-bold">
                            Detalles del Arco
                        </span>
                        {saga.episodeRange && (
                            <span className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant bg-white/[0.04] border border-white/10 px-3 py-1 rounded-full">
                                <Icons.status.tv size={12} className="text-brand-secondary" />
                                Eps {saga.episodeRange}
                            </span>
                        )}
                        {saga.startEp != null && saga.endEp != null && (
                            <span className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant bg-white/[0.04] border border-white/10 px-3 py-1 rounded-full">
                                <Icons.time.clock size={12} className="text-brand-success" />
                                {saga.endEp - saga.startEp + 1} Episodios
                            </span>
                        )}
                        {dominantVibe && (
                            <span className={cn(
                                "inline-flex items-center gap-1 text-label-sm uppercase border px-3 py-1 rounded-full",
                                dominantVibe === "Aventura" 
                                    ? "bg-brand-magic/15 text-brand-magic border-brand-magic/25"
                                    : dominantVibe === "Tensión Absoluta" || dominantVibe === "Épico"
                                    ? "bg-brand-secondary/15 text-brand-secondary border-brand-secondary/25"
                                    : "bg-white/[0.04] border-white/10 text-on-surface-variant"
                            )}>
                                <Icons.status.sparkles size={11} />
                                {dominantVibe}
                            </span>
                        )}
                        {suggestedSwimlane && (
                            <span className="inline-flex items-center gap-1 text-label-sm uppercase bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary px-3 py-1 rounded-full">
                                <Icons.navigation.library size={11} />
                                {suggestedSwimlane}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                        <h2 className="text-h3 font-display text-on-surface uppercase leading-none">
                            {saga.name}
                        </h2>
                        {saga.canonStatus && (
                            <span className={cn(
                                "inline-flex items-center px-3 py-1 rounded-full text-label-sm uppercase border font-semibold",
                                saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon"
                                    ? "bg-brand-success/15 text-brand-success border-brand-success/25"
                                    : saga.canonStatus.toLowerCase() === "relleno" || saga.canonStatus === "false"
                                    ? "bg-brand-destructive/15 text-brand-destructive border-brand-destructive/25"
                                    : "bg-brand-secondary/15 text-brand-secondary border-brand-secondary/25"
                            )}>
                                {saga.canonStatus === "true" || saga.canonStatus.toLowerCase() === "canon" ? "Canon" : saga.canonStatus.toLowerCase() === "relleno" || saga.canonStatus === "false" ? "Relleno" : saga.canonStatus}
                            </span>
                        )}
                    </div>
                </div>
                {/* Chevron icon */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.05] group-hover:bg-white/[0.1] transition-colors border border-white/10 shrink-0 ml-4">
                    <Icons.navigation.chevronDown 
                        size={20} 
                        className={cn("transition-transform duration-300 text-on-surface", isExpanded && "rotate-180")} 
                    />
                </div>
            </div>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="p-6 md:p-8 pt-0 space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Text details */}
                                <div className={cn(
                                    "space-y-4 flex flex-col justify-between",
                                    sagaImage ? "lg:col-span-8 col-span-12" : "col-span-12"
                                )}>`;

content = content.replace(topTarget, topReplacement);

// Replace description block
const descTarget = `                    {description && (
                        <div className="space-y-3">
                            <div className="relative">
                                <p className={cn(
                                    "text-body-md text-on-surface-variant leading-relaxed border-l-2 border-brand-accent/30 pl-4 py-1 transition-all duration-300",
                                    !isExpanded && "line-clamp-2"
                                )}>
                                    {description}
                                </p>
                                {description.length > 80 && (
                                    <button 
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="text-label-sm text-brand-accent mt-2 ml-4 hover:underline focus:outline-none flex items-center gap-1 font-bold bg-brand-accent/10 px-3 py-1 rounded-full border border-brand-accent/20"
                                    >
                                        {isExpanded ? "Ver menos" : "Leer más"}
                                        <Icons.navigation.chevronDown 
                                            size={14} 
                                            className={cn("transition-transform duration-300", isExpanded && "rotate-180")} 
                                        />
                                    </button>
                                )}
                            </div>
                            {tags.length > 0 && (`;

const descReplacement = `                    {description && (
                        <div className="space-y-3">
                            <p className="text-body-md text-on-surface-variant leading-relaxed border-l-2 border-brand-accent/30 pl-4 py-1">
                                {description}
                            </p>
                            {tags.length > 0 && (`;

content = content.replace(descTarget, descReplacement);

// Replace bottom block
const bottomTarget = `                </div>
            )}
        </div>
    )
}`;

const bottomReplacement = `                </div>
            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}`;

content = content.replace(bottomTarget, bottomReplacement);

// Change initial state to true
content = content.replace("const [isExpanded, setIsExpanded] = useState(false)", "const [isExpanded, setIsExpanded] = useState(true)");

fs.writeFileSync(file, content);
console.log('Replacements done!');
