//go:build windows

package transcoder

import "os/exec"

// setPgid is a no-op on Windows; process groups work differently here.
func setPgid(_ *exec.Cmd) {}

// killProcessGroup falls back to cmd.Process.Kill() on Windows since
// negative-PID signaling via syscall is not supported.
func killProcessGroup(cmd *exec.Cmd) {
	if cmd.Process == nil {
		return
	}
	_ = cmd.Process.Kill()
}
