import { Button } from "@/components/ui/button"
import { Link } from "@tanstack/react-router"
import React from "react"

export function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-black border border-zinc-800">
            <h2 className="text-4xl font-display tracking-widest text-white mb-4 uppercase">
                PÁGINA NO ENCONTRADA
            </h2>
            <p className="text-zinc-400 mb-8 leading-relaxed text-sm max-w-md font-bold uppercase tracking-wide">
                El módulo que buscas no existe en este sector del universo.
            </p>
            <Link to="/home">
                <Button className="px-8 py-3 bg-white text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-200 transition-colors rounded-none h-auto">
                    VOLVER AL INICIO
                </Button>
            </Link>
        </div>
    )
}
