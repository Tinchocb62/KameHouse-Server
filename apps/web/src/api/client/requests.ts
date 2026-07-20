import { getServerBaseUrl } from "@/api/client/server-url"
import { useMutation, UseMutationOptions, useQuery, UseQueryOptions } from "@tanstack/react-query"
import { useEffect } from "react"
import { toast } from "sonner"

export class ApiError extends Error {
    constructor(
        public readonly message: string,
        public readonly status: number,
        public readonly data?: unknown
    ) {
        super(message);
        this.name = "ApiError";
    }
}

type SeaQuery<D> = {
    endpoint: string
    method: "POST" | "GET" | "PATCH" | "DELETE" | "PUT"
    data?: D
    params?: D
    password?: string
}

export function useSeaQuery() {
    // Stub – auth is not in use for the standalone UI
    const password = undefined

    return {
        seaFetch: <T, D = void>(endpoint: string, method: "POST" | "GET" | "PATCH" | "DELETE" | "PUT", data?: D, params?: D) => {
            return buildSeaQuery<T, D>({
                endpoint,
                method,
                data,
                params,
                password,
            })
        },
    }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function buildSeaQuery<T, D = void>(
    {
        endpoint,
        method,
        data,
        params,
        password,
    }: SeaQuery<D>): Promise<T | undefined> {

    const base = getServerBaseUrl() || (typeof window !== "undefined" ? window.location.origin : "http://localhost")
    let url: URL
    try {
        url = new URL(endpoint, base)
    } catch (e) {
        console.error("FAILED URL:", endpoint, base)
        throw e
    }
    if (params) {
        // Append query parameters
        Object.keys(params as Record<string, unknown>).forEach((key) => {
            const value = (params as Record<string, unknown>)[key];
            if (value !== undefined) {
                if (Array.isArray(value)) {
                    value.forEach(v => url.searchParams.append(key, String(v)));
                } else {
                    url.searchParams.append(key, String(value));
                }
            }
        });
    }


    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    if (password) {
        headers["Authorization"] = `Bearer ${password}`
    }

    const maxRetries = 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
        try {
            const res = await fetch(url.toString(), {
                method,
                headers,
                body: data !== undefined ? JSON.stringify(data) : undefined,
            });


            if (!res.ok) {
                let errorData: unknown;
                const text = await res.text();
                try {
                    errorData = JSON.parse(text);
                } catch {
                    errorData = text;
                }

                // If 502, 503, 504, 429 -> retry
                if ((res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) && attempt < maxRetries) {
                    attempt++;
                    const delay = 1000 * Math.pow(2, attempt - 1) * (0.5 + Math.random() * 0.5);
                    console.warn(`[API] Request failed with ${res.status}. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
                    await sleep(delay);
                    continue;
                }

                const errorMessage = typeof errorData === "object" && errorData !== null && "error" in errorData && typeof (errorData as Record<string, unknown>).error === "string"
                    ? (errorData as Record<string, unknown>).error as string
                    : `HTTP Error ${res.status}`;
                throw new ApiError(errorMessage, res.status, errorData);
            }

            // Expected response format: { data: T, error?: string } from Go backend
            const json = await res.json() as { data?: T; error?: string };
            
            if (json.error) {
                throw new ApiError(json.error, res.status, json);
            }
            if (!("data" in json)) {
                throw new ApiError("Malformed response payload: missing 'data'", res.status, json);
            }
            
            return json.data as T;

        } catch (error) {
            // Network errors or already thrown ApiError
            if (error instanceof TypeError && attempt < maxRetries) { // fetch throws TypeError on network failure
                attempt++;
                const delay = 1000 * Math.pow(2, attempt - 1) * (0.5 + Math.random() * 0.5);
                console.warn(`[API] Network error. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
                await sleep(delay);
                continue;
            }
            throw error;
        }
    }

    return undefined; // Should not reach here
}

type ServerMutationProps<R, V = void, C = unknown> = Omit<UseMutationOptions<R | undefined, ApiError, V, C>, "mutationFn"> & {
    endpoint: string
    method: "POST" | "GET" | "PATCH" | "DELETE" | "PUT"
    throwOnError?: boolean
}

export function useServerMutation<R = void, V = void, C = unknown>(
    {
        endpoint,
        method,
        ...options
    }: ServerMutationProps<R, V, C>) {

    const password = undefined

    return useMutation<R | undefined, ApiError, V, C>({
        onError: (...args) => {
            const [error] = args;
            console.debug("Mutation error", error)
            const errorMsg = _handleSeaError(error.data)
            if (errorMsg.includes("feature disabled")) {
                toast.warning("This feature is disabled")
            } else {
                toast.error(errorMsg)
            }
            if (options.onError) {
                options.onError(...args)
            }
        },
        mutationFn: async (variables) => {
            return buildSeaQuery<R, V>({
                endpoint: endpoint,
                method: method,
                data: variables,
                password: password,
            })
        },
        ...options,
    })
}

type ServerQueryProps<R, V, TData = R | undefined> = Omit<UseQueryOptions<R | undefined, ApiError, TData>, "queryFn"> & {
    endpoint: string
    method: "POST" | "GET" | "PATCH" | "DELETE" | "PUT"
    params?: V
    data?: V
    muteError?: boolean
    throwOnError?: boolean
}

export function useServerQuery<R, V = void, TData = R | undefined>(
    {
        endpoint,
        method,
        params,
        data,
        muteError,
        ...options
    }: ServerQueryProps<R, V, TData>) {


    const props = useQuery<R | undefined, ApiError, TData>({
        queryFn: async () => {
            return buildSeaQuery<R, V>({
                endpoint: endpoint,
                method: method,
                params: params,
                data: data,
            })
        },
        ...options,
    })

    useEffect(() => {
        if (!muteError && props.isError) {
            if (props.error?.data === "UNAUTHENTICATED" && window.location.pathname !== "/public/auth") {
                window.location.href = "/public/auth"
                return
            }
            console.debug("Server error", props.error)
            const errorMsg = _handleSeaError(props.error?.data)
            if (errorMsg.includes("feature disabled")) {
                return
            }
            if (!!errorMsg) {
                toast.error(errorMsg)
            }
        }
    }, [props.error, props.isError, muteError])

    return props
}

//----------------------------------------------------------------------------------------------------------------------

function _handleSeaError(data: unknown): string {
    if (typeof data === "string") return "Server Error: " + data

    if (typeof data !== "object" || data === null) return "Unknown error"

    const err = "error" in data && typeof (data as Record<string, unknown>).error === "string"
        ? (data as Record<string, unknown>).error as string
        : undefined

    if (!err) return "Unknown error"

    if (err.includes("Too many requests"))
        return "Platform: Too many requests, please wait a moment and try again."

    try {
        const graphqlErr = JSON.parse(err) as { graphqlErrors?: Array<{ message?: string }> }
        console.debug("Platform error", graphqlErr)
        if (graphqlErr.graphqlErrors && graphqlErr.graphqlErrors.length > 0 && !!graphqlErr.graphqlErrors[0]?.message) {
            return "Platform error: " + graphqlErr.graphqlErrors[0]?.message
        }
        return "Platform error"
    }
    catch {
        if (err.includes("no cached data") || err.includes("cache lookup failed")) {
            return ""
        }
        return "Error: " + err
    }
}


