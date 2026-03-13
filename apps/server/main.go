package main

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
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



func run(ctx context.Context) error {
	portStr := os.Getenv("KAMEHOUSE_PORT")
	portStrVal := 43211
	if portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil {
			portStrVal = p
		}
	}
	hostStr := os.Getenv("KAMEHOUSE_HOST")
	if hostStr == "" {
		hostStr = "127.0.0.1"
	}

	// Initialize robust arguments required by NewKameHouse inside KameHouse.
	configOpts := &core.ConfigOptions{
		Flags:        core.KameHouseFlags{Port: portStrVal, Host: hostStr, IsDesktopSidecar: true},
		EmbeddedLogo: embeddedLogo,
	}

	app := core.NewKameHouse(configOpts, nil)

	// Since NewEchoApp returns an unstarted Echo instance, we run it manually
	// Or use core.RunEchoServer if adapted to take context
	e := core.NewEchoApp(app, &WebFS)
	handlers.InitRoutes(app, e)

	addr := fmt.Sprintf("%s:%d", hostStr, portStrVal)

	// Start server concurrently
	errCh := make(chan error, 1)
	go func() {
		app.Logger.Info().Msg(fmt.Sprintf("server listening on %s", addr))
		errCh <- e.Start(addr)
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
