# ProofLayer

**The trust, policy, and integration rail for Solana RWAs.**

Open infrastructure that helps tokenized real-world assets on Solana become:

- **verifiable** — anyone can inspect signed asset state
- **compliant** — transfer and access rules are enforced by code
- **DeFi-readable** — protocols can integrate RWAs through one standard interface


---

# English

## What ProofLayer Is

ProofLayer is **infrastructure**, not a fund and not a consumer app.

It is a shared layer for real-world assets on Solana that standardizes three things:

1. **asset attestations**
2. **asset policy / compliance rules**
3. **DeFi integration signals**

You can think of it like this:

- if an issuer wants to bring a treasury product onchain, ProofLayer gives them the trust and policy rails
- if an attestor wants to publish verified asset state, ProofLayer gives them the standard format
- if a DeFi protocol wants to accept an RWA as collateral, ProofLayer gives it a standard interface to read

In one sentence:

> ProofLayer is the trust and policy rail that makes Solana RWAs legible to both institutions and DeFi.

---

## The Simple Explanation

Here is the simplest possible explanation.

Today, when someone puts a real-world asset onchain, three questions immediately appear:

- **Is this asset real and what is it worth right now?**
- **Who is allowed to hold or receive it?**
- **Can DeFi safely use it?**

Most projects answer these questions in a custom way.
That means every new asset becomes its own isolated system.

ProofLayer creates one shared standard so these questions can be answered the same way across many assets.

So the project is basically:

- a place to publish trusted asset facts
- a rule engine for what the asset allows
- a compatibility layer so DeFi protocols can understand the asset

---

## What Problem We Solve

Most RWA projects are vertical products.

They issue one specific asset and build all required infrastructure around it themselves.
That is expensive, slow, and hard to integrate.

The main problems are:

### 1. No common trust format
Every issuer has its own way to publish NAV, yield, proof of reserves, or validity windows.
Protocols cannot reuse the same logic across assets.

### 2. No standard policy layer
Compliance is often handled offchain or with very basic restrictions.
There is no shared programmable framework for regulated asset behavior.

### 3. No common DeFi interface
A lending protocol does not just need a price.
It needs to know if the asset is active, fresh, restricted, and safe enough for collateral usage.

### 4. Too much repeated work
Each issuer, each integrator, and each protocol keeps rebuilding similar infrastructure.

ProofLayer reduces that repetition by offering a common rail.

---

## Who the Product Is For

### Issuers
They want to bring an asset onchain without building a whole proprietary trust and compliance stack.

### Attestors
They want a standard way to publish and sign asset state.

### DeFi protocols
They want a reusable way to understand RWA validity instead of integrating each asset manually.

### Institutional operators
They want visibility, control, auditability, and policy management.

---

## Why This Can Win

ProofLayer is strongest if it becomes a **standard**, not just a codebase.

Its moat comes from:

- many issuers publishing through the same registry
- many attestors using the same format
- many DeFi protocols integrating the same interface
- shared policy templates
- historical attestation data and trust graph

The goal is not to own one asset.
The goal is to become the default rail many assets use.

---

Главный смысл:

**у актива появляется единый машиночитаемый интерфейс для доверия и правил.**

---

## Для кого этот продукт

### Для эмитентов
Чтобы не писать с нуля свой закрытый compliance/oracle stack.

### Для аттестаторов
Чтобы подписывать данные в одном стандартном формате.

### Для DeFi-протоколов
Чтобы интегрировать RWA по одному интерфейсу, а не каждый раз вручную.

### Для институциональных операторов
Чтобы иметь контроль, прозрачность и управляемые правила.
