# Symbol source dumps

Used by `npm run symbols:build` to regenerate `lib/symbols-data.json`.

| File | Source |
| --- | --- |
| `nse-equity.csv` | NSE `EQUITY_L.csv` |
| `bse-symbols.csv` | Active BSE equity list |

Raw CSVs are not required at runtime — the app ships the generated JSON.
