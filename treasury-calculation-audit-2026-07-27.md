# Money Hub — TND Treasury Calculation Audit

**Audit date:** 2026-07-27
**Scope:** Full money path — entry parsing, storage precision, summation, running balance, and display. Read-only against verified Money Hub production data. No records changed.

## 1. Verdict

**The platform calculation is correct. No arithmetic, rounding, or classification error was found.**

- Every one of the 41 stored TND movements is a whole dinar. There are **zero** fractional/millime amounts.
- Sum of settled IN = **36,363 TND**
- Sum of settled OUT = **7,043 TND**
- Independent net = 36,363 − 7,043 = **29,320 TND**
- Platform-reported balance = **29,320 TND**
- Difference = **0**

The balance the platform shows is exactly the sum of what was entered.

## 2. How the money path was checked

| Stage | Finding |
|---|---|
| Entry parsing | Amount parsed numerically; rejects ≤ 0 and non-finite values. Note is mandatory. |
| Type classification | Only `IN` / `OUT` are summed; IN added, OUT subtracted. |
| Storage precision | Amounts stored as full numeric values (no truncation). All current values are integers. |
| Settlement rule | Only settled movements affect cash; there are currently 0 pending movements. |
| Summation | Single linear pass; matches an independent recomputation exactly. |
| Display | Reconciles with stored values. |

## 3. Balance movement since the previous audit (2026-07-23)

The balance legitimately grew from **21,572** to **29,320 TND** because of new movements entered between 23–27 July, including large inflows such as `9 600 — Payement tranche f melek bahri`, `1 000 — Facture ramzi khlifi trottinette spider max`, plus smaller in/out entries. This is normal ledger activity, not an error.

## 4. Preventive hardening applied

Even though no defect caused the current number, two safeguards were added so a discrepancy can never be introduced silently:

1. **Faithful millime display** — TND values now display up to 3 decimals *only when a fraction exists*. Previously the UI always rounded to whole dinars, which could have hidden a millime-level entry in the future.
2. **Strict movement-type guard** — the server now rejects any movement whose type is not exactly `IN` or `OUT`, so a malformed entry can never be mis-summed.

## 5. Because the system total is exact, a real-cash gap must come from operations, not code

Check these against the physical count:

- **A movement entered with the wrong amount or wrong direction** (IN vs OUT). Scan the journal notes for anything that does not match a real cash event.
- **Real cash in/out with no movement recorded** — the most common cause of a shortage or surplus.
- **A deleted movement whose physical cash was not reversed.** Two historical deletions exist (a 100 IN and a 70 OUT from earlier).
- **`EQUILIBRE CAISSE, ADMIN` (+78 on 23 July)** — this is a manual balancing entry, not a real cash event. If it was added to force the app to match a prior count, it masks an earlier real difference of 78 TND. Confirm what that adjustment represents.
- **`DEPART FOND DE CAISSE` (+655)** and **fond-de-caisse style entries** — verify the physical float is actually inside the box you counted.
- **Cash located elsewhere** (bank deposit, temporary custody, another drawer) but expected in the same physical count.

## 6. Final reconciliation step

```text
Physical cash counted − 29,320 TND = real variance
```

Send me:
1. the exact physical amount you counted, and
2. the date/time of the count.

I will then match your figure to the movement window and produce a line-by-line list of the most likely entries to inspect — without changing any data.
