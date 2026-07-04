import { ApiError } from "@/api/client/requests"
import { WebsocketProvider } from "@/app/websocket-provider"
import { PwaRegistry } from "@/components/pwa-registry"
import { Toaster } from "@/components/ui/toaster"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MotionConfig } from "framer-motion"

import React, { useEffect } from "react"
import { CookiesProvider } from "react-cookie"
import { toast } from "sonner"
import { useAppStore } from "@/lib/store"

interface ClientProvidersProps {
    children?: React.ReactNode
}

/** Status codes that should NEVER be retried — they indicate a definitive client error. */
const NO_RETRY_STATUSES = new Set([400, 401, 403, 404, 422])

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000,        // 5 min fresh
            gcTime: 30 * 60 * 1000,           // 30 min in-cache (prevents flicker on rapid nav)
            // Smart retry: 1 attempt for transient errors, 0 for definitive failures.
            retry: (failureCount, error) => {
                if (error instanceof ApiError && NO_RETRY_STATUSES.has(error.status)) {
                    return false
                }
                return failureCount < 1
            },
        },
        mutations: {
            // Global fallback: any unhandled mutation failure shows a toast.
            // Individual hooks can still add their own onError and call options.onError().
            onError: (error) => {
                if (error instanceof ApiError) {
                    const msg = (error.data as Record<string, string>)?.error ?? error.message
                    if (!msg.includes("feature disabled")) {
                        toast.error(msg || "An unexpected error occurred")
                    }
                }
            },
        },
    },
})

export const ClientProviders: React.FC<ClientProvidersProps> = ({ children }) => {
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            if (params.get("tvMode") === "true") {
                useAppStore.getState().setTvMode(true);
                // Remove parameter from URL history so navigation remains clean
                window.history.replaceState({}, "", window.location.pathname);
            }
        }
    }, []);

    return (
        <MotionConfig reducedMotion="user">
            <CookiesProvider>
                <QueryClientProvider client={queryClient}>
                    <WebsocketProvider>
                        {children}
                        <Toaster />
                        <PwaRegistry />
                    </WebsocketProvider>
                    {/*    <ReactQueryDevtools />*/}
                    {/*</React.Suspense>}*/}
                </QueryClientProvider>
            </CookiesProvider>
        </MotionConfig>
    )

}
