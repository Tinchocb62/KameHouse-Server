//go:build !windows

package util

import (
	"context"
	"os/exec"
	"syscall"
)

func NewCmd(arg string, args ...string) *exec.Cmd {
	var cmd *exec.Cmd
	if len(args) == 0 {
		cmd = exec.Command(arg)
	} else {
		cmd = exec.Command(arg, args...)
	}
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	return cmd
}

func NewCmdCtx(ctx context.Context, arg string, args ...string) *exec.Cmd {
	var cmd *exec.Cmd
	if len(args) == 0 {
		cmd = exec.CommandContext(ctx, arg)
	} else {
		cmd = exec.CommandContext(ctx, arg, args...)
	}
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	return cmd
}

// NewCmdCtxLowPriority es como NewCmdCtx. En POSIX no ajustamos la prioridad al
// crear el proceso (requeriría setpriority tras el fork); se deja igual que
// NewCmdCtx. La contención con el transcode es más crítica en Windows, donde sí
// se aplica BELOW_NORMAL_PRIORITY_CLASS.
func NewCmdCtxLowPriority(ctx context.Context, arg string, args ...string) *exec.Cmd {
	return NewCmdCtx(ctx, arg, args...)
}

// KillCmd kills the entire process group on POSIX systems
func KillCmd(cmd *exec.Cmd) error {
	if cmd == nil || cmd.Process == nil {
		return nil
	}
	pgid, err := syscall.Getpgid(cmd.Process.Pid)
	if err == nil {
		return syscall.Kill(-pgid, syscall.SIGKILL)
	}
	return cmd.Process.Kill()
}
