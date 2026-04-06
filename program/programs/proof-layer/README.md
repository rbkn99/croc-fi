# ProofLayer — RWA Attestation & Compliance Program

Solana-программа для выпуска, аттестации и управления токенизированными Real World Assets (RWA) через Token-2022.

## Архитектура

```
src/
├── lib.rs                              # Entrypoint, роутинг инструкций
├── state.rs                            # Все аккаунты
├── error.rs                            # Коды ошибок
├── events.rs                           # События для индексации
└── instructions/
    ├── create_asset.rs                 # Создание реестра актива
    ├── init_attestation_config.rs      # Настройка мультисиг-аттестации
    ├── submit_nav_vote.rs              # Голос аттестора за NAV/yield
    ├── finalize_attestation.rs         # Финализация аттестации по консенсусу
    ├── update_asset_status.rs          # Пауза / возобновление актива
    ├── whitelist.rs                    # Добавление / удаление из вайтлиста
    ├── mint_rwa_token.rs               # Минт RWA-токенов за USDC (по NAV)
    ├── redeem_rwa_token.rs             # Сжигание токенов + запрос на выкуп
    ├── fulfill_redemption.rs           # Исполнение выкупа — USDC юзеру
    ├── reject_redemption.rs            # Отклонение выкупа — ре-минт токенов юзеру
    ├── withdraw_from_vault.rs          # Вывод USDC из vault (для инвестирования)
    └── deposit_to_vault.rs             # Пополнение vault (для выплат)
```

## Роли

- **Issuer** — создаёт актив, управляет вайтлистом, конфигом аттестации, vault и redemption
- **Attestors** (N штук) — независимо голосуют за NAV и yield rate
- **User** — минтит/выкупает токены (должен быть в вайтлисте)

## Жизненный цикл

1. Issuer вызывает `create_asset` → `AssetRegistry` PDA привязанный к минту (задаёт лимиты и минимальные суммы)
2. Issuer вызывает `init_attestation_config` → задаёт список аттесторов, threshold, допуск
3. Каждый аттестор вызывает `submit_nav_vote` → записывает свой NAV, yield, proof hash
4. Любой вызывает `finalize_attestation` когда голосов >= threshold → программа считает медиану, проверяет допуск, пишет `AttestationRecord`
5. Issuer добавляет адреса через `add_to_whitelist`
6. User вызывает `mint_rwa_token` → USDC в vault, RWA-токены юзеру **по текущему NAV**
7. User вызывает `redeem_rwa_token` → сжигает токены, создаёт `RedemptionRequest`
8. Issuer вызывает `fulfill_redemption` → USDC из vault юзеру по NAV, request закрывается
9. (или) Issuer вызывает `reject_redemption` → RWA-токены ре-минтятся юзеру, request закрывается

### Управление vault

- Issuer вызывает `withdraw_from_vault` → выводит USDC из vault для инвестирования в реальные активы
- Issuer вызывает `deposit_to_vault` → пополняет vault для выплат по redemption

## Attestation Consensus

Вместо одного аттестора — N независимых оракулов:

- Каждый сабмитит свой NAV через `submit_nav_vote`
- `finalize_attestation` собирает голоса текущего раунда
- Вычисляет **медиану** NAV и yield
- Проверяет что все значения в пределах `tolerance_bps` от медианы (например, 1%)
- Если всё ок — пишет финальную аттестацию и инкрементит раунд
- Старые голоса автоматически "протухают" при смене раунда

### Параметры конфига

| Поле | Описание |
|------|----------|
| `attestors` | Список аттесторов (до 10) |
| `threshold` | Минимум голосов для финализации |
| `tolerance_bps` | Максимальное отклонение от медианы (100 = 1%) |
| `validity_duration` | Срок действия аттестации в секундах |

## NAV-based pricing

Минт RWA-токенов использует текущий NAV из аттестации:

```
rwa_amount = usdc_amount * 10_000 / nav_bps
```

- `nav_bps = 10_000` → $1.00 за токен (1:1)
- `nav_bps = 10_500` → $1.05 за токен (юзер получает меньше токенов)
- `nav_bps = 9_800` → $0.98 за токен (юзер получает больше токенов)

Redemption (fulfill) считает обратно: `usdc_amount = rwa_amount * nav_bps / 10_000`

## Лимиты

AssetRegistry хранит лимиты, задаваемые при `create_asset`:

| Поле | Описание |
|------|----------|
| `min_mint_amount` | Минимальная сумма USDC для минта |
| `min_redeem_amount` | Минимальное количество RWA для выкупа |
| `daily_mint_limit` | Дневной лимит минта в USDC (0 = без лимита) |
| `daily_redeem_limit` | Дневной лимит выкупа в RWA (0 = без лимита) |

Лимиты сбрасываются автоматически при смене дня (UTC).

## PDA-схема

| Аккаунт | Seeds |
|---------|-------|
| AssetRegistry | `["asset", mint]` |
| AttestationConfig | `["attestation_config", asset_registry]` |
| AttestationVote | `["vote", config, round_bytes, attestor]` |
| AttestationRecord | `["attestation", asset_registry]` |
| WhitelistEntry | `["whitelist", asset_registry, wallet]` |
| RedemptionRequest | `["redemption", asset_registry, user]` |

## Transfer Hook (отдельная программа)

`proof-layer-hook` — Token-2022 transfer hook, при каждом трансфере проверяет:
- Актив не на паузе
- Аттестация не просрочена
- Получатель в вайтлисте

## Инструкции

| Инструкция | Кто | Что делает |
|-----------|-----|-----------|
| `create_asset` | Issuer | Регистрирует актив с типом и лимитами |
| `init_attestation_config` | Issuer | Создаёт конфиг мультисиг-аттестации |
| `submit_nav_vote` | Attestor | Сабмитит NAV/yield/proof для текущего раунда |
| `finalize_attestation` | Anyone | Финализирует аттестацию при достаточном количестве голосов |
| `pause_asset` | Issuer | Останавливает торговлю |
| `resume_asset` | Issuer | Возобновляет торговлю |
| `add_to_whitelist` | Issuer | Добавляет кошелёк в вайтлист |
| `remove_from_whitelist` | Issuer | Удаляет из вайтлиста |
| `mint_rwa_token` | User | Платит USDC → получает RWA-токены по NAV |
| `redeem_rwa_token` | User | Сжигает RWA → запрос на выкуп |
| `fulfill_redemption` | Issuer | Одобряет выкуп → USDC юзеру по NAV |
| `reject_redemption` | Issuer | Отклоняет выкуп → ре-минт RWA юзеру |
| `withdraw_from_vault` | Issuer | Выводит USDC из vault |
| `deposit_to_vault` | Issuer | Пополняет vault USDC |

## TODO

- Один redemption на юзера за раз (нужен счётчик)
- Нет update конфига аттестации (смена аттесторов/threshold)
- Нет update лимитов после создания актива
- Hook ID — плейсхолдер

## Стек

- Anchor 0.31.1
- SPL Token-2022
- Solana



solana program deploy target/deploy/proof_layer.so -k admzWKEZFRemDd5HTJL1oM8iy9cCywzPbMGqvm6Azzh.json --program-id croZ9hcrqGz3fZHTkBfEaRbZQXkhfW4ZhbVBiFinNrF.json -u "https://devnet.helius-rpc.com/?api-key=f454a99e-a9c6-4b24-9303-79eebadc519f" --max-sign-attempts 60 --with-compute-unit-price 15000