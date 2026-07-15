import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import React from "react"
import { LoadingErrorOverlay, SkipIntroOverlay, CenterPlayFlash } from "./player-overlays"

describe("Player Overlays", () => {
    describe("LoadingErrorOverlay", () => {
        it("renders loading state", () => {
            const { container } = render(<LoadingErrorOverlay status="loading" errorMsg="" streamType="transcode" isBuffering={false} onClose={() => {}} />)
            expect(container.querySelector("svg.lucide-loader-circle")).toBeInTheDocument()
        })

        it("renders error state with generic message", () => {
            render(<LoadingErrorOverlay status="error" errorMsg="Stream no encontrado" streamType="transcode" isBuffering={false} onClose={() => {}} />)
            expect(screen.getByText(/TRANSMISIÓN CAÍDA/i)).toBeInTheDocument()
            expect(screen.getByText("Stream no encontrado")).toBeInTheDocument()
        })

        it("calls onClose when returning from error", () => {
            const spy = vi.fn()
            render(<LoadingErrorOverlay status="error" errorMsg="x" streamType="x" isBuffering={false} onClose={spy} />)
            fireEvent.click(screen.getByText(/REGRESAR/i))
            expect(spy).toHaveBeenCalledTimes(1)
        })
    })

    describe("CenterPlayFlash", () => {
        it("returns nothing if null", () => {
            const { container } = render(<CenterPlayFlash flash={null} />)
            expect(container.firstChild).toBeNull()
        })
        it("renders flash element if play", () => {
            const { container } = render(<CenterPlayFlash flash="play" />)
            expect(container.firstChild).not.toBeNull()
        })
    })

    describe("SkipIntroOverlay", () => {
        it("hides when show is false", () => {
            const spy = vi.fn()
            render(<SkipIntroOverlay show={false} onSkip={spy} />)
            const btn = screen.getByRole("button", { name: /saltar intro/i })
            // the parent div will have opacity-0 if not show
            expect(btn.parentElement).toHaveClass("opacity-0")
        })

        it("shows when show is true and triggers callback", () => {
            const spy = vi.fn()
            render(<SkipIntroOverlay show={true} onSkip={spy} />)
            const btn = screen.getByRole("button", { name: /saltar intro/i })
            expect(btn.parentElement).toHaveClass("opacity-100")
            fireEvent.click(btn)
            expect(spy).toHaveBeenCalledTimes(1)
        })
    })
})
