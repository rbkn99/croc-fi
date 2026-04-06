# ProofLayer

**The trust, policy, and integration rail for Solana RWAs.**

Open infrastructure that helps tokenized real-world assets on Solana become:

- **verifiable** — anyone can inspect signed asset state
- **compliant** — transfer and access rules are enforced by code
- **DeFi-readable** — protocols can integrate RWAs through one standard interface

---

## Table of Contents

### English
1. [What ProofLayer Is](#what-prooflayer-is)
2. [The Simple Explanation](#the-simple-explanation)
3. [What Problem We Solve](#what-problem-we-solve)
4. [What We Are Building](#what-we-are-building)
5. [Core Components](#core-components)
6. [How the System Works](#how-the-system-works)
7. [Who the Product Is For](#who-the-product-is-for)
8. [Why This Can Win](#why-this-can-win)
9. [MVP Scope](#mvp-scope)
10. [Repository Structure](#repository-structure)
11. [Roadmap](#roadmap)

### Русская версия
12. [Что такое ProofLayer](#что-такое-prooflayer)
13. [Объяснение по-человечески](#объяснение-по-человечески)
14. [Какую проблему мы решаем](#какую-проблему-мы-решаем)
15. [Что именно мы строим](#что-именно-мы-строим)
16. [Из чего состоит система](#из-чего-состоит-система)
17. [Как это работает шаг за шагом](#как-это-работает-шаг-за-шагом)
18. [Для кого этот продукт](#для-кого-этот-продукт)
19. [Почему это может взлететь](#почему-это-может-взлететь)
20. [Что делаем в MVP](#что-делаем-в-mvp)

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

## What We Are Building

ProofLayer has three main layers.

```text
┌──────────────────────────────────────────────────────┐
│                DeFi Compatibility Layer             │
│   Collateral checks · health flags · SDK · indexer  │
├──────────────────────────────────────────────────────┤
│                    Policy Engine                     │
│  KYC tiers · jurisdiction rules · lockups · pauses   │
├──────────────────────────────────────────────────────┤
│                 Attestation Registry                 │
│ NAV · yield · proof hash · signer set · validity     │
└──────────────────────────────────────────────────────┘
```

### 1. Attestation Registry
A shared onchain registry where trusted parties publish facts about an asset.

Examples of data:
- NAV
- yield rate
- proof hash of custody or fund documents
- validity window
- signer identity
- optional asset status flags

### 2. Policy Engine
A programmable rule layer that defines how the asset behaves.

Examples of rules:
- transfer only to eligible wallets
- block transfers if attestation is stale
- pause the asset
- require a certain investor tier
- restrict redemption or secondary transfers

### 3. DeFi Compatibility Layer
A standard interface that DeFi protocols can read.

Examples:
- is this asset active?
- is its attestation fresh?
- what is its current reference value?
- is it allowed as collateral?
- what restrictions apply?

---

## Core Components

### A. Onchain programs

#### `proof_layer_registry`
Stores asset metadata and attestation records.

#### `proof_layer_policy`
Validates policy conditions during asset operations and transfers.

#### `proof_layer_issuance`
Handles mint/redeem logic for the reference asset implementation.

### B. Offchain services

#### Attestor service
A backend that signs and publishes asset updates.

Examples:
- update NAV daily
- update yield rate
- publish new proof hash
- mark stale or paused state when needed

#### Indexer / API
A read layer for frontend apps and DeFi integrations.

### C. Frontends

#### Issuer dashboard
Used by asset operators and attestors.

#### Wallet / integrator UI
Used to inspect asset state, rules, and eligibility.

---

## How the System Works

Example flow for a treasury-style asset:

1. An issuer creates a new RWA asset using ProofLayer.
2. The asset receives a registry record and policy configuration.
3. An attestor publishes NAV, yield, proof hash, and validity window.
4. A user receives or mints the asset.
5. If the user tries to transfer it, policy checks run.
6. A DeFi protocol reads the same asset state and decides whether to accept it as collateral.
7. If attestation becomes stale, transfers or collateral acceptance can be blocked according to policy.

The key point:

**the same asset state and policy are readable by multiple systems through one standard.**

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

## MVP Scope

The MVP should prove only the core thesis.

### Build now
- registry for one reference asset
- policy checks for transfers
- attestor service
- one treasury-like reference asset
- one DeFi-readable integration example

### Do not overbuild yet
- all asset classes
- full institutional suite
- every Token-2022 feature combination
- every possible DeFi integration

The first version only needs to prove:

> one standard can connect issuer trust data, policy enforcement, and DeFi readability.

---

## Repository Structure

```text
proof-layer/
├─ programs/
│  ├─ proof_layer_registry/      # asset and attestation state
│  ├─ proof_layer_policy/        # transfer / eligibility rules
│  ├─ proof_layer_issuance/      # reference mint/redeem logic
│  └─ shared/                    # shared enums, constants, types
├─ attestor/
│  └─ src/                       # attestor backend service
├─ sdk/
│  └─ src/                       # TS client for integrators
├─ app/
│  ├─ issuer/                    # issuer / operator dashboard
│  ├─ wallet/                    # asset inspection UI
│  └─ components/                # shared frontend components
├─ scripts/                      # setup, localnet, deployment, demos
├─ tests/                        # integration and end-to-end tests
└─ docs/                         # specs and design documents
```

---

## Roadmap

### Phase 1 — MVP
- single reference treasury-style asset
- registry + policy engine
- attestor service
- demo integration

### Phase 2 — Standardization
- SDK for protocols
- risk / health endpoints
- reusable policy templates
- richer attestation schema

### Phase 3 — Network effects
- multiple issuers
- multiple attestors
- real DeFi integrations
- production-grade control plane

---

# Русская версия

## Что такое ProofLayer

ProofLayer — это **инфраструктура**, а не фонд и не приложение для инвесторов.

Если совсем просто:

**мы строим общий слой для токенизированных реальных активов на Solana**.

Этот слой нужен, чтобы любой такой актив можно было:

- **проверить** — что с ним всё ок, кто это подтвердил и насколько данные свежие
- **ограничить правилами** — кто может держать, переводить или погашать
- **понять DeFi-протоколам** — можно ли брать этот актив как collateral и на каких условиях

То есть мы не делаем “ещё один токен”.
Мы делаем **стандартный рельс**, по которому такие токены могут нормально жить.

---

## Объяснение по-человечески

Смотри.

Допустим, кто-то хочет выпустить на Solana токен, который представляет реальный актив — например, казначейские облигации США.

Сразу возникают вопросы:

1. Откуда сеть и пользователи знают, сколько этот актив сейчас стоит?
2. Кто подтвердил, что он реально обеспечен?
3. Кто может им владеть, а кто не может?
4. Что делать, если данные устарели?
5. Как DeFi-протоколу понять, можно ли этот актив брать как залог?

Сейчас каждый проект отвечает на это по-своему.

Из-за этого получается бардак:

- у каждого свой формат данных
- у каждого свои правила
- у каждого свои костыли для интеграции
- DeFi не хочет интегрировать это всё по одному вручную

**Мы хотим сделать один понятный стандарт.**

Чтобы любой RWA-актив говорил с рынком на одном языке.

---

## Какую проблему мы решаем

Проблема не в том, что невозможно токенизировать актив.
Проблема в том, что нет нормального общего слоя между:

- эмитентом актива
- тем, кто подтверждает данные об активе
- DeFi-протоколом, который хочет этот актив использовать

Сейчас каждый RWA-проект делает свой собственный мини-мир.

А мы хотим сделать инфраструктуру, которая решает три вещи:

### 1. Attestation
Нужен единый способ публиковать факты об активе:
- стоимость
- доходность
- хэш документов
- срок актуальности
- кто подписал

### 2. Policy
Нужен единый способ описывать правила:
- кому можно владеть
- кому можно отправлять
- можно ли погашать
- устарели ли данные
- стоит ли актив на паузе

### 3. Integration
Нужен единый способ, чтобы DeFi понял:
- актив валиден или нет
- можно его брать как collateral или нет
- какие ограничения есть

---

## Что именно мы строим

Мы строим **три главных слоя**.

### 1. Attestation Registry
Это ончейн-реестр, где публикуются данные об активе.

Например:
- NAV
- доходность
- хэш офчейн-документа
- до какого момента эти данные считаются актуальными
- кто именно это подписал

Это нужно, чтобы любой внешний участник мог прочитать и проверить состояние актива.

### 2. Policy Engine
Это движок правил.

Он отвечает за то, что активу разрешено.

Например:
- можно ли переводить токен этому кошельку
- не устарела ли аттестация
- не поставлен ли актив на паузу
- нужен ли определённый KYC tier
- есть ли lockup

То есть это не просто “список разрешённых адресов”.
Это **логика поведения регулируемого актива**.

### 3. DeFi Compatibility Layer
Это слой совместимости с DeFi.

Он нужен, чтобы лендинги, AMM и другие протоколы могли единообразно читать состояние актива.

То есть вместо того, чтобы под каждый новый RWA писать отдельный адаптер, можно читать один и тот же стандарт.

---

## Из чего состоит система

Если грубо, в проекте будут такие части:

### Ончейн-программы
- `proof_layer_registry` — хранит состояние актива и аттестации
- `proof_layer_policy` — проверяет правила и ограничения
- `proof_layer_issuance` — отвечает за reference implementation выпуска и погашения

### Офчейн-сервисы
- `attestor service` — сервис, который обновляет NAV, доходность и другие данные
- `indexer / API` — слой чтения для интерфейсов и интеграций

### Интерфейсы
- `issuer dashboard` — для эмитента и оператора
- `wallet / inspector UI` — чтобы смотреть состояние актива и ограничения

---

## Как это работает шаг за шагом

Пример с treasury-like активом:

1. Эмитент создаёт новый актив через ProofLayer.
2. Для актива создаётся запись в реестре и конфиг правил.
3. Аттестатор публикует NAV, доходность, хэш документа и срок актуальности.
4. Пользователь получает или минтит токен.
5. При переводе токена проверяются правила.
6. DeFi-протокол читает те же самые данные из стандарта.
7. Если аттестация устарела, политика может запретить переводы или использование как collateral.

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

---

## Почему это может взлететь

Сильная версия проекта — это не “мы выпустили один актив”.

Сильная версия проекта — это:

- много эмитентов используют один стандарт
- много аттестаторов подписывают через один реестр
- много DeFi-протоколов читают один и тот же интерфейс

Тогда появляется network effect.

То есть чем больше активов живёт на этом рельсе, тем ценнее сам рельс.

---

## Что делаем в MVP

Чтобы не расползтись, в MVP надо делать только ядро.

### Делаем
- один реестр аттестаций
- один движок правил
- один reference treasury-like asset
- один attestor service
- одну демонстрационную интеграцию с DeFi

### Пока не делаем
- все виды RWA
- огромный enterprise-комбайн
- миллион фич Token-2022
- десять интеграций сразу

MVP нужен только для того, чтобы доказать простую мысль:

> один стандарт может связать эмитента, данные доверия и интеграцию с DeFi.
