import React from "react";
import { Icons } from "./icons";
import { cn } from "./core/styling";

interface PlayCtaProps {
    onClick: () => void;
    onHoverIntent?: () => void;
    label: string;
    sublabel: string;
    title?: string;
    className?: string;
}

export function PlayCta({ onClick, onHoverIntent, label, sublabel, title, className }: PlayCtaProps) {
    return (
        <button
            onClick={onClick}
            onPointerEnter={onHoverIntent}
            onFocus={onHoverIntent}
            title={title}
            className={cn(
                "group/play relative flex items-center justify-center md:justify-start gap-4 px-8 py-4 text-zinc-950 rounded-xl overflow-hidden shadow-brand-accent transition-all duration-base hover:scale-[1.03] active:scale-95 w-full md:w-auto shrink-0",
                className
            )}
            style={{ background: `linear-gradient(to right, var(--era-btn-from), var(--era-btn-to))` }}
        >
            <div className="absolute inset-0 transition-opacity duration-base opacity-0 group-hover/play:opacity-100 z-0" style={{ background: `linear-gradient(to right, var(--era-btn-hover-from), var(--era-btn-hover-to))` }} />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-0 group-hover/play:opacity-100 transition-opacity duration-slow ease-smooth-out z-0" />

            <div className="p-3 bg-black/15 backdrop-blur-[var(--blur-overlay-sm)] rounded-xl text-zinc-950 group-hover/play:bg-zinc-950 group-hover/play:text-zinc-50 transition-all duration-base z-10 shrink-0">
                <Icons.media.play className="w-4 h-4 fill-current ml-0.5" />
            </div>

            <div className="flex flex-col items-start z-10 select-none text-left shrink-0">
                <span className="font-sans text-button-md tracking-wider font-black uppercase text-zinc-950 transition-colors whitespace-nowrap">
                    {label}
                </span>
                <span className="text-label-sm font-black text-zinc-950/70 tracking-widest uppercase transition-colors mt-0.5 whitespace-nowrap">
                    {sublabel}
                </span>
            </div>
        </button>
    );
}
