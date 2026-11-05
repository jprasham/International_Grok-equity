# Symbol source dumps

Used by `npm run symbols:build` to regenerate `lib/symbols-data.json`.

| File | Source | Used by build? |
| --- | --- | --- |
| `nse-equity.csv` | NSE `EQUITY_L.csv` | Yes |
| `bse-symbols.csv` | Active BSE equity list | Yes |
| `kite-instruments.csv` | Optional local dump | No (ignored; safe to delete locally) |

Raw CSVs are gitignored and not required at runtime — the app ships `lib/symbols-data.json`.
