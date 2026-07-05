import * as React from "react"
import { RefreshCw, AlertTriangle } from "lucide-react"

interface Props {
    children: React.ReactNode
    /** Optional label shown in the fallback — e.g. "Video Player" */
    label?: string
}

interface State {
    hasError: boolean
    errorMessage: string
}

/**
 * PlayerErrorBoundary — wraps the video player to isolate render crashes.
 *
 * A crash inside the player (e.g. a corrupt subtitle track, a bad chapter
 * timestamp, or an unexpected null ref in a hook) would normally propagate
 * to the nearest parent boundary and potentially unmount the entire app.
 * This boundary catches those errors and shows a retry UI instead.
 */
export class PlayerErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, errorMessage: "" }
    }

    static getDerivedStateFromError(error: unknown): State {
        const message = error instanceof Error ? error.message : String(error)
        return { hasError: true, errorMessage: message }
    }

    componentDidCatch(error: unknown, info: React.ErrorInfo) {
        console.error("[PlayerErrorBoundary] Player crashed:", error, info.componentStack)
    }

    private handleRetry = () => {
        this.setState({ hasError: false, errorMessage: "" })
    }

    render() {
        if (this.state.hasError) {
            const { label = "Player" } = this.props
            return (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-black/80 text-white rounded-lg p-8 min-h-[200px]">
                    <AlertTriangle className="w-10 h-10 text-amber-400 shrink-0" />
                    <div className="text-center space-y-1">
                        <p className="font-semibold text-base">{label} encontró un error</p>
                        {this.state.errorMessage && (
                            <p className="text-xs text-white/50 font-mono max-w-sm break-all">
                                {this.state.errorMessage}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-sm font-medium"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reintentar
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
