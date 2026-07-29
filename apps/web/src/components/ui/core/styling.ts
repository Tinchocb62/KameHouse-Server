import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * Escalas tipográficas propias definidas en `styles/tokens/typography.css` como
 * utilidades `.text-*` con el shorthand `font:`.
 *
 * Hay que declarárselas a tailwind-merge: al no ser tamaños conocidos de
 * Tailwind, las clasificaba como **color de texto** y cualquier
 * `text-on-surface` posterior dentro del mismo `cn()` borraba el tamaño en
 * silencio. El síntoma era un label que heredaba el tamaño del contenedor
 * (p. ej. las tabs de /series se veían enormes) sin nada raro en el código.
 */
const TYPOGRAPHY_SCALE = [
    "display-xl", "display-lg", "display-md", "display-sm", "display-xs",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "body-lg", "body-md", "body-sm", "body-xs",
    "button-lg", "button-md", "button-sm", "button-xs",
    "label-lg", "label-md", "label-sm",
    "badge", "caption", "overline",
    "numeric", "numeric-lg",
]

const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            "font-size": [{ text: TYPOGRAPHY_SCALE }],
        },
    },
})

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function defineStyleAnatomy<T extends Record<string, unknown>>(parts: T): T {
    return parts
}

export type ComponentAnatomy<T extends Record<string, unknown>> = {
    [K in keyof T as `${string & K}Class`]?: string
}
