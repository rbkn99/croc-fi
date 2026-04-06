# ProofLayer — Go-To-Market Strategy

## Core Positioning

ProofLayer is **not a fund**. It is the issuance, compliance, and integration rail for tokenized real-world assets on Solana.

On day one, we are not "Stripe for tokenized securities." We are:

> **White-glove issuance and compliance rail for the first 1–3 Solana RWA issuers who already have an asset, legal structure, and custody path — but lack Solana-native attestation, policy enforcement, and DeFi composability.**

The "self-serve platform" story comes later. Phase 1 is hands-on, partner-driven, and intentionally narrow.

---

## What We Need (and What We Don't)

### We do NOT need on day one:
- Our own fund structure
- Our own SPV / legal wrapper
- Our own custody license
- Self-serve issuance for arbitrary asset classes

### We DO need:
- One design partner with an **existing legal/custody setup** and a real asset (treasuries or cash management)
- A working on-chain stack: registry, transfer hook, InterestBearingMint, attestor service
- A devnet-proven demo that shows the full flow
- A clean issuer dashboard they can use

### The partner profile we're looking for:
- Already has capital/product thesis
- Already has legal entity and counsel
- Already has custody/admin path (or is working on it)
- **Does NOT have** a good Solana-native issuance/compliance/integration layer
- Wants: on-chain yield accrual, programmable compliance, DeFi composability on Solana

---

## Target Partners — Prioritized

### Tier 1 — Most realistic first conversations

**1. Maple Finance**
- Already on Solana with cash management / treasury product history
- Announced Solana return with Cash Management Solution backed by US T-Bills
- Needs: Solana-native compliance rails, DeFi integration layer
- Pitch: "We give your Solana treasury product native yield accrual, on-chain compliance enforcement, and Kamino/Jupiter composability through one stack"

**2. Ondo Finance**
- Already multi-chain, already launched USDY on Solana
- Large TVL ($600M+), actively expanding Solana footprint
- Needs: possibly better compliance enforcement and DeFi integration on Solana
- Pitch: "ProofLayer adds programmable compliance (TransferHook) and DeFi-readable attestations to your Solana products"

**3. Matrixdock**
- Reserve layer positioning (STBT, wSTBT, XAUm)
- Expanded XAUm to Solana in 2026
- Messaging emphasizes transparency, collateral-readiness — aligns well with ProofLayer thesis
- Pitch: "We add verifiable on-chain attestations and policy enforcement to your Solana reserve assets"

### Tier 2 — Interesting but more nuanced

**4. Backed Finance (xStocks)**
- Already on Solana, DeFi integrations with Kamino
- But: their ethos is permissionless/freely transferable, which is different from our whitelist/policy-first approach
- Could work for: a subset of their products where compliance is needed (e.g., regulated jurisdictions)

**5. Smaller crypto-native RWA issuers**
- Teams from Colosseum hackathons (Grains, NOTE Protocol, etc.) who built vertical products but lack infrastructure
- Low barrier to conversation, good for early validation
- Risk: may not have the legal/custody setup yet

### Tier 3 — Aspirational, not first targets

**6. Superstate**
- Strong reference in the category, but they are building their own issuance/compliance tooling
- More of a **competitor in the infra category** than a simple design partner
- Track them, learn from their approach, don't pitch them as customer on day one

**7. BlackRock BUIDL / Franklin Templeton (Benji)**
- Benchmark / aspirational logos
- Internal legal/partnering bar too high for early-stage team
- Realistic only after proving the stack with a crypto-native partner first
- Franklin's OBOF is at ~$1.5B AUM — useful as market validation, not as first customer

---

## Phased Plan

### Phase 0 — Hackathon / MVP (now)
- Everything on devnet
- Full working demo: registry + transfer hook + attestor + dashboard
- Mock data, but real on-chain infrastructure
- Deliverable: working product that a judge (or potential partner) can see end-to-end

### Phase 1 — First Design Partner (post-hackathon, 1-3 months)
- One partner from Tier 1 (Maple, Ondo, or Matrixdock)
- White-glove onboarding: custom policy rules, integration support
- They bring: existing asset, legal structure, custody, KYC
- We bring: Solana issuance rails, on-chain compliance, DeFi composability
- Legal: operates under partner's existing structure
- Deliverable: one live permissioned pilot on devnet, then mainnet

### Phase 2 — First Live Product (3-6 months)
- Mainnet deployment with real assets
- Real attestor service running against partner's data
- KYC integration (Sumsub / Synaps or partner's existing provider)
- DeFi integrations live: Kamino collateral, Jupiter minting
- Deliverable: real TVL, real yield, real transfers with on-chain compliance

### Phase 3 — Reusable Infrastructure (6-12 months)
- SDK for additional issuers
- Reusable policy templates
- Multiple asset types
- Attestor marketplace (long-term)
- Deliverable: second and third issuers onboarded with less custom work

---

## What We Sell to Each Partner Type

| Partner type | What they have | What they lack | What we sell |
|---|---|---|---|
| Crypto-native treasury issuer (Maple, Ondo) | Asset, legal, custody, TVL | Solana compliance rails, native yield, DeFi composability | ProofLayer stack: registry + hook + InterestBearingMint + attestor + DeFi layer |
| Reserve asset issuer (Matrixdock) | Asset, transparency ethos | On-chain verifiable attestations, programmable policy | Attestation registry + policy engine + DeFi-readable interface |
| Tokenized stocks/ETFs (Backed) | Assets, Solana presence | Compliance enforcement for regulated jurisdictions | TransferHook compliance layer (selective, not full stack) |
| Hackathon RWA teams | Idea, code | Legal, custody, infrastructure | Full ProofLayer infrastructure (but they need to bring legal/custody) |

---

## Key Principles

1. **Don't try to be a fund.** Be the rail.
2. **Don't promise self-serve too early.** First partners get white-glove treatment.
3. **Don't pitch TradFi giants first.** Prove with crypto-native, then climb.
4. **First asset class: treasuries / cash management.** Simplest, most liquid, best understood.
5. **Legal complexity depends on jurisdiction, structure, counsel, and partner.** Don't simplify it in pitches.
6. **Design partner > customer.** The first relationship is collaborative, not transactional.
