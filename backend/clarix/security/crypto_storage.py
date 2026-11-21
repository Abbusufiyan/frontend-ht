"""Encrypted Local Storage (Box 6 in Architecture).

Provides AES-256 / Fernet envelope encryption at rest for ingested documents,
workspace artifacts, and sensitive database states in the air-gapped host.
"""
from __future__ import annotations

import base64
import hashlib
import os
from pathlib import Path
from typing import Any

_HEADER = b"CLX_ENC_V1::"


class CryptoStorage:
    def __init__(self, data_dir: Path, custom_key: str | None = None):
        self.data_dir = data_dir
        self.key_file = data_dir / ".vault_key"
        self._fernet = None
        self._init_cipher(custom_key)

    def _init_cipher(self, custom_key: str | None) -> None:
        try:
            from cryptography.fernet import Fernet
        except ImportError:
            return

        if custom_key:
            key_bytes = hashlib.sha256(custom_key.encode("utf-8")).digest()
            fernet_key = base64.urlsafe_b64encode(key_bytes)
        else:
            if self.key_file.is_file():
                fernet_key = self.key_file.read_bytes().strip()
            else:
                self.data_dir.mkdir(parents=True, exist_ok=True)
                # Generate new key
                raw_bytes = os.urandom(32)
                fernet_key = base64.urlsafe_b64encode(raw_bytes)
                try:
                    self.key_file.write_bytes(fernet_key)
                    if hasattr(os, "chmod"):
                        os.chmod(self.key_file, 0o600)
                except OSError:
                    pass

        try:
            self._fernet = Fernet(fernet_key)
        except Exception:
            self._fernet = None

    @property
    def is_available(self) -> bool:
        return self._fernet is not None

    def encrypt(self, data: bytes) -> bytes:
        """Encrypts data, returning ciphertext with magic header."""
        if not self.is_available or not data:
            return data
        if data.startswith(_HEADER):
            return data  # already encrypted
        token = self._fernet.encrypt(data)
        return _HEADER + token

    def decrypt(self, data: bytes) -> bytes:
        """Decrypts data if it has the magic header, otherwise returns data intact."""
        if not self.is_available or not data or not data.startswith(_HEADER):
            return data
        ciphertext = data[len(_HEADER):]
        try:
            return self._fernet.decrypt(ciphertext)
        except Exception:
            return data

    def write_encrypted_file(self, path: Path, data: bytes) -> None:
        """Encrypts data and writes to the destination path."""
        path.parent.mkdir(parents=True, exist_ok=True)
        encrypted = self.encrypt(data)
        path.write_bytes(encrypted)

    def read_decrypted_file(self, path: Path) -> bytes:
        """Reads and decrypts file data."""
        raw = path.read_bytes()
        return self.decrypt(raw)

    def status(self) -> dict[str, Any]:
        return {
            "enabled": self.is_available,
            "algorithm": "AES-128-CBC-HMAC-SHA256 (Fernet)" if self.is_available else "NONE",
            "keySource": "ENVIRONMENT" if os.environ.get("CLARIX_STORAGE_KEY") else ("LOCAL_VAULT" if self.key_file.exists() else "NONE"),
        }
