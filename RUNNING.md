# ProofLayer — Full Stack Launch Guide

## Prerequisites

### 1. Rust + Solana CLI + Anchor

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Solana CLI (v2.1+)
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify
solana --version

# Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli

# Verify
anchor --version
```

### 2. Node.js 20+ & Yarn

```bash
# Node (if not installed)
brew install node@20

# Yarn (used by Anchor)
npm install -g yarn
```

### 3. Generate a local Solana keypair

```bash
solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json
solana config set --url localhost
```

---

## Step-by-step launch

### Terminal 1 — Local Validator

```bash
solana-test-validator --reset
```

Leave it running. This starts a local Solana cluster at `http://127.0.0.1:8899`.

### Terminal 2 — Build & Deploy On-chain Programs

```bash
cd program

# Install JS deps (for tests and Codama codegen)
yarn install

# Build the Anchor programs
NO_DNA=1 anchor build

# Deploy to localnet
NO_DNA=1 anchor deploy

# Note the deployed program IDs from output — should match Anchor.toml:
#   proof_layer = croZ9hcrqGz3fZHTkBfEaRbZQXkhfW4ZhbVBiFinNrF
#   proof_layer_hook = hok77RhLaScwvc4Fsk3EU7DKBzGK1oEeUcMWnodnwQJ
```

After deploy, airdrop SOL to your wallet:

```bash
solana airdrop 10
```

### Terminal 2 (continued) — Run Anchor Tests

```bash
NO_DNA=1 anchor test --skip-local-validator
```

This runs the test suite against the already-running local validator.

### Terminal 3 — Backend API

```bash
cd backend

# Install dependencies
npm install

# Create env file
cp .env.example .env

# Edit .env — set for localnet:
#   SOLANA_CLUSTER=devnet
#   SOLANA_RPC_URL=http://127.0.0.1:8899
#   API_PORT=3001
#   KYC_PROVIDER=manual

# Generate keypairs for attestor and issuer
mkdir -p .keys
solana-keygen new --no-bip39-passphrase -o .keys/attestor.json --force
solana-keygen new --no-bip39-passphrase -o .keys/issuer.json --force

# Airdrop SOL to them
solana airdrop 5 $(solana-keygen pubkey .keys/attestor.json) --url http://127.0.0.1:8899
solana airdrop 5 $(solana-keygen pubkey .keys/issuer.json) --url http://127.0.0.1:8899

# Build
npm run build

# Start API
npm run dev:api
```

API runs on `http://localhost:3001`.

### Terminal 4 — Frontend

```bash
cd frontend

# Install dependencies (if not done)
npm install

# Create env file
echo 'NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1' > .env.local
echo 'NEXT_PUBLIC_SOLANA_CLUSTER=devnet' >> .env.local
echo 'NEXT_PUBLIC_SOLANA_RPC_URL=http://127.0.0.1:8899' >> .env.local

# Start dev server
npm run dev
```

Frontend runs on `http://localhost:3000`.

---

## All terminals at a glance

| Terminal | Directory | Command | Port |
|----------|-----------|---------|------|
| 1 | (anywhere) | `solana-test-validator --reset` | 8899 (RPC) |
| 2 | `program/` | `anchor build && anchor deploy` | — |
| 3 | `backend/` | `npm run dev:api` | 3001 |
| 4 | `frontend/` | `npm run dev` | 3000 |

---

## What you see

1. **http://localhost:3000** — ProofLayer frontend
   - `/products` — list of RWA products
   - `/products/mtbill-sol` — invest/redeem page with KYC flow
   - `/admin` — issuer dashboard

2. **http://localhost:3001/api/v1/health** — backend health check
   - Returns `{ "status": "ok", "cluster": "devnet", "kycProvider": "manual" }`

3. **Local validator** — Solana programs deployed with:
   - `proof_layer` — registry, attestations, whitelist, mint/redeem
   - `proof_layer_hook` — transfer hook enforcing compliance

---

## Quick test flow (after all terminals running)

### 1. Create asset on-chain (via Anchor test or script)

The Anchor test suite in `program/tests/program.ts` exercises the full flow.

### 2. Test KYC flow via API

```bash
# Start KYC for a wallet (manual mode = auto-approve)
curl -X POST http://localhost:3001/api/v1/kyc/start \
  -H "Content-Type: application/json" \
  -d '{"wallet": "YourWalletPubkeyHere"}'

# Check status
curl http://localhost:3001/api/v1/kyc/status/YourWalletPubkeyHere

# View all KYC records
curl http://localhost:3001/api/v1/kyc/list

# KYC summary
curl http://localhost:3001/api/v1/issuer/kyc-summary
```

### 3. Test in frontend

- Open http://localhost:3000
- Connect wallet (Phantom/Solflare)
- Go to any product → click "Get Access" → starts KYC
- In manual mode, KYC auto-approves via webhook
- Admin dashboard at `/admin` shows KYC pipeline stats

---

## Devnet deployment

To deploy to devnet instead of localnet:

```bash
# Switch Solana CLI to devnet
solana config set --url devnet

# Airdrop SOL
solana airdrop 5

# In program/Anchor.toml, change:
#   [provider]
#   cluster = "devnet"

# Deploy
cd program
NO_DNA=1 anchor build
NO_DNA=1 anchor deploy --provider.cluster devnet

# In backend/.env, change:
#   SOLANA_CLUSTER=devnet
#   SOLANA_RPC_URL=https://api.devnet.solana.com

# In frontend/.env.local, change:
#   NEXT_PUBLIC_SOLANA_CLUSTER=devnet
#   NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `solana-test-validator` not found | Install Solana CLI (see Prerequisites) |
| `anchor: command not found` | `cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli` |
| Programs fail to deploy | Make sure validator is running, `solana airdrop 10` |
| Frontend can't connect to backend | Check `NEXT_PUBLIC_API_URL` in `.env.local` matches backend port |
| Wallet won't connect on localhost | Use `http://localhost:3000`, not `127.0.0.1` |
| Backend: "Issuer keypair not found" | Run the `solana-keygen new` commands from Terminal 3 setup |
