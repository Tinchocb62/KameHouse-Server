"use client"
import React from "react"
import { useScannerEvents } from "@/hooks/useScannerEvents"

export default function Template({ children }: { children: React.ReactNode }) {
    useScannerEvents()
    return <>{children}</>
}
