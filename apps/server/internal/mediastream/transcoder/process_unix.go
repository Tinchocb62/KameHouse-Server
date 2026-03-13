//go:build !windows

package transcoder

import (
	"os/exec"
	"syscall"
)

// setPgid puts the child process in its own process group (Linux/macOS).
// This ensures that a SIGKILL directed at -pid hits the entire subtree.
func setPgid(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
}

// killProcessGroup sends SIGKILL to the process group identified by -pid,
// which terminates ffmpeg and any worker sub-processes it spawned.
func killProcessGroup(cmd *exec.Cmd) {
	if cmd.Process == nil {
		return
	}
	// Negative PID targets the entire process group.
	_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
}
