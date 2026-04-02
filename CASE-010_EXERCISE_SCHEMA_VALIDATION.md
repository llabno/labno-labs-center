# CASE-010: Exercise Schema Validation — M1-XXXX Integrity Check

**Date:** 2026-04-02
**Auditor:** Claude Opus 4.6 (automated)
**Table:** `moso_rx` (Supabase)

---

## Summary

| Metric | Value |
|--------|-------|
| **Total records** | 2,335 |
| **Unique exercise names** | 2,307 |
| **Record types** | exercise (2,049), exercise_with_gate (228), assessment (58) |
| **Schema columns** | 90 |

The database contains significantly more than the 189 deduplicated M1 exercises referenced in planning docs. This is the full merged dataset from all sources (RehabHero, M1 Workbook, MOSO primitives).

---

## Field Completeness Matrix

### Critical Fields (required for Clinical Brain prescriptions)

| Field | Populated | Missing | Fill Rate | Status |
|-------|-----------|---------|-----------|--------|
| `exercise_name` | 2,335 | 0 | 100% | OK |
| `safety_tier` | 2,335 | 0 | 100% | OK |
| `movement_family` | 2,335 | 0 | 100% | OK |
| `instructions` | 1,819 | 516 | 77.9% | **NEEDS WORK** |
| `dose` | 307 | 2,028 | 13.2% | **CRITICAL GAP** |
| `ns_color` | 15 | 2,320 | 0.6% | **CRITICAL GAP** |
| `fascial_line` | 32 | 2,303 | 1.4% | **CRITICAL GAP** |
| `target_avatar` | 37 | 2,298 | 1.6% | **CRITICAL GAP** |
| `framework` | 717 | 1,618 | 30.7% | **NEEDS WORK** |
| `classification` | 43 | 2,292 | 1.8% | **CRITICAL GAP** |
| `contraindication` | 64 | 2,271 | 2.7% | **CRITICAL GAP** |

### Key Takeaway
Only 3 fields have 100% fill rate: `exercise_name`, `safety_tier`, `movement_family`. The fields that Clinical Brain needs most for NS-state-aware prescription — `ns_color`, `fascial_line`, `target_avatar`, `dose`, `contraindication` — are populated on fewer than 3% of records.

---

## NS State (ns_color) Distribution

| NS Color | Count | % of Exercises |
|----------|-------|---------------|
| NULL | 2,262 | 99.3% |
| Green | 5 | 0.2% |
| Amber | 5 | 0.2% |
| Red | 5 | 0.2% |

**Only 15 of 2,277 exercises have NS state classification.** This is the most critical gap for Clinical Brain's polyvagal-informed prescription logic. Without NS color, The Mechanic cannot filter exercises by nervous system state.

---

## Safety Tier Distribution

| Tier | Count |
|------|-------|
| green | 2,042 (87.5%) |
| yellow | 293 (12.5%) |

No `red` safety tier records exist. Either no exercises are high-risk, or red-tier exercises haven't been classified yet. **Review needed:** Are there exercises that should be red-tier (post-surgical contraindications, acute nerve compression)?

---

## Avatar Coverage (A1–A10)

Only 37 records have avatar tags. Distribution across the 10 avatars:

| Avatar | Records | Coverage |
|--------|---------|----------|
| A1: Brisk Walker | 7 | Partial |
| A2: Desk Sitter | 5 | Partial |
| A3: Gardener | 4 | Partial |
| A4: Stooped Shopper | 3 | Minimal |
| A5: Tech-Neck | 4 | Partial |
| A6: Post-op Hip | 3 | Minimal |
| A7: Knee OA | 3 | Minimal |
| A8: Unsteady | 4 | Partial |
| A9: Stretch Addict | 3 | Minimal |
| A10: Chronic Pain | 3 | Minimal |

**Additional issue:** Avatar naming is inconsistent. Some records use short form (`A1: Brisk Walker`) and others use long form (`Avatar 1: Brisk Community Walker (Advanced)`). Needs normalization.

---

## Data Quality Issues

### 1. Inconsistent avatar naming
Short form vs long form vs compound (e.g., `Avatar 2: Stiff Desk Sitter; Avatar 3: Forward-Bending Gardener`). Needs normalization to a canonical format.

### 2. All columns are TEXT type
Every column except `id` and `created_at` is stored as TEXT. Numeric fields like `integration_score`, `readability_score` should be numeric. Boolean fields like `from_rehabhero`, `from_m1`, `needs_rewrite`, `is_placeholder_content`, `completes_stress_cycle` should be boolean.

### 3. No `red` safety tier
Either intentional or a classification gap. Requires clinical review.

### 4. 516 exercises with no instructions
22% of records have no instruction text. The Mechanic cannot prescribe an exercise without instructions.

---

## Recommended Actions (Prioritized)

### Phase 1: NS Color Classification (highest impact)
- The Mechanic's core differentiator is NS-state-aware prescription
- Classify all 2,277 untagged exercises by Green/Amber/Red NS state
- This is a clinical judgment task — require Lance review
- **Estimate:** 2-3 sessions with Claude assisting, Lance reviewing

### Phase 2: Dose Filling
- 87% of exercises have no dose information
- Generate base doses by movement family and safety tier
- **Estimate:** 1 session with Claude generating, Lance validating

### Phase 3: Fascial Line + Framework Tagging
- Cross-reference `structures_involved` and `target_structure` to infer `fascial_line`
- Map `primary_framework` to populate `framework` where missing
- **Estimate:** Partially automatable

### Phase 4: Avatar Mapping
- Normalize avatar naming to canonical short form (A1–A10)
- Map exercises to avatars based on clinical presentation, target structure, and movement family
- **Estimate:** Requires clinical judgment

### Phase 5: Contraindication Population
- Critical for patient safety
- Cannot be automated — requires clinical expertise
- **Estimate:** Ongoing, prioritize exercises in The Mechanic's prescription queue

---

*This validation establishes a baseline. Re-run after each enrichment phase to track progress toward Clinical Brain readiness.*
