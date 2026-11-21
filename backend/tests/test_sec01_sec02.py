import os
import tempfile
import unittest
from pathlib import Path

from clarix.config import ConfigError, Settings
from clarix.context import Context
from clarix.tools import sandbox as sb
from tests.helpers import Env


class Sec01AuthTests(unittest.TestCase):
    def test_ephemeral_token_generated_when_unset_and_not_demo(self):
        # Empty env -> ephemeral 32-byte token generated
        s = Settings.from_env(env={"CLARIX_HOST": "127.0.0.1"})
        self.assertTrue(s.auth_enabled)
        self.assertIsNotNone(s.ephemeral_token)
        self.assertGreaterEqual(len(s.ephemeral_token), 32)
        self.assertIn(s.ephemeral_token, s.api_tokens)
        self.assertFalse(s.demo_auth_relaxed)

    def test_explicit_api_token_used_when_set(self):
        s = Settings.from_env(env={"CLARIX_API_TOKEN": "my-secret-token-1234567890"})
        self.assertTrue(s.auth_enabled)
        self.assertIsNone(s.ephemeral_token)
        self.assertIn("my-secret-token-1234567890", s.api_tokens)

    def test_demo_mode_on_loopback_relaxes_auth(self):
        s = Settings.from_env(env={"CLARIX_DEMO_MODE": "1", "CLARIX_HOST": "127.0.0.1"})
        self.assertFalse(s.auth_enabled)
        self.assertIsNone(s.ephemeral_token)
        self.assertTrue(s.demo_mode)
        self.assertTrue(s.demo_auth_relaxed)

    def test_demo_mode_on_non_loopback_still_requires_auth(self):
        s = Settings.from_env(env={
            "CLARIX_DEMO_MODE": "1",
            "CLARIX_HOST": "192.168.1.100",
            "CLARIX_ALLOW_NON_LOOPBACK": "1"
        })
        self.assertTrue(s.auth_enabled)
        self.assertIsNotNone(s.ephemeral_token)
        self.assertFalse(s.demo_auth_relaxed)


class Sec02SandboxEgressTests(unittest.TestCase):
    def setUp(self):
        self.ws = Path(tempfile.mkdtemp())

    def test_blocks_known_network_binaries(self):
        blocked = ["curl", "wget", "nc", "ncat", "telnet", "ssh", "scp", "ftp", "powershell", "certutil", "bitsadmin"]
        for b in blocked:
            with self.assertRaises(sb.ToolError, msg=f"Binary {b} should be blocked"):
                sb.run_command(self.ws, f"{b} http://127.0.0.1")

    def test_blocks_powershell_web_cmdlets(self):
        with self.assertRaises(sb.ToolError):
            sb.run_command(self.ws, "uname Invoke-WebRequest")
        with self.assertRaises(sb.ToolError):
            sb.run_command(self.ws, "date iwr")

    def test_blocks_ping_to_non_loopback(self):
        with self.assertRaises(sb.ToolError):
            sb.run_command(self.ws, "ping 8.8.8.8")
        with self.assertRaises(sb.ToolError):
            sb.run_command(self.ws, "ping evil.example.com")

    def test_blocks_arguments_containing_non_loopback_urls(self):
        with self.assertRaises(sb.ToolError):
            sb.run_command(self.ws, "uname -s http://evil.example.com/exfil")
        with self.assertRaises(sb.ToolError):
            sb.run_command(self.ws, "date https://192.168.1.50/data")

    def test_blocks_arguments_containing_non_loopback_ips(self):
        with self.assertRaises(sb.ToolError):
            sb.run_command(self.ws, "uname 93.184.216.34")


if __name__ == "__main__":
    unittest.main()
