# Clarix AI — Air-Gapped Deployment Guide

This guide details the procedure for deploying Clarix AI onto a physically isolated, air-gapped host with zero external internet connectivity.

---

## 1. Staging & Asset Preparation

Because the target host cannot access the internet, all software dependencies and models must be prepared on an internet-connected staging machine and transferred via secure write-once media (USB or optical disc).

### 1.1 Download Language Models (Ollama)
On the staging machine:
```bash
# Pull LLM for reasoning
ollama pull llama3
# Pull embedding model for vector RAG
ollama pull nomic-embed-text

# Archive the model directory
tar -czvf ollama-models.tar.gz -C ~/.ollama/models .
```

### 1.2 Package Python Wheels & Node Build
On the staging machine:
```bash
# Backend dependencies
pip download -r backend/requirements.txt -d ./pip-packages

# Frontend production build
cd frontend
npm install
npm run build
tar -czvf frontend-dist.tar.gz dist/
```

---

## 2. Target Host Installation

Transfer `ollama-models.tar.gz`, `pip-packages/`, and `frontend-dist.tar.gz` to `/opt/clarix/` on the isolated host.

### 2.1 Set Up Ollama
```bash
mkdir -p ~/.ollama/models
tar -xzvf ollama-models.tar.gz -C ~/.ollama/models

# Configure Ollama to bind to loopback ONLY
export OLLAMA_HOST=127.0.0.1:11434
systemctl enable --now ollama
```

### 2.2 Install Backend
```bash
cd /opt/clarix/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --no-index --find-links=/opt/clarix/pip-packages -r requirements.txt
cp .env.example .env
```

---

## 3. Kernel & OS-Level Host Isolation

Defense-in-depth requires that the host operating system strictly prohibits external network connectivity independently of the application layer.

### 3.1 Option A: `nftables` (Recommended for Linux 5.x+)
Install [deploy/nftables-airgap.conf](file:///c:/Users/suhas/Desktop/clarix-ai/backend/deploy/nftables-airgap.conf):
```bash
sudo cp backend/deploy/nftables-airgap.conf /etc/nftables.conf
sudo systemctl enable --now nftables
```

### 3.2 Option B: `iptables`
Execute [deploy/iptables-airgap.sh](file:///c:/Users/suhas/Desktop/clarix-ai/backend/deploy/iptables-airgap.sh):
```bash
sudo bash backend/deploy/iptables-airgap.sh
```

### 3.3 Option C: `pf` (macOS / BSD)
Load [deploy/pf-airgap.conf](file:///c:/Users/suhas/Desktop/clarix-ai/backend/deploy/pf-airgap.conf):
```bash
sudo pfctl -ef backend/deploy/pf-airgap.conf
```

---

## 4. Hardened Systemd Service

Install the hardened systemd unit from [deploy/clarix.service](file:///c:/Users/suhas/Desktop/clarix-ai/backend/deploy/clarix.service):
```ini
[Unit]
Description=Clarix AI backend (air-gapped agent harness)
After=network.target ollama.service

[Service]
User=clarix
Group=clarix
WorkingDirectory=/opt/clarix/backend
ExecStart=/opt/clarix/backend/.venv/bin/python -m clarix
Restart=on-failure

# Kernel-enforced cgroup network filtering
IPAddressDeny=any
IPAddressAllow=localhost

# Sandboxing
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ReadWritePaths=/opt/clarix/backend/data
```

Activate the service:
```bash
sudo cp backend/deploy/clarix.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now clarix
```

---

## 5. Verification & Air-Gap Probing

Run the independent verification script [deploy/verify_airgap.sh](file:///c:/Users/suhas/Desktop/clarix-ai/backend/deploy/verify_airgap.sh):
```bash
bash backend/deploy/verify_airgap.sh
```

Expected output on a properly isolated host:
```text
== default route ==
none
== established non-loopback sockets ==
none
== active connection attempts ==
unreachable: 1.1.1.1:443
unreachable: 8.8.8.8:53
== Clarix self-report ==
guard: {'installed': True, 'enforcing': True} | posture: ISOLATED | ollama: {'reachable': True}
RESULT: no outbound reachability found
```
