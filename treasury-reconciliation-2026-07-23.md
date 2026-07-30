# Money Hub — TND Treasury Reconciliation

**Audit date:** 2026-07-23  
**Scope:** Read-only review of the live TND Treasury ledger, its calculation logic, and available Treasury audit history. No movement, note, amount, schedule, settlement state, or database record was changed.

## 1. Data-source verification

The authenticated production diagnostic reported the database project reference:

`dzhtkakwudqiosprvbzc`

This matches the expected Money Hub production database (`money-hub-prod`). The reconciliation below is therefore based on the Money Hub production ledger, not the Carpet database.

## 2. Ledger snapshot reconciled

| Category | Movement count | Total (TND) |
|---|---:|---:|
| Settled entries | 5 | 24,955 |
| Settled exits | 23 | 3,383 |
| Pending/scheduled entries | 0 | 0 |
| Pending/scheduled exits | 0 | 0 |
| Live Treasury movements | 28 | — |

### Independent balance calculation

```text
Settled entries       24,955 TND
− Settled exits        3,383 TND
──────────────────────────────
Expected ledger cash  21,572 TND
```

**System-reported live TND balance:** `21,572 TND`  
**Independent recomputation:** `21,572 TND`  
**Difference:** `0 TND`

## 3. Conclusion on system calculation

The current TND cash-balance formula is correct for the live ledger snapshot:

- Every settled `IN` movement is added.
- Every settled `OUT` movement is subtracted.
- Unsettled scheduled movements are excluded from physical cash.
- No pending movement was present in this snapshot, so no scheduled item can explain a difference.
- The calculated balance exactly equals the number returned by the production dashboard.

There is **no evidence in this reconciliation of a system arithmetic error** producing the current `21,572 TND` balance.

## 4. Today's movements

The dashboard's current-day breakdown reconciled as follows:

| Metric | Amount (TND) | Evidence |
|---|---:|---|
| Today’s entries | 11,300 | `Facture Sfaxi med ali` |
| Today’s exits | 385 | Four movements: 100 + 50 + 50 + 185 |

## 5. Ledger integrity checks

The reviewed live Treasury ledger showed:

- No invalid movement type.
- No non-positive or non-finite amount.
- No pending movement without a scheduled date.
- No apparent duplicate movement; rows sharing a timestamp correspond to legitimate batch disbursement lines.
- No pending balance impact hidden from the live cash total.
- One recorded note correction: a 500 TND exit note changed from `Fourniture lotfi` to `Fourniture 367/deplacement bizerte150`; it did not alter the amount.

## 6. Historical deletions found

Two historical Treasury movements were deleted and are correctly absent from the live balance:

| Deleted movement | Effect if it had remained |
|---|---:|
| 100 TND entry | +100 TND |
| 70 TND exit | −70 TND |
| Net effect | +30 TND |

The deletion audit entries exist. These deleted records are **not** part of the current `21,572 TND` balance. Whether their physical cash effects were reversed at the time of deletion must be established from the real cash-handling process; the system cannot infer it.

## 7. Important calculation caveats reviewed

These do not alter the current total, but matter for future auditability:

1. **Settlement date vs. creation date:** a scheduled movement settled today keeps its original creation date. It correctly affects the total cash balance, but the dashboard's *today* inflow/outflow indicators may not reflect its settlement day.
2. **Unexpected movement type:** the server-side entry action should reject any type other than `IN` or `OUT` explicitly. The current data contains no unexpected type, so this did not cause the current difference.
3. **Audit history is event-based:** grouped/batch disbursements can be represented by one audit event for several movement rows. This is normal, but a full cash reconciliation should retain the movement journal as the primary line-by-line source.
4. **Database guard code:** the local source contains a placeholder where the strict expected Money Hub project-reference check should be. The live source was independently verified through the authenticated diagnostic for this audit, but this guard should be corrected in a separate security maintenance task.

## 8. What can still explain a physical-cash difference

Because the system total is mathematically consistent, any physical mismatch must be reconciled against cash operations outside the recorded ledger, such as:

- cash received or paid without a corresponding Treasury movement;
- a recorded movement entered with the wrong amount or wrong direction;
- a movement recorded twice in the real-world cash process but once in the system, or the reverse;
- a deleted movement whose real cash effect was not reversed;
- cash counted in another box, bank deposit, or temporary custody but treated as Treasury cash during the physical count.

## 9. Final comparison required

Use this equation when you complete the physical count:

```text
Physical cash counted − 21,572 TND = unexplained variance
```

Provide the exact physical count and the date/time of the count. I can then identify the likely movement window and produce a focused discrepancy list without changing any data.
