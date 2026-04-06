# ProofLayer

---

## 🇬🇧 ENGLISH

---

### One-liner

**ProofLayer is the issuance infrastructure for yield-bearing, compliant real-world asset tokens on Solana — letting any institution launch a tokenized treasury product with native yield accrual, KYC enforcement, and live DeFi integrations in one unified stack.**

---

### The Problem

Tokenized real-world assets are the fastest growing category in crypto — over $20B on-chain globally — but nearly all of it is on Ethereum, issued by a handful of large players like Midas, Ondo, and OpenEden. Solana has $350M in tokenized assets. That's 1.7% of the market, on a chain that has 10x cheaper fees, sub-second finality, and a thriving DeFi ecosystem.

Why is Solana so far behind? Not because of demand. Because the infrastructure to issue RWA tokens *properly* doesn't exist.

Current RWA tokens on Solana share three structural flaws:

**1. No native yield.** Yield is distributed via manual rebasing or off-chain cron jobs. This breaks DeFi integrations, creates stale NAV, and introduces operational risk. Every project rebuilds this from scratch.

**2. No programmable compliance.** KYC is enforced off-chain, through centralized relayers, or not at all. When a DeFi protocol wants to accept an RWA token as collateral, they can't verify whether the counterparty is compliant, whether the asset is still valid, or whether the issuer has paused it.

**3. No DeFi composability.** Existing Solana RWA tokens sit in wallets. They don't plug into Kamino, Drift, or Meteora because those protocols can't read the asset's state. The token exists but the ecosystem can't use it.

The result: issuers build isolated products. DeFi protocols ignore them. Institutional capital stays on the sidelines.

---

### The Solution

ProofLayer is a three-layer stack that solves all three problems at once:

```
┌──────────────────────────────────────────────────┐
│              DeFi Integrations                   │
│        Kamino · Drift · Meteora · Jupiter        │
├──────────────────────────────────────────────────┤
│           RWA Token (Token-2022)                 │
│   Interest-Bearing · Confidential · Whitelisted  │
├──────────────────────────────────────────────────┤
│           ProofLayer Infrastructure              │
│  Attestation Registry · Transfer Hook · Oracle   │
└──────────────────────────────────────────────────┘
```

**Layer 1 — ProofLayer Core (the infrastructure)**
An on-chain registry where asset issuers publish verifiable attestations: NAV, yield rate, proof hash, custodian signature, freshness window. These are machine-readable trust anchors — any program on Solana can query them.

**Layer 2 — Compliant Yield Token (the product)**
A Token-2022 token with three extensions active simultaneously:
- `InterestBearingMint` — yield rate is set on-chain from the attestation, balance accrues in real time with no rebasing
- `TransferHook` — every transfer calls the ProofLayer hook program, which enforces KYC whitelist, asset pause status, and attestation freshness
- `ConfidentialTransfer` — institutional holders can transfer without exposing balances on-chain

**Layer 3 — DeFi Integration (the distribution)**
- **Jupiter**: accept any SPL token for minting (SOL → USDC → mTBILL in one transaction)
- **Kamino**: accept ProofLayer-attested tokens as collateral, dynamically priced via the attestation registry
- **Meteora**: CLMM pool between the RWA token and USDC for on-chain liquidity without fiat redemption

---

### Why Solana, Why Now

| Feature | Ethereum / EVM | Solana |
|---|---|---|
| Native yield accrual | Manual rebase or wrapper | Token-2022 `InterestBearingMint` |
| Compliance enforcement | Centralized relayer | Token-2022 `TransferHook` (on-chain) |
| Institutional privacy | Public by default | Token-2022 `ConfidentialTransfer` |
| Fee per transfer | $2–20 | <$0.001 |
| Settlement finality | 12 seconds | 400ms |

The `InterestBearingMint` extension alone is a fundamental improvement over Midas's EVM model. Yield accrues natively in the token — no rebasing, no wrappers, no broken DeFi integrations. This has never been properly used for RWA issuance on Solana.

---

### Business Model

ProofLayer earns at the infrastructure layer, not the product layer:

- **Issuance fee**: 0.1% of TVL on assets issued using ProofLayer infrastructure
- **Protocol fee**: 5bps on all DeFi integrations (collateral use, LP fees routed through the hook)
- **Attestor marketplace** (long-term): institutions pay to become recognized attestors; attestation consumers pay per verified read

The first product — a tokenized US Treasury token (`mTBILL-SOL`) — is both the proof-of-concept and the first revenue-generating deployment. Once live, any other institution can deploy their own product on the same infrastructure.

---

## Project Details

---

### Technical Architecture

#### Program 1: ProofLayer Registry

```
AssetRegistry account:
  - issuer: Pubkey
  - attestor: Pubkey
  - asset_type: Enum (Treasury, CorporateBond, MoneyMarket, Commodity)
  - status: Enum (Active, Paused, Redeemed)
  - created_at: i64

AttestationRecord account:
  - asset: Pubkey
  - nav_bps: u64          // NAV in basis points (10000 = 1.00)
  - yield_rate_bps: u64   // Annual yield in bps (500 = 5%)
  - proof_hash: [u8; 32]  // Hash of off-chain custody proof
  - valid_until: i64      // Freshness window
  - attestor_sig: [u8; 64]
  - published_at: i64
```

Instructions: `create_asset`, `publish_attestation`, `pause_asset`, `add_to_whitelist`, `remove_from_whitelist`

---

#### Program 2: Transfer Hook

Called by Token-2022 on every transfer. Validates three conditions:

```rust
pub fn transfer_hook(ctx: Context<TransferHook>, amount: u64) -> Result<()> {
    // 1. Asset must not be paused
    require!(asset.status == AssetStatus::Active, ErrorCode::AssetPaused);

    // 2. Attestation must be fresh
    let now = Clock::get()?.unix_timestamp;
    require!(attestation.valid_until > now, ErrorCode::StaleAttestation);

    // 3. Recipient must be whitelisted
    require!(
        whitelist.contains(&ctx.accounts.destination_authority.key()),
        ErrorCode::NotWhitelisted
    );

    Ok(())
}
```

If any condition fails, the transfer reverts on-chain. No relayer. No trusted intermediary.

---

#### Program 3: Token Issuance

```
mint_rwa_token:
  - Accepts USDC from user
  - Verifies active attestation from registry
  - Mints Token-2022 token with current yield rate
  - Records mint in issuance ledger

redeem_rwa_token:
  - Burns Token-2022 token
  - Queues redemption request (settled T+1 off-chain via custodian)
  - Emits RedemptionQueued event for off-chain processor
```

---

#### Off-chain Attestor Service

A lightweight Node.js service run by the issuer or a designated attestor:

```
Every 24h (or on significant NAV change):
  1. Fetch T-bill rate from Treasury Direct API / Pyth SOFR feed
  2. Compute new NAV from custodian data
  3. Hash custody proof document
  4. Sign attestation with attestor keypair
  5. Call publish_attestation on-chain
  6. Update InterestBearingMint rate to match new yield
```

In production: replace single attestor with 2-of-3 multisig (issuer + custodian + independent auditor). For the hackathon MVP: single attestor is sufficient; multi-sig design is documented.

---

#### Token-2022 Configuration

```typescript
const extensions = [
  {
    extension: 'interestBearingConfig',
    state: {
      rateAuthority: attestorKeypair.publicKey,
      currentRate: 500, // 5.00% APY in bps, updated by attestor
    }
  },
  {
    extension: 'transferHook',
    state: {
      authority: issuerKeypair.publicKey,
      programId: PROOF_LAYER_HOOK_PROGRAM_ID,
    }
  },
  {
    extension: 'confidentialTransferMint',
    state: {
      authority: issuerKeypair.publicKey,
      autoApproveNewAccounts: false,
    }
  },
]
```

---

### MVP Demo Flow

The complete end-to-end story a judge sees:

```
1. ISSUER creates a Treasury asset in ProofLayer registry
   → Asset account created on-chain, attestor assigned

2. ATTESTOR publishes attestation
   → NAV = 1.0023, yield = 5.00%, proof hash, valid 24h
   → InterestBearingMint rate updated to 500bps

3. USER mints 1000 mTBILL-SOL
   → Deposits 1000 USDC
   → Receives 1000 mTBILL-SOL tokens
   → Wallet shows balance growing in real time

4. USER attempts transfer to non-whitelisted wallet
   → Transfer hook rejects on-chain: "NotWhitelisted"

5. USER transfers to whitelisted wallet
   → Succeeds. Hook confirms: active asset, fresh attestation, whitelisted recipient

6. ATTESTOR lets attestation expire (demo fast-forward)
   → Transfer attempted → rejected: "StaleAttestation"
   → Attestor publishes fresh attestation → transfer succeeds

7. KAMINO integration (mock)
   → Protocol reads ProofLayer attestation for NAV
   → Accepts mTBILL-SOL as collateral at 98% LTV
   → User borrows USDC against their yield-bearing T-bill position
```

Steps 1–6 are fully on-chain. Step 7 is a mock integration demonstrating the composability story.

---

### Tech Stack

| Component | Technology |
|---|---|
| On-chain programs | Rust + Anchor |
| Token standard | Token-2022 (InterestBearing + TransferHook + ConfidentialTransfer) |
| Attestor service | Node.js + @solana/web3.js |
| Yield rate source | Pyth SOFR feed / Treasury Direct API |
| Frontend | Next.js + Wallet Adapter |
| DeFi integration | Jupiter SDK (smart minting), Kamino SDK (collateral mock) |
| Testing | Anchor tests + Bankrun |

---

### MVP Scope

| Component | Status |
|---|---|
| ProofLayer registry program | Ship |
| Transfer hook program | Ship |
| Token-2022 issuance program | Ship |
| Attestor service (single signer) | Ship |
| Frontend: issuer dashboard | Ship |
| Frontend: user wallet (accruing balance) | Ship |
| Jupiter smart minting | Ship |
| Kamino integration | Mock |
| Multi-sig attestor | Documented, not implemented |
| Fiat redemption | Documented, not implemented |

---

### Competitive Position

Based on analysis of 204 RWA projects in the Colosseum hackathon database:

- **Fact Finance** built the oracle layer. ProofLayer builds the policy engine that *consumes* oracle data and enforces it on-chain.
- **TOKERA** built an attestation dashboard for investors. ProofLayer builds on-chain attestations that token transfers *depend on*.
- **ORO / Grains / NOTE Protocol** built vertical products without infrastructure. ProofLayer builds both.
- **No project** has used Token-2022's `InterestBearingMint` + `TransferHook` + `ConfidentialTransfer` together for RWA issuance.

---

---

## 🇷🇺 РУССКИЙ

---

### Одна строка

**ProofLayer — инфраструктура для выпуска доходных, соответствующих нормативам токенов реальных активов на Solana: любой институт может запустить токенизированный казначейский продукт с нативным начислением доходности, KYC-проверкой и DeFi-интеграциями в едином стеке.**

---

### Проблема

Токенизированные реальные активы (RWA) — самая быстрорастущая категория в крипто. Более $20 млрд размещено на блокчейне, но почти всё это Ethereum: Midas, Ondo, OpenEden. На Solana — только $350 млн, то есть 1,7% рынка, при том что у Solana комиссии в 10 раз ниже, финальность меньше секунды и развитая DeFi-экосистема.

Почему Solana так сильно отстаёт? Не из-за отсутствия спроса. Из-за отсутствия инфраструктуры для *правильного* выпуска RWA-токенов.

Все существующие RWA-токены на Solana имеют три системных недостатка:

**1. Нет нативной доходности.** Yield распределяется через ручной ребейсинг или офчейн-кронджобы. Это ломает DeFi-интеграции, создаёт устаревшие NAV и несёт операционные риски. Каждый проект строит это с нуля.

**2. Нет программируемого комплаенса.** KYC применяется офчейн, через централизованные релаеры, или вовсе отсутствует. DeFi-протокол, желающий принять RWA-токен как залог, не может ончейн проверить: прошёл ли контрагент KYC, действителен ли актив, не заморожен ли выпуск.

**3. Нет DeFi-компонуемости.** Существующие RWA-токены на Solana лежат в кошельках. Они не подключаются к Kamino, Drift или Meteora — эти протоколы не умеют читать состояние актива. Токен существует, но экосистема не может им пользоваться.

Итог: эмитенты создают изолированные продукты. DeFi-протоколы их игнорируют. Институциональный капитал остаётся в стороне.

---

### Решение

ProofLayer — трёхслойный стек, который решает все три проблемы одновременно:

```
┌──────────────────────────────────────────────────┐
│              DeFi-интеграции                     │
│        Kamino · Drift · Meteora · Jupiter        │
├──────────────────────────────────────────────────┤
│           RWA-токен (Token-2022)                 │
│  Доходный · Конфиденциальный · Белый список      │
├──────────────────────────────────────────────────┤
│         Инфраструктура ProofLayer                │
│  Реестр аттестаций · Transfer Hook · Оракул      │
└──────────────────────────────────────────────────┘
```

**Слой 1 — ProofLayer Core (инфраструктура)**
Ончейн-реестр, в котором эмитенты активов публикуют верифицируемые аттестации: NAV, ставка доходности, хэш доказательства, подпись кастодиана, окно актуальности. Это машиночитаемые якоря доверия — любая программа на Solana может их запросить.

**Слой 2 — Compliant Yield Token (продукт)**
Token-2022 токен с тремя одновременно активными расширениями:
- `InterestBearingMint` — ставка доходности устанавливается ончейн из аттестации, баланс начисляется в реальном времени без ребейсинга
- `TransferHook` — каждый трансфер вызывает хук-программу ProofLayer, которая проверяет KYC-вайтлист, статус паузы актива и актуальность аттестации
- `ConfidentialTransfer` — институциональные держатели могут переводить токены без раскрытия балансов ончейн

**Слой 3 — DeFi-интеграция (дистрибуция)**
- **Jupiter**: принимает любой SPL-токен для минтинга (SOL → USDC → mTBILL в одной транзакции)
- **Kamino**: принимает аттестованные ProofLayer токены как залог с динамической ценой из реестра аттестаций
- **Meteora**: CLMM-пул между RWA-токеном и USDC для ликвидности без фиатного погашения

---

### Почему Solana, почему сейчас

| Функция | Ethereum / EVM | Solana |
|---|---|---|
| Нативное начисление доходности | Ручной ребейсинг или враппер | Token-2022 `InterestBearingMint` |
| Применение комплаенса | Централизованный релаер | Token-2022 `TransferHook` (ончейн) |
| Институциональная приватность | Публично по умолчанию | Token-2022 `ConfidentialTransfer` |
| Комиссия за трансфер | $2–20 | <$0.001 |
| Финальность расчётов | 12 секунд | 400мс |

Расширение `InterestBearingMint` само по себе является фундаментальным улучшением над моделью Midas на EVM. Доходность начисляется нативно в токене — без ребейсинга, без врапперов, без сломанных DeFi-интеграций. Этот подход ещё ни разу не был правильно применён для RWA-выпуска на Solana.

---

### Бизнес-модель

ProofLayer зарабатывает на инфраструктурном уровне, а не на продуктовом:

- **Комиссия за выпуск**: 0,1% от TVL активов, выпущенных с использованием инфраструктуры ProofLayer
- **Протокольная комиссия**: 5 б.п. со всех DeFi-интеграций (использование залога, LP-комиссии через хук)
- **Маркетплейс аттестаций** (долгосрочно): институты платят за статус признанного аттестора; потребители аттестаций платят за каждое верифицированное чтение

Первый продукт — токенизированный US Treasury токен (`mTBILL-SOL`) — одновременно является proof-of-concept и первым доходным развёртыванием. После запуска любой институт может выпустить свой продукт на той же инфраструктуре.

---

## Детали проекта

---

### Техническая архитектура

#### Программа 1: Реестр ProofLayer

```
Аккаунт AssetRegistry:
  - issuer: Pubkey
  - attestor: Pubkey
  - asset_type: Enum (Treasury, CorporateBond, MoneyMarket, Commodity)
  - status: Enum (Active, Paused, Redeemed)
  - created_at: i64

Аккаунт AttestationRecord:
  - asset: Pubkey
  - nav_bps: u64          // NAV в базисных пунктах (10000 = 1.00)
  - yield_rate_bps: u64   // Годовая доходность в б.п. (500 = 5%)
  - proof_hash: [u8; 32]  // Хэш офчейн-доказательства кастодии
  - valid_until: i64      // Окно актуальности
  - attestor_sig: [u8; 64]
  - published_at: i64
```

Инструкции: `create_asset`, `publish_attestation`, `pause_asset`, `add_to_whitelist`, `remove_from_whitelist`

---

#### Программа 2: Transfer Hook

Вызывается Token-2022 при каждом трансфере. Проверяет три условия:

```rust
pub fn transfer_hook(ctx: Context<TransferHook>, amount: u64) -> Result<()> {
    // 1. Актив не должен быть на паузе
    require!(asset.status == AssetStatus::Active, ErrorCode::AssetPaused);

    // 2. Аттестация должна быть актуальной
    let now = Clock::get()?.unix_timestamp;
    require!(attestation.valid_until > now, ErrorCode::StaleAttestation);

    // 3. Получатель должен быть в вайтлисте
    require!(
        whitelist.contains(&ctx.accounts.destination_authority.key()),
        ErrorCode::NotWhitelisted
    );

    Ok(())
}
```

Если любое условие не выполнено, трансфер отклоняется ончейн. Без релаера. Без доверенного посредника.

---

#### Программа 3: Выпуск токенов

```
mint_rwa_token:
  - Принимает USDC от пользователя
  - Проверяет активную аттестацию в реестре
  - Минтит Token-2022 токен с текущей ставкой доходности
  - Записывает минт в леджер выпуска

redeem_rwa_token:
  - Сжигает Token-2022 токен
  - Ставит запрос на погашение в очередь (расчёт T+1 офчейн через кастодиана)
  - Эмитирует событие RedemptionQueued для офчейн-процессора
```

---

#### Офчейн сервис аттестора

Лёгкий Node.js сервис, запускаемый эмитентом или назначенным аттестором:

```
Каждые 24ч (или при значимом изменении NAV):
  1. Получить ставку T-bill из Treasury Direct API / Pyth SOFR-фида
  2. Вычислить новый NAV из данных кастодиана
  3. Хэшировать документ доказательства кастодии
  4. Подписать аттестацию ключевой парой аттестора
  5. Вызвать publish_attestation ончейн
  6. Обновить ставку InterestBearingMint под новую доходность
```

В продакшене: заменить одиночного аттестора на мультисиг 2-из-3 (эмитент + кастодиан + независимый аудитор). Для хакатона MVP: одиночный аттестор достаточен; дизайн мультисига задокументирован.

---

### Демо-флоу MVP

Полная история end-to-end, которую видит судья:

```
1. ЭМИТЕНТ создаёт казначейский актив в реестре ProofLayer
   → Аккаунт актива создан ончейн, аттестор назначен

2. АТТЕСТОР публикует аттестацию
   → NAV = 1.0023, доходность = 5.00%, хэш доказательства, действительна 24ч
   → Ставка InterestBearingMint обновлена до 500 б.п.

3. ПОЛЬЗОВАТЕЛЬ минтит 1000 mTBILL-SOL
   → Вносит 1000 USDC
   → Получает 1000 mTBILL-SOL токенов
   → Кошелёк показывает баланс, растущий в реальном времени

4. ПОЛЬЗОВАТЕЛЬ пытается перевести на кошелёк не из вайтлиста
   → Transfer hook отклоняет ончейн: "NotWhitelisted"

5. ПОЛЬЗОВАТЕЛЬ переводит на вайтлистованный кошелёк
   → Успех. Хук подтверждает: активный актив, свежая аттестация, получатель в вайтлисте

6. АТТЕСТОР даёт аттестации истечь (демо-ускорение)
   → Попытка трансфера → отклонено: "StaleAttestation"
   → Аттестор публикует свежую аттестацию → трансфер проходит

7. Интеграция с KAMINO (мок)
   → Протокол читает аттестацию ProofLayer для определения NAV
   → Принимает mTBILL-SOL как залог с LTV 98%
   → Пользователь занимает USDC под свою доходную T-bill позицию
```

Шаги 1–6 полностью ончейн. Шаг 7 — мок-интеграция, демонстрирующая компонуемость.

---

### Технический стек

| Компонент | Технология |
|---|---|
| Ончейн программы | Rust + Anchor |
| Стандарт токена | Token-2022 (InterestBearing + TransferHook + ConfidentialTransfer) |
| Сервис аттестора | Node.js + @solana/web3.js |
| Источник ставки доходности | Pyth SOFR фид / Treasury Direct API |
| Фронтенд | Next.js + Wallet Adapter |
| DeFi-интеграция | Jupiter SDK (смарт-минтинг), Kamino SDK (залог мок) |
| Тестирование | Anchor tests + Bankrun |

---

### Скоуп MVP

| Компонент | Статус |
|---|---|
| Программа реестра ProofLayer | Шипим |
| Программа transfer hook | Шипим |
| Программа выпуска Token-2022 | Шипим |
| Сервис аттестора (одиночная подпись) | Шипим |
| Фронтенд: дашборд эмитента | Шипим |
| Фронтенд: кошелёк пользователя (начисление) | Шипим |
| Jupiter смарт-минтинг | Шипим |
| Интеграция Kamino | Мок |
| Мультисиг аттестор | Задокументировано, не реализовано |
| Фиатное погашение | Задокументировано, не реализовано |

---

### Конкурентная позиция

По результатам анализа 204 RWA-проектов в базе данных хакатонов Colosseum:

- **Fact Finance** — построили оракульный слой. ProofLayer строит движок политик, который *потребляет* оракульные данные и применяет их ончейн.
- **TOKERA** — построили дашборд аттестаций для инвесторов. ProofLayer строит ончейн-аттестации, от которых *зависят* сами трансферы токенов.
- **ORO / Grains / NOTE Protocol** — построили вертикальные продукты без инфраструктуры. ProofLayer строит и то, и другое.
- **Ни один проект** не использовал `InterestBearingMint` + `TransferHook` + `ConfidentialTransfer` из Token-2022 вместе для RWA-выпуска.

---

---

## Links / Ссылки

### Colosseum — Конкурирующие проекты из базы данных

- [Fact Finance — RWA Oracle Layer (Radar)](https://arena.colosseum.org/projects/explore/fact-finance)
- [TOKERA — RWA Attestation Terminal (Cypherpunk)](https://arena.colosseum.org/projects/explore/tokera)
- [Carbon Credit Tokenization Platform — Token-2022 + Transfer Hooks (Breakout)](https://arena.colosseum.org/projects/explore/carbon-credit-tokenization-platform)
- [micaEur — MiCA-compliant Token2022 stablecoin (Breakout)](https://arena.colosseum.org/projects/explore/micaeur)
- [Certify Protocol — RWA Token Standard (Breakout)](https://arena.colosseum.org/projects/explore/certify-protocol)
- [ORO — Yield-bearing Tokenized Gold, Honorable Mention (Radar)](https://arena.colosseum.org/projects/explore/oro)
- [Grains — T-bill backed yield savings (Breakout)](https://arena.colosseum.org/projects/explore/grains)
- [NOTE Protocol — Yield-bearing Treasury stablecoin (Cypherpunk)](https://arena.colosseum.org/projects/explore/note-protocol)
- [Mu Digital — Institutional credit markets on Solana (Radar)](https://arena.colosseum.org/projects/explore/mu-digital)
- [VERA — Municipal bond tokenization (Cypherpunk)](https://arena.colosseum.org/projects/explore/vera-1)

### Inspiration / Reference Products

- [Midas — Tokenized financial products on EVM](https://midas.app)
- [Ondo Finance — Tokenized US Treasuries](https://ondo.finance)
- [OpenEden — T-bill vault on-chain](https://openeden.com)

### Solana Infrastructure

- [Token-2022 Program — SPL Token Extensions](https://spl.solana.com/token-2022)
- [Token-2022 Interest-Bearing Mint Extension](https://spl.solana.com/token-2022/extensions#interest-bearing-tokens)
- [Token-2022 Transfer Hook Extension](https://spl.solana.com/token-2022/extensions#transfer-hook)
- [Token-2022 Confidential Transfer Extension](https://spl.solana.com/token-2022/extensions#confidential-transfers)
- [Anchor Framework](https://www.anchor-lang.com)
- [Bankrun — Fast Solana test framework](https://github.com/kevinheavey/solana-bankrun)

### DeFi Integrations

- [Jupiter — Solana DEX Aggregator](https://jup.ag)
- [Kamino Finance — Lending & Liquidity](https://kamino.finance)
- [Meteora — Dynamic Liquidity Pools](https://meteora.ag)
- [Drift Protocol — Perpetuals & Borrowing](https://drift.trade)

### Oracle / Data

- [Pyth Network — Real-time price feeds](https://pyth.network)
- [US Treasury Direct API](https://www.treasurydirect.gov/instit/instit.htm)

### Hackathon

- [Colosseum Hackathon Platform](https://arena.colosseum.org)
- [Colosseum Copilot — Project Research Tool](https://arena.colosseum.org/copilot)
- [Superteam — Deep Dive: State of RWAs on Solana](https://blog.superteam.fun/p/deep-dive-of-the-state-of-rwas-on)
- [Helius — Solana Ecosystem Report H1 2025](https://www.helius.dev/blog/solana-ecosystem-report-h1-2025)
