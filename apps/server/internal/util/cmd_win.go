//go:build windows

package util

import (
	"context"
	"os/exec"
	"strconv"
	"syscall"
)

// NewCmd creates a new exec.Cmd object with the given arguments.
// Since for Windows, the app is built as a GUI application, we need to hide the console windows launched when running commands.
func NewCmd(arg string, args ...string) *exec.Cmd {
	//cmdPrompt := "C:\\Windows\\system32\\cmd.exe"
	//cmdArgs := append([]string{"/c", arg}, args...)
	//cmd := exec.Command(cmdPrompt, cmdArgs...)
	//cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	cmd := exec.Command(arg, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: 0x08000000,
		//HideWindow:    true,
	}
	return cmd
}

func NewCmdCtx(ctx context.Context, arg string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, arg, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		// 0x08000000 = CREATE_NO_WINDOW
		// 0x00000200 = CREATE_NEW_PROCESS_GROUP
		CreationFlags: 0x08000200,
	}
	return cmd
}

// NewCmdCtxLowPriority es como NewCmdCtx pero lanza el proceso con prioridad
// BELOW_NORMAL, para que trabajo de fondo (p. ej. el fingerprinting de skip
// detection) ceda CPU al transcode en tiempo real cuando compiten.
func NewCmdCtxLowPriority(ctx context.Context, arg string, args ...string) *exec.Cmd {
	cmd := exec.CommandContext(ctx, arg, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		// 0x08000000 = CREATE_NO_WINDOW
		// 0x00000200 = CREATE_NEW_PROCESS_GROUP
		// 0x00004000 = BELOW_NORMAL_PRIORITY_CLASS
		CreationFlags: 0x0800C200,
	}
	return cmd
}

// KillCmd kills the command process and all its children on Windows using taskkill
func KillCmd(cmd *exec.Cmd) error {
	if cmd == nil || cmd.Process == nil {
		return nil
	}
	// Use taskkill with /T (tree kill) and /F (force)
	killCmd := exec.Command("taskkill", "/F", "/T", "/PID", string([]byte(strconv.Itoa(cmd.Process.Pid))))
	killCmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: 0x08000000} // Hide window
	return killCmd.Run()
}
