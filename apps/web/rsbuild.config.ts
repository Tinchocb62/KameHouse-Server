import { defineConfig, loadEnv, RsbuildConfig } from "@rsbuild/core"
import { pluginBabel } from "@rsbuild/plugin-babel"
import { pluginReact } from "@rsbuild/plugin-react"
import { RsdoctorRspackPlugin } from "@rsdoctor/rspack-plugin"
import { TanStackRouterRspack } from "@tanstack/router-plugin/rspack"
import path from "path"
import { pluginJassubTranspile } from "./rsbuild.jassub"
import { getPwaPlugin } from "./rsbuild.pwa"

const { publicVars } = loadEnv({ prefixes: ["SEA_"] })

/** Puerto del API en desarrollo (proxy `/api` y `getServerBaseUrl` en desktop dev). */
const devBackendPort =
    process.env.KAMEHOUSE_DEV_API_PORT ||
    process.env.KAMEHOUSE_PORT ||
    process.env.SEA_PUBLIC_DEV_API_PORT ||
    "43211"
const devBackendTarget = `http://127.0.0.1:${devBackendPort}`

const config: RsbuildConfig = {
    plugins: [
        pluginReact(),
        pluginJassubTranspile(),
        pluginBabel({
            include: /\.(?:jsx|tsx|m?js|m?jsx)$/,
            exclude: [/[\\/]node_modules[\\/]/],
            babelLoaderOptions(opts) {
                opts.presets ??= []
                opts.presets.push(["@babel/preset-env", {
                    targets: ["chrome >= 47"],
                    modules: false,
                }])
                opts.plugins ??= []
                opts.plugins.push(["babel-plugin-polyfill-corejs3", { method: "usage-global", version: "3.38" }])
            },
        }),
    ].filter(Boolean),
    source: {
        entry: {
            index: "./src/main.tsx",
        },
        define: {
            ...publicVars,
            "import.meta.env.SEA_PUBLIC_DEV_API_PORT": JSON.stringify(devBackendPort),
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: { // dev server
        port: Number(process.env.PORT) || 43210,
        host: "0.0.0.0",
        headers: {
            "Cross-Origin-Embedder-Policy": "credentialless",
            "Cross-Origin-Opener-Policy": "same-origin",
        },
        proxy: {
            '/api': {
                target: devBackendTarget,
                changeOrigin: true,
                ws: true,
                logLevel: 'silent',
                onError: (err, req, res) => {
                    const code = (err as any).code || '';
                    if (code === 'ECONNRESET' || code === 'ECONNABORTED' || code === 'EPIPE') {
                        return;
                    }
                    if (res && 'writeHead' in res && !(res as any).headersSent) {
                        (res as any).writeHead(500, { 'Content-Type': 'text/plain' });
                        (res as any).end('Proxy error: ' + err.message);
                    }
                }
            },
        },
    },
    output: {
        polyfill: "usage",
        dataUriLimit: 1024,
        cleanDistPath: true,
        sourceMap: process.env.NODE_ENV === "production" ? "hidden" : !!process.env.RSDOCTOR,
        distPath: {
            root: "out",
        },
        filename: {
            js: process.env.NODE_ENV === "production" ? "[name].[contenthash:8].js" : "[name].js",
        },
    },
    html: {
        template: "./index.html",
        title: "KameHouse",
    },
    performance: {
        preload: {
            type: "initial",
            include: [/(?:latin|bebas-neue).*\.woff2$/],
        },
        chunkSplit: process.env.NODE_ENV === "production" ? {
            forceSplitting: {
                "react": /react|react-dom/,
                "hls": /hls\.js/,
                "rrweb": /rrweb/,
                "lucide": /lucide-react/,
                "tanstack-query": /@tanstack\/react-query/,
                "tanstack-router": /@tanstack\/react-router/,
                "framer-motion": /framer-motion/,
                "gsap": /gsap/,
                "zod": /zod/,
            },
        } : {
            strategy: "all-in-one",
        },
    },
    tools: {
        rspack: {
            experiments: {},
            output: {
                chunkFilename: process.env.NODE_ENV === "production" ? "static/js/async/[name].[contenthash:8].js" : "static/js/async/[name].js",
            },
            optimization: {
                chunkIds: !!process.env.RSDOCTOR ? "named" : undefined,
            },
            plugins: [
                TanStackRouterRspack({
                    routesDirectory: "./src/routes",
                    generatedRouteTree: "./src/routeTree.gen.ts",
                    autoCodeSplitting: true,
                    routeFileIgnorePattern: "((^|\\.)(components|hooks|helpers|mappers|types|utils|tabs?)|.*-tab)\\.(ts|tsx)$",
                }),
                process.env.NODE_ENV === 'production' && getPwaPlugin(),
                process.env.RSDOCTOR && new RsdoctorRspackPlugin({}),
            ].filter(Boolean),
            resolve: {
                mainFields: ["module", "main"],
                conditionNames: ["import", "module", "browser", "default"],
                fallback: {
                    module: false,
                },
            },
            module: {
                parser: {
                    javascript: {
                        strictExportPresence: false,
                    },
                },
                rules: [
                    { // stops circular deps warning
                        test: /jassub[\\/]dist[\\/].*\.js$/,
                        parser: {
                            worker: false,
                        },
                    },
                    { // don't emit these again
                        test: /\.wasm$/,
                        include: /node_modules[\\/]jassub/,
                        type: "asset/resource",
                        generator: {
                            emit: false,
                        },
                    },
                ],
            },
        },
    },
}
export default defineConfig(config)
