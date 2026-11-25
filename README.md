# ChainShield prototype

AI early-warning and backup system for Indian MSME supply chains (SAP Hackfest 2026, Team Veridians).
This is the shared starter. It already runs end to end with fake data, so every teammate replaces
only their own module and the whole app keeps working.

## Run it
Needs Node 18 or newer. No installs.

```
npm start      # opens http://localhost:3000, demo login: mobile 9999999999, OTP 123456
npm test       # runs the full-flow check
```

## Who owns what
| Folder | Module | Owner |
|---|---|---|
| `src/modules/m1-accounts`, `src/modules/m2-orders`, `src/server.js`, `src/lib`, `public/` | Accounts, orders and partners, app shell, SAP tool shell | Virat (Team Lead) |
| `src/modules/m3-risk` | Weather and risk AI | Vedant |
| `src/modules/m4-tracking`, `contract/sample-data.json`, `tests/` | Driver tracking, sample data, demo scenarios and tests | Siddhant |
| `src/modules/m5-alerts` | Alerts and actions | Yuvraj |
| `src/modules/m6-dashboard` and SAP BTP, Analytics Cloud, AI Core, Integration Suite | Dashboard and SAP side | Utsav |
| `designs` branch | Screen designs | Yuvraj |

The rule that keeps everything compatible: **the objects and endpoints in `contract/CONTRACT.md` do not change
without the Team Lead.** Inside your folder, change anything you like.

## How to contribute
1. `git pull` on `main`, then `git checkout -b m3-real-weather` (one branch per piece of work).
2. Change your folder. Run `npm test`.
3. `git push`, then open a Pull Request on GitHub. The check runs automatically.
4. The Team Lead reviews and merges. Keep pull requests small and frequent.

Set up on GitHub once (Virat): run `scripts/setup-github.sh` (needs the GitHub CLI), or by hand: Settings, Branches,
add a rule for `main` requiring a pull request and the `test` check.

## Deploy to SAP BTP (Cloud Foundry)
```
cf login -a <your BTP API endpoint>
cf push        # uses manifest.yml, health check at /health
```

## What is fake today
- OTP is always `123456` (a real SMS provider comes later).
- Weather is pretend, set with `POST /dev/weather` (M3 swaps in a real forecast).
- Driver position is typed in by hand (M4 swaps in live tracking and a maps arrival time).
- Alerts are saved, not sent (M5 sends WhatsApp or SMS).
- Data lives in memory and resets when the server restarts (M7 moves it to a database on SAP BTP).
- The dashboard is simple numbers (M6 and M7 move it to SAP Analytics Cloud).
- Joule, AI Core and Integration Suite are placeholders in the "SAP tools" tab.

## Data and privacy
Mobile numbers and locations are personal data. Login already asks for consent (`consent: true`, stored as `consentAt`). Still to add before real users: a way to withdraw consent and delete data.
