package main

import (
	"context"
	"embed"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"kamehouse/internal/core"
	"kamehouse/internal/handlers"
)

//go:embed all:web
var WebFS embed.FS

//go:embed internal/icon/logo.png
var embeddedLogo []byte

// AppDI represents the primary dependency injection container.
type AppDI struct {
	Logger *slog.Logger
	// TODO: Inject Config, DB Pool, and Core Services here.
}

func main() {
	// Global context canceled on OS signals (SIGINT, SIGTERM)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := run(ctx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("server application failed", "error", err)
		os.Exit(1)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func run(ctx context.Context) error {
	// Initialize robust arguments required by NewKameHouse inside KameHouse.
	configOpts := &core.ConfigOptions{
		Flags:        core.KameHouseFlags{Port: 43211, Host: "127.0.0.1", IsDesktopSidecar: true},
		EmbeddedLogo: embeddedLogo,
	}

	app := core.NewKameHouse(configOpts, nil)

	// Since NewEchoApp returns an unstarted Echo instance, we run it manually
	// Or use core.RunEchoServer if adapted to take context
	e := core.NewEchoApp(app, &WebFS)
	handlers.InitRoutes(app, e)

	// Start server concurrently
	errCh := make(chan error, 1)
	go func() {
		app.Logger.Info().Msg("server listening on :43211")
		errCh <- e.Start(":43211")
	}()

	// Block for shutdown signal or fatal error
	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		app.Logger.Info().Msg("initiating graceful shutdown")

		shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		// 1. Stop accepting new HTTP requests
		if err := e.Shutdown(shutdownCtx); err != nil {
			app.Logger.Error().Err(err).Msg("echo shutdown error")
		}
		// 2. Flush pending writes & close DB within deadline
		app.Cleanup(shutdownCtx)
		return nil
	}
}
