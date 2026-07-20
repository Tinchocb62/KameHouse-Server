import { cn } from "@/components/ui/core/styling";
import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Icons } from "@/components/ui/icons";
import { useAppStore } from "@/lib/store";
import { useResponsive } from "@/hooks/use-responsive";

export interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const { isMobile } = useResponsive();
  const sidebarOpen = useAppStore(state => state.sidebarOpen);
  const setSidebarOpen = useAppStore(state => state.setSidebarOpen);
  const tvMode = useAppStore(state => state.tvMode);
  const location = useLocation();

  if (tvMode) return null;

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-[var(--z-navbar)] flex items-center justify-between",
        "px-4 md:px-6 h-[64px]",
        "bg-[color:color-mix(in_srgb,var(--md-sys-color-surface)_70%,transparent)] backdrop-blur-[var(--blur-overlay-xl)]",
        "border-b border-outline-variant/50",
        "shadow-elevation-1",
        className
      )}
    >
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden p-3 rounded-full bg-surface-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all active:scale-[0.95]"
          aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
        >
            <Icons.navigation.menu className="w-5 h-5" />
        </button>

        <Link
          to="/home"
          className="flex items-center gap-2 shrink-0"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="relative">
            <img
              src="/kamehouse-logo.png"
              alt="KameHouse"
              className="h-8 w-8 object-contain"
            />
            <div className="absolute inset-0 bg-brand-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-slow rounded-full" />
          </div>
          {!isMobile && (
            <span className="font-display text-xl text-brand-accent tracking-wider whitespace-nowrap">
              KAMEHOUSE
            </span>
          )}
        </Link>

        <div className="hidden md:flex items-center gap-1 ml-2">
          {[
            { to: "/home", label: "Inicio", icon: Icons.navigation.home },
            { to: "/series", label: "Series", icon: Icons.navigation.tv },
            { to: "/movies", label: "Películas", icon: Icons.navigation.film },
            { to: "/collections", label: "Colecciones", icon: Icons.navigation.layers },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-label-md font-medium transition-all duration-fast",
                location.pathname === item.to
                  ? "text-brand-accent bg-brand-accent/10"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={16} strokeWidth={2.5} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="hidden sm:inline-flex flex items-center gap-2 px-3 py-2 rounded-full bg-surface-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all duration-base"
        >
          <Icons.navigation.search className="w-4 h-4" />
          <span>Buscar</span>
        </button>

        <button
          className="hidden md:inline-flex p-2 rounded-full bg-surface-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all duration-base relative"
          aria-label="Notificaciones"
        >
          <Icons.ui.bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-caption font-black flex items-center justify-center">
            3
          </span>
        </button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-accent to-brand-secondary flex items-center justify-center font-bold text-primary-foreground text-sm ring-2 ring-surface">
          M
        </div>

        <button
          className="md:hidden p-3 rounded-full bg-surface-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all active:scale-[0.95]"
          aria-label="Menú usuario"
        >
          <Icons.navigation.chevronDown className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}

export function NavbarSpacer() {
  return <div className="h-[64px]" aria-hidden="true" />;
}