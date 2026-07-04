"use client";

import { cn } from "@/components/ui/core/styling";
import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { Vaul, VaulContent } from "@/components/vaul";
import { Icons } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useResponsive } from "@/hooks/use-responsive";
import { useSound } from "@/hooks/use-sound";
import { useGetLibraryCollection } from "@/api/hooks/anime_collection.hooks";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const SIDEBAR_ITEMS = [
  { to: "/home", label: "Inicio", icon: Icons.navigation.home },
  { to: "/series", label: "Series", icon: Icons.navigation.tv },
  { to: "/movies", label: "Películas", icon: Icons.navigation.film },
  { to: "/collections", label: "Colecciones", icon: Icons.navigation.layers },
] as const;

export function Sidebar() {
  const sidebarOpen = useAppStore(state => state.sidebarOpen);
  const setSidebarOpen = useAppStore(state => state.setSidebarOpen);
  const isFullscreen = useAppStore(state => state.isFullscreen);
  const tvMode = useAppStore(state => state.tvMode);
  const { isMobile } = useResponsive();

  if (isFullscreen || tvMode) return null;

  return (
    <>
      <aside className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 bottom-0 h-screen border-r border-[var(--glass-border)] backdrop-blur-[var(--blur-overlay-xl)] rounded-r-3xl shadow-glass z-[var(--z-sidebar)] overflow-visible transition-all duration-slow ease-smooth sidebar-gradient relative",
        sidebarOpen ? "w-[260px]" : "w-20"
      )}>
        <SidebarContent setSidebarOpen={setSidebarOpen} />
      </aside>

      {isMobile && (
        <Vaul open={sidebarOpen} onOpenChange={setSidebarOpen} direction="left">
          <VaulContent
            className="md:hidden fixed inset-y-0 left-0 z-[var(--z-sidebar)] flex h-full w-[280px] flex-col border-r border-[var(--glass-border)] sidebar-gradient !border-y-0 !border-l-0 !rounded-none shadow-player"
            overlayClass="md:hidden bg-[var(--bg-primary)]/60 backdrop-blur-[var(--blur-overlay-sm)]"
          >
            <SidebarContent setSidebarOpen={setSidebarOpen} />
          </VaulContent>
        </Vaul>
      )}
    </>
  );
}

function SidebarContent({ setSidebarOpen }: { setSidebarOpen: (open: boolean) => void }) {
  const { playSound } = useSound();
  const sidebarOpen = useAppStore(state => state.sidebarOpen);
  const playlistQueue = useAppStore(state => state.playlistQueue);
  const globalQueueOpen = useAppStore(state => state.globalQueueOpen);
  const setGlobalQueueOpen = useAppStore(state => state.setGlobalQueueOpen);
  const marathonMode = useAppStore(state => state.marathonMode);
  const setMarathonMode = useAppStore(state => state.setMarathonMode);
  const bgMusicEnabled = useAppStore(state => state.bgMusicEnabled);
  const setBgMusicEnabled = useAppStore(state => state.setBgMusicEnabled);
  const setUiSoundsEnabled = useAppStore(state => state.setUiSoundsEnabled);
  const { isMobile } = useResponsive();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const activeIndicatorRef = React.useRef<HTMLDivElement>(null);
  const activeBgRef = React.useRef<HTMLDivElement>(null);
  const navRef = React.useRef<HTMLDivElement>(null);

  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const { data: collection } = useGetLibraryCollection();

  const allEntries = React.useMemo(() => {
    if (!collection?.lists) return [];
    return collection.lists.flatMap(list => list.entries ?? []);
  }, [collection]);

  const playChangeSound = () => playSound("category", 0.4);

  useGSAP(() => {
    const items = containerRef.current?.querySelectorAll(".gsap-sidebar-item");
    if (items && items.length > 0) {
      gsap.fromTo(items,
        { opacity: 0, x: -16, scale: 0.95 },
        { opacity: 1, x: 0, scale: 1, duration: 0.5, stagger: 0.06, ease: "power3.out" }
      );
    }
  }, { scope: containerRef });

  useGSAP(() => {
    if (!navRef.current) return;
    const activeLink = navRef.current.querySelector(".active-sidebar-link") as HTMLElement;
    if (activeLink) {
      const navRect = navRef.current.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      const targetY = linkRect.top - navRect.top;
      const targetHeight = linkRect.height;
      const targetWidth = linkRect.width;
      const targetX = linkRect.left - navRect.left;

      if (activeIndicatorRef.current) {
        gsap.to(activeIndicatorRef.current, {
          y: targetY + (targetHeight - 24) / 2,
          opacity: 1,
          duration: 0.4,
          ease: "elastic.out(1, 0.75)",
        });
      }

      if (activeBgRef.current) {
        gsap.to(activeBgRef.current, {
          y: targetY,
          x: targetX,
          width: targetWidth,
          opacity: 1,
          height: targetHeight,
          duration: 0.4,
          ease: "power3.out",
        });
      }
    } else {
      if (activeIndicatorRef.current) {
        gsap.to(activeIndicatorRef.current, { opacity: 0, duration: 0.2 });
      }
      if (activeBgRef.current) {
        gsap.to(activeBgRef.current, { opacity: 0, duration: 0.2 });
      }
    }
  }, [currentPath, playlistQueue.length, sidebarOpen]);

  return (
    <div ref={containerRef} className={cn(
      "relative z-10 flex flex-col h-full py-8 w-full items-center bg-transparent transition-all duration-slow",
      sidebarOpen ? "px-4" : "px-4 md:px-0"
    )}>
      <div className={cn(
        "mb-10 w-full flex items-center gsap-sidebar-item transition-all duration-slow",
        sidebarOpen ? "justify-between px-2" : "justify-center"
      )}>
        <Link
          to="/home"
          onClick={() => { if (isMobile) setSidebarOpen(false); playChangeSound(); }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative">
            <img
              src="/kamehouse-logo.png"
              alt="KameHouse"
              className="h-9 w-9 shrink-0 object-contain group-hover:scale-110 transition-transform duration-slow"
            />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-slow rounded-full" style={{ background: "var(--sidebar-active-gradient)" }} />
          </div>
          {sidebarOpen && (
            <span className="font-display text-xl text-primary tracking-wider whitespace-nowrap">
              KAMEHOUSE
            </span>
          )}
        </Link>

        {sidebarOpen && !isMobile && (
          <button
            aria-label="Contraer menú"
            onClick={() => { setSidebarOpen(false); playChangeSound(); }}
            className="rotate-180 p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-pill transition-all"
          >
            <Icons.arrow.left size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div ref={navRef} className="flex-1 space-y-3 w-full flex flex-col items-center relative">
        <div
          ref={activeIndicatorRef}
          className="absolute left-0 top-0 !mt-0 w-1 h-6 rounded-r-full hidden md:block z-10 pointer-events-none opacity-0"
          style={{ background: "var(--sidebar-active-gradient)" }}
        />

        <div
          ref={activeBgRef}
          className="absolute left-0 top-0 !mt-0 rounded-2xl z-0 pointer-events-none opacity-0"
          style={{
            background: "var(--sidebar-active-bg-gradient)",
            borderColor: "var(--sidebar-active-border)"
          }}
        />

        {SIDEBAR_ITEMS.map((item) => {
          const isActive = currentPath === item.to;
          return (
            <div key={item.to} className="gsap-sidebar-item w-full flex justify-center">
              <Link
                to={item.to}
                title={item.label}
                onClick={() => { if (isMobile) setSidebarOpen(false); playChangeSound(); }}
                className={cn("w-full flex justify-center", isActive && "active-sidebar-link")}
              >
                <div className={cn(
                  "flex items-center h-12 rounded-2xl group px-4 relative glass-base transition-all duration-base",
                  "active:scale-[0.98] font-bold",
                  sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-12 w-full md:px-0",
                  isActive
                    ? "text-white"
                    : "text-on-surface-variant/70 hover:!border-[var(--glass-hover)]"
                )}>
                  <span className="shrink-0 z-10 group-hover:scale-110 transition-transform duration-fast">
                    {React.createElement(item.icon, { size: 22, strokeWidth: 2.5 })}
                  </span>
                  <span
                    className={cn(
                      "uppercase tracking-[0.2em] text-[10px] font-black z-10 text-left transition-all whitespace-nowrap",
                      (sidebarOpen || isMobile) ? "block" : "hidden md:hidden",
                      isActive
                        ? "bg-clip-text text-transparent"
                        : "text-on-surface-variant/70 group-hover:bg-clip-text group-hover:text-transparent"
                    )}
                    style={{ backgroundImage: "var(--sidebar-active-gradient)", backgroundClip: "text", WebkitBackgroundClip: "text" } as React.CSSProperties}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            </div>
          );
        })}

        {playlistQueue.length > 0 && (
          <div className="gsap-sidebar-item w-full flex justify-center">
            <button
              onClick={() => {
                setGlobalQueueOpen(!globalQueueOpen);
                if (isMobile) setSidebarOpen(false);
                playChangeSound();
              }}
              title="Cola de Reproducción"
              className={cn(
                "flex items-center h-12 rounded-2xl group px-4 relative glass-base transition-all duration-base",
                "active:scale-[0.98] font-bold",
                sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-12 w-full md:px-0",
                globalQueueOpen
                  ? "text-white !bg-[var(--sidebar-active-bg-gradient)] !border-[var(--sidebar-active-border)]"
                  : "text-on-surface-variant/70 hover:!border-[var(--glass-hover)]"
              )}
            >
              <div
                className={cn(
                  "absolute left-0 w-1 h-6 rounded-r-full transition-all duration-slow hidden md:block",
                  globalQueueOpen ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                )}
                style={{ background: "var(--sidebar-active-gradient)" }}
              />
              <span className="shrink-0 z-10 relative group-hover:scale-110 transition-transform duration-fast">
                {React.createElement(Icons.navigation.layers, { size: 22, strokeWidth: 2.5 })}
                <span className="absolute -top-2 -right-2 bg-[var(--era-dbs-hex)] text-white text-[8px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center border border-[var(--bg-primary)] shadow-md px-[3px]">
                  {playlistQueue.length}
                </span>
              </span>
              <span className={cn(
                "uppercase tracking-[0.2em] text-[10px] font-black z-10 text-left transition-all whitespace-nowrap",
                (sidebarOpen || isMobile) ? "block" : "hidden md:hidden",
                globalQueueOpen
                  ? "bg-clip-text text-transparent"
                  : "text-on-surface-variant/70 group-hover:bg-clip-text group-hover:text-transparent"
              )}
                style={{ backgroundImage: "var(--sidebar-active-gradient)", backgroundClip: "text", WebkitBackgroundClip: "text" } as React.CSSProperties}
              >
                Cola ({playlistQueue.length})
              </span>
            </button>
          </div>
        )}

        <div className="gsap-sidebar-item w-full flex justify-center">
          <button
            onClick={() => { setMarathonMode(!marathonMode); playChangeSound(); }}
            title={marathonMode ? "Desactivar Modo Maratón" : "Activar Modo Maratón"}
              className={cn(
                "flex items-center h-12 rounded-2xl group px-4 relative glass-base transition-all duration-base",
                "active:scale-[0.98] font-bold",
                sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-12 w-full md:px-0",
                marathonMode
                  ? "text-white !bg-[var(--sidebar-active-bg-gradient)] !border-[var(--sidebar-active-border)]"
                  : "text-on-surface-variant/70 hover:!border-[var(--glass-hover)]"
              )}
            >
              <div
                className={cn(
                  "absolute left-0 w-1 h-6 rounded-r-full transition-all duration-slow hidden md:block",
                  marathonMode ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                )}
                style={{ background: "var(--sidebar-active-gradient)" }}
              />
              <span className="shrink-0 z-10 group-hover:scale-110 transition-transform duration-fast">
                {React.createElement(Icons.navigation.rocket, { size: 22, strokeWidth: 2.5 })}
              </span>
              <span className={cn(
                "uppercase tracking-[0.2em] text-[10px] font-black z-10 text-left transition-all whitespace-nowrap",
                (sidebarOpen || isMobile) ? "block" : "hidden md:hidden",
                marathonMode
                  ? "bg-clip-text text-transparent"
                  : "text-on-surface-variant/70 group-hover:bg-clip-text group-hover:text-transparent"
              )}
                style={{ backgroundImage: "var(--sidebar-active-gradient)", backgroundClip: "text", WebkitBackgroundClip: "text" } as React.CSSProperties}
              >
                Maratón {marathonMode ? "(ON)" : ""}
              </span>
          </button>
        </div>
      </div>

      <div className="mt-auto pb-6 w-full flex flex-col items-center gap-6 pt-8 border-t border-[var(--glass-border)]">
        <div className={cn(
          "flex gsap-sidebar-item transition-all duration-slow w-full justify-center items-center",
          sidebarOpen ? "flex-row gap-4 px-4" : "flex-col gap-6"
        )}>
          <button
            aria-label="Música de fondo"
            onClick={() => {
              const nextState = !bgMusicEnabled
              setBgMusicEnabled(nextState)
              setUiSoundsEnabled(nextState)
            }}
            className={cn(
              "flex-1 md:flex-none p-2 rounded-pill transition-all",
              bgMusicEnabled 
                ? "text-on-surface bg-surface-container" 
                : "text-on-surface-variant hover:text-on-surface bg-surface-variant hover:bg-surface-container"
            )}
          >
            {bgMusicEnabled ? (
              <Icons.status.music size={20} strokeWidth={2.5} />
            ) : (
              <Icons.status.musicOff size={20} strokeWidth={2.5} />
            )}
          </button>
          <button
            aria-label="Reproducción aleatoria"
            className="flex-1 md:flex-none p-2 text-white bg-[var(--era-dbs-hex)] hover:brightness-110 rounded-pill transition-all"
          >
            <Icons.arrow.leftRight size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="gsap-sidebar-item w-full flex justify-center">
          <Link
            to="/settings"
            title="Configuración"
            onClick={() => { if (isMobile) setSidebarOpen(false); playChangeSound(); }}
            className={cn("w-full flex justify-center", currentPath === "/settings" && "active-sidebar-link")}
          >
            <div className={cn(
              "flex items-center h-12 rounded-2xl group px-4 relative glass-base transition-all duration-base",
              "active:scale-[0.98] font-bold",
              sidebarOpen ? "w-full justify-start gap-4 px-5" : "justify-center md:w-12 w-full md:px-0",
              currentPath === "/settings"
                ? "text-white"
                : "text-on-surface-variant/70 hover:!border-[var(--glass-hover)]"
            )}>
              <span className="shrink-0 z-10 group-hover:rotate-45 group-hover:scale-110 transition-transform duration-slow">
                {React.createElement(Icons.navigation.settings, { size: 22, strokeWidth: 2.5 })}
              </span>
              <span className={cn(
                "uppercase tracking-[0.2em] text-[10px] font-black z-10 text-left transition-all whitespace-nowrap",
                (sidebarOpen || isMobile) ? "block" : "hidden md:hidden",
                currentPath === "/settings"
                  ? "bg-clip-text text-transparent"
                  : "text-on-surface-variant/70 group-hover:bg-clip-text group-hover:text-transparent"
              )}
                style={{ backgroundImage: "var(--sidebar-active-gradient)", backgroundClip: "text", WebkitBackgroundClip: "text" } as React.CSSProperties}
              >
                Configuración
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}