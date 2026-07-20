import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function defineStyleAnatomy<T extends Record<string, unknown>>(parts: T): T {
    return parts
}

export type ComponentAnatomy<T extends Record<string, unknown>> = {
    [K in keyof T as `${string & K}Class`]?: string
}
