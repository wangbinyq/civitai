# Prompt Snippets — Populated Table Examples

**Status:** draft for DB review
**Companion docs:**

- [prompt-snippets.md](./prompt-snippets.md) (product/UX plan)
- [prompt-snippets-schema.md](./prompt-snippets-schema.md) (schema spec — authoritative)

Concrete walkthrough of the unified wildcard schema, populated with real content from [fullFeatureFantasy v3.0](https://civitai.com/models?type=Wildcards). Row IDs are illustrative. Three tables: `WildcardSet`, `WildcardSetCategory`, `UserWildcardSet`. No separate `PromptSnippet` table — user personal content lives in User-kind `WildcardSet`s alongside imported System-kind content.

---

## Scenario

Three actors:

- **Alice** (`userId: 1001`). New to the snippet system. Will create personal snippets and subscribe to a wildcard model.
- **Bob** (`userId: 2042`). Power user, already subscribed to other wildcard models. Will subscribe to `fullFeatureFantasy v3.0` after Alice imports it.
- **`fullFeatureFantasy v3.0`** (`ModelVersion.id: 458231`, type `Wildcard`). 59 `.txt` files, ~1,850 values total.

For tractable examples we focus on a handful of representative categories from fullFeatureFantasy.

---

## Stage 1 — Initial state (before Alice does anything)

Three System-kind sets imported by other users earlier. No User-kind sets shown yet.

### `WildcardSet` (existing rows)

| id | kind | modelVersionId | modelName | versionName | ownerUserId | name | auditStatus | isInvalidated | totalValueCount |
|----|----|----|----|----|----|----|----|----|----|
| 3 | System | 301004 | DarkFantasyChars | v1.2 | null | null | Clean | false | 310 |
| 12 | System | 401876 | MedievalEnvironments | v2.1 | null | null | Mixed | false | 904 |
| 16 | System | 412009 | AnimeExpressions | v1.0 | null | null | Clean | false | 128 |

### `WildcardSetCategory` (sample from existing System-kind sets)

| id | wildcardSetId | name | values (preview) | valueCount | auditStatus | nsfwLevel |
|----|----|----|----|----|----|----|
| 201 | 3 | character | `["elven ranger in forest green", "dwarven warrior with braided beard", ...]` | 42 | Clean | 1 |
| 202 | 3 | weapon | `["{2.0::greatsword\|1.5::longsword\|...}"]` | 1 | Clean | 1 |
| 215 | 12 | tavern | `["cozy medieval tavern with roaring fireplace", ...]` | 65 | Clean | 1 |
| 401 | 16 | face_expression | `["soft smile, relaxed eyes", ...]` | 24 | Clean | 1 |

`nsfwLevel` values follow the existing Civitai bitwise convention. `1` is a placeholder for "SFW only" — actual bit values are defined elsewhere.

### `UserWildcardSet` (Bob's library)

| id | userId | wildcardSetId | nickname | sortOrder | addedAt |
|----|----|----|----|----|----|
| 88 | 2042 | 3 | null | 0 | 2026-02-14 09:12:00 |
| 89 | 2042 | 12 | "Medieval env" | 1 | 2026-02-20 14:08:22 |
| 104 | 2042 | 16 | null | 2 | 2026-03-10 19:44:01 |

Library pointers only — there's no `isActive` column. Whether a set contributes to a given submission is determined per-form-state on the client (localStorage) and recorded per-submission in workflow metadata's `wildcardSetIds`. Alice has no library yet.

---

## Stage 2 — Alice's first snippet save creates her User-kind set

Alice browses the picker for a `#character` reference, sees a value she likes from somewhere else, and clicks "Save to my snippets." Since she's never saved before, the service lazily creates a User-kind set for her, then a category in it.

```ts
await prisma.$transaction(async (tx) => {
  // 1. Find or create the user's default "My snippets" set
  let userSet = await tx.wildcardSet.findFirst({
    where: { kind: 'User', ownerUserId: 1001, name: 'My snippets' }
  });

  if (!userSet) {
    userSet = await tx.wildcardSet.create({
      data: {
        kind: 'User',
        ownerUserId: 1001,
        name: 'My snippets',
        auditStatus: 'Pending',
        totalValueCount: 0,
      }
    });
    await tx.userWildcardSet.create({
      data: { userId: 1001, wildcardSetId: userSet.id }
    });
    // Note: the form's snippet-selection node also adds userSet.id to its
    // localStorage wildcardSetIds list, so the new set is immediately active
    // for this generation context.
  }

  // 2. Create a new category with the saved value (or append to an existing category — User-kind values are mutable)
  await tx.wildcardSetCategory.create({
    data: {
      wildcardSetId: userSet.id,
      name: 'character',
      values: ['blonde hair, green tunic, pointed ears, pointed cap, determined expression'],
      valueCount: 1,
      auditStatus: 'Pending',
      nsfwLevel: 0,
    }
  });

  await tx.wildcardSet.update({
    where: { id: userSet.id },
    data: { totalValueCount: { increment: 1 } }
  });
});
```

### `WildcardSet` — new row 30 (Alice's User-kind set)

| id | kind | modelVersionId | modelName | versionName | ownerUserId | name | auditStatus | totalValueCount |
|----|----|----|----|----|----|----|----|----|
| 30 | User | null | null | null | 1001 | "My snippets" | Pending | 1 |

### `WildcardSetCategory` — new row 700

| id | wildcardSetId | name | values | valueCount | auditStatus | nsfwLevel |
|----|----|----|----|----|----|----|
| 700 | 30 | character | `["blonde hair, green tunic, pointed ears, pointed cap, determined expression"]` | 1 | Pending | 0 |

### `UserWildcardSet` — new row 490 (Alice's library pointer at her own set)

| id | userId | wildcardSetId | nickname | sortOrder | addedAt |
|----|----|----|----|----|----|
| 490 | 1001 | 30 | null | 0 | 2026-04-24 12:00:00 |

The form's localStorage now reads `wildcardSetIds: [490]`. The set is immediately active for this generation context — no DB-level activation flag involved.

If Alice later saves more `character` values, the service appends to row 700's `values` array (User-kind categories are mutable). Each mutation triggers a per-category re-audit.

After audit (next stage of background work), category 700 transitions to `Clean` with an `nsfwLevel` set, and `WildcardSet 30` rolls up to `Clean`.

---

## Stage 3 — Alice subscribes to fullFeatureFantasy v3.0 (first-import)

Alice clicks "Add set" → fullFeatureFantasy v3.0. Nobody has imported this version before, so the service does the full extraction.

```ts
await prisma.$transaction(async (tx) => {
  const existing = await tx.wildcardSet.findUnique({
    where: { modelVersionId: 458231 }
  });

  if (existing) {
    await tx.userWildcardSet.create({
      data: { userId: 1001, wildcardSetId: existing.id }
    });
    // Form's localStorage adds existing.id to its wildcardSetIds list.
    return;
  }

  const files = await extractWildcardZip(458231);
  const totalValueCount = files.reduce((n, f) => n + f.lines.length, 0);

  const set = await tx.wildcardSet.create({
    data: {
      kind: 'System',
      modelVersionId: 458231,
      modelName: 'fullFeatureFantasy',
      versionName: 'v3.0',
      sourceFileCount: files.length,
      totalValueCount,
      auditStatus: 'Pending',
    }
  });

  for (const [i, f] of files.entries()) {
    await tx.wildcardSetCategory.create({
      data: {
        wildcardSetId: set.id,
        name: f.name.replace(/\.txt$/, ''),
        values: f.lines,                  // text[]
        valueCount: f.lines.length,
        displayOrder: i,
        auditStatus: 'Pending',
        nsfwLevel: 0,
      }
    });
  }

  await tx.userWildcardSet.create({
    data: { userId: 1001, wildcardSetId: set.id }
  });
  // Form's localStorage adds set.id to its wildcardSetIds list.
});
// Post-commit: enqueue audit job for set.id
```

### `WildcardSet` — new row 17 (System-kind)

| id | kind | modelVersionId | modelName | versionName | ownerUserId | name | auditStatus | sourceFileCount | totalValueCount |
|----|----|----|----|----|----|----|----|----|----|
| 17 | System | 458231 | fullFeatureFantasy | v3.0 | null | null | Pending | 59 | 1847 |

### `WildcardSetCategory` — 59 new rows (representative sample)

Each row's `values` is a Postgres `text[]` (one entry per non-empty line in the source `.txt`). `auditStatus` is `Pending` until the audit job runs.

| id | wildcardSetId | name | values (preview) | valueCount | auditStatus | nsfwLevel |
|----|----|----|----|----|----|----|
| 601 | 17 | character | `["#character_f", "#character_m"]` | 2 | Pending | 0 |
| 602 | 17 | character_f | `["1girl, solo, #booru_looks_hair_length, #booru_looks_hair_style, #booru_looks_hair_color, {#booru_looks_hair_accessories\|}, #booru_looks_eye_color"]` | 1 | Pending | 0 |
| 603 | 17 | character_m | `["1boy, man, (muscular_male:0.6), (masculine:0.8), male_focus, solo, #booru_looks_hair_male, #booru_looks_hair_color, #booru_looks_eye_color,"]` | 1 | Pending | 0 |
| 620 | 17 | color | `["blackbluebrowndark_blue..."]` | 1 | Pending | 0 |
| 631 | 17 | elemental_types | `["fire", "water", "earth", "wind", "ice", "lightning", "nature", "light", "shadow", "lava", "storm", "crystal", "metal", "void", "cosmic", "arcane"]` | 16 | Pending | 0 |
| 635 | 17 | expressions | `["{3.0::serious\|3.0::determined\|2.5::smirk\|...}"]` | 1 | Pending | 0 |
| 654 | 17 | weapons_melee | `["{3.0::sword\|3.0::dagger\|...}"]` | 1 | Pending | 0 |
| 656 | 17 | weather_time | `["{1-2$$3.0::day\|3.0::night\|2.5::sun\|...}"]` | 1 | Pending | 0 |

Observations:

- Most categories contain a single line with internal Dynamic Prompts syntax (alternation/weights) → 1-element `text[]`. Resolver expands the syntax at gen time.
- `elemental_types.txt` is the simple-list outlier — 16 distinct values.
- Source-file `__character_f__` style refs are normalized to `#character_f` at import. The stored values shown above already reflect this. Resolution at generation time stays within set 17's scope.
- `color.txt` is malformed at source (no delimiters); audit won't reject this since it's not a policy violation, but it will produce a bad single value.

### `UserWildcardSet` — Alice's new pointer at fullFeatureFantasy

| id | userId | wildcardSetId | nickname | sortOrder | addedAt |
|----|----|----|----|----|----|
| 491 | 1001 | 17 | null | 1 | 2026-04-24 12:33:08 |

Alice's library now has two pointers; the form's localStorage `wildcardSetIds: [490, 491]` reflects that both are active for the current generation context.

---

## Stage 4 — Audit job runs

Background worker processes all `Pending` categories with `wildcardSetId IN (17, 30)` (both Alice's set and the new System-kind set). Audit produces a per-category verdict + `nsfwLevel`.

Suppose 6 of fullFeatureFantasy's 59 categories fail audit (e.g. `character_f` flagged for `1girl`-related rules), and Alice's `character` category passes.

| WildcardSetCategory.id | name | auditStatus | nsfwLevel | auditNote |
|----|----|----|----|----|
| 700 | character (Alice's) | Clean | 1 | — |
| 601 | character | Clean | 1 | — |
| 602 | character_f | **Dirty** | 0 | "matches rule: implicit-age/1girl-combined" |
| 603 | character_m | Clean | 1 | — |
| 631 | elemental_types | Clean | 1 | — |
| 635 | expressions | Clean | 1 | — |
| 654 | weapons_melee | Clean | 1 | — |
| 656 | weather_time | Clean | 1 | — |

The set-level rollups update:

| WildcardSet.id | name | auditStatus |
|----|----|----|
| 17 | fullFeatureFantasy v3.0 | **Mixed** (some categories dirty) |
| 30 | "My snippets" | **Clean** |

`Mixed` means the set is still usable — clean categories contribute to pools, dirty categories are excluded. The resolver's `auditStatus = 'Clean'` filter on `WildcardSetCategory` automatically handles this.

---

## Stage 5 — Alice writes a prompt and submits

Alice's prompt:

```
A #character wearing armor, wielding #weapons_melee,
with #expressions expression in #weather_time weather,
featuring #elemental_types magic — dramatic composition, 8k
```

She doesn't make explicit selections — defaults apply. Active sets contributing to her prompt:

- **Set 30** (User-kind, "My snippets") — has category `character` (Alice's saved Zelda value)
- **Set 17** (System-kind, fullFeatureFantasy v3.0) — has all the referenced categories

### Resolver query for `#character`

Single unified query (no separate path for personal snippets):

```sql
SELECT wsc.id           AS "categoryId",
       wsc.name         AS "categoryName",
       wsc.values       AS "values",
       wsc."valueCount" AS "valueCount",
       wsc."nsfwLevel"  AS "nsfwLevel",
       ws.id            AS "setId",
       ws.kind          AS "setKind",
       ws."modelName",
       ws."versionName",
       ws.name          AS "userSetName",
       ws."ownerUserId"
FROM "UserWildcardSet" uws
  JOIN "WildcardSet" ws           ON uws."wildcardSetId" = ws.id
  JOIN "WildcardSetCategory" wsc  ON wsc."wildcardSetId" = ws.id
WHERE uws."userId" = 1001
  AND uws."wildcardSetId" = ANY(ARRAY[490, 491])  -- the wildcardSetIds from submission
  AND ws."isInvalidated" = false
  AND wsc.name = 'character'
  AND wsc."auditStatus" = 'Clean'
  AND (wsc."nsfwLevel" & 1) <> 0;   -- SFW context
```

Returns 2 rows for `#character`:

- `categoryId: 700`, `setId: 30`, `setKind: User` — Alice's personal snippet (1 value: "blonde hair, green tunic...")
- `categoryId: 601`, `setId: 17`, `setKind: System` — fullFeatureFantasy's character category (2 values: `#character_f`, `#character_m`). Note `#character_f` will fail nested resolution at gen time because category 602 is Dirty — only `#character_m` will produce content.

### Merged pools per category (after applying defaults = full pool)

| Reference | From My Snippets (set 30) | From fullFeatureFantasy v3.0 (set 17) | Total clean values |
|----|----|----|----|
| `#character` | 1 (Alice's Zelda) | 2 (`#character_f`*, `#character_m`) | 3 |
| `#weapons_melee` | 0 | 1 (weighted alternation) | 1 |
| `#expressions` | 0 | 1 | 1 |
| `#weather_time` | 0 | 1 | 1 |
| `#elemental_types` | 0 | 16 | 16 |

\* `#character_f` resolves to nothing at gen time (category 602 is Dirty) but the value is still in the pool — the dirtiness only matters when the nested ref tries to expand. Implementation may want to surface this proactively in audit.

Cartesian: `3 × 1 × 1 × 1 × 16 = 48 combinations` → over the 10-cap → seeded random sampling down to 10.

### Submission payload (client → server)

Alice has nothing in her negative prompt for this submission, so `negativePrompt` is an empty array. The `snippets` data is a node inside the generation-graph (carried by `input` alongside prompt, negativePrompt, resources, etc.), not a sibling of `input`:

```jsonc
{
  "input": {
    "seed": 847291,
    "quantity": 4,
    "prompt": "A #character wearing armor, wielding #weapons_melee, with #expressions expression in #weather_time weather, featuring #elemental_types magic — dramatic composition, 8k",
    "negativePrompt": "low quality, blurry",
    /* ... other graph nodes (resources, sampler, etc.) ... */
    "snippets": {
      "wildcardSetIds": [490, 491],
      "mode": "batch",
      "batchCount": 10,
      "targets": {
        "prompt": [
          { "category": "character",        "selections": [] },
          { "category": "weapons_melee",    "selections": [] },
          { "category": "expressions",      "selections": [] },
          { "category": "weather_time",     "selections": [] },
          { "category": "elemental_types",  "selections": [] }
        ],
        "negativePrompt": []
      }
    }
  },
  /* ... existing top-level fields like civitaiTip, tags, remixOfId, buzzType ... */
}
```

`selections: []` means "use full pool" — the default. On the client, the `snippets` object is the serialized form of a dedicated node in the generation-graph; each editor node (prompt, negativePrompt) has a dependency on the snippets node and re-renders its chips by reading `input.snippets.targets[<ownNodeName>]`.

### Workflow metadata (one record for the whole batch)

```jsonc
{
  // workflow.metadata
  "params": {
    "prompt": "A #character wearing armor, ...",     // existing — graph form data
    "negativePrompt": "low quality, blurry",         // existing
    "seed": 847291,                                  // existing
    /* ... other graph form fields ... */
    "snippets": {
      "wildcardSetIds": [490, 491],                  // Alice's User-kind set + fullFeatureFantasy subscription
      "mode": "batch",
      "batchCount": 10,
      "targets": {
        "prompt": [
          { "category": "character",       "selections": [] },   // [] = full pool default
          { "category": "weapons_melee",   "selections": [] },
          { "category": "expressions",     "selections": [] },
          { "category": "weather_time",    "selections": [] },
          { "category": "elemental_types", "selections": [] }
        ],
        "negativePrompt": []
      }
    }
  },
  "tags": [..., "wildcards"]              // workflow.tags gets the 'wildcards' marker
}
```

`snippets` lives at `workflow.metadata.params.snippets` — same place as the prompt, negativePrompt, seed, and other graph form data. `wildcardSetIds` snapshots which sets contributed to the default pools. Without it, re-resolving this submission later would consult Alice's *current* active sets, which may have changed.

In batch mode, the cartesian total (3 × 1 × 1 × 1 × 16 = 48) is computed at display time from `params.snippets.targets.prompt` + the prompt template + the active sets' content. With `batchCount: 10`, the resolver samples 10 of the 48 combinations using the form's seed.

Alice didn't make explicit picks (defaults applied) so every `selections` array is empty. Had she selected, say, just `["Zelda"]` for `#character`, that entry's `selections` would read `[{ "categoryId": 700, "values": ["blonde hair, green tunic, ..."] }]` — `categoryId` is the canonical source pointer (the parent `wildcardSetId` is reachable through the FK on `WildcardSetCategory`), `values` is the array of value strings for re-edit/display without lookups.

The `wildcards` tag on `workflow.tags` lets analytics/admin queries filter for snippet-using submissions without parsing the metadata blob.

### Step metadata (per image, one of the 10 sampled steps)

Vanilla — looks identical to a no-snippet step. The snippet substitution has already happened server-side.

```jsonc
{
  "params": {
    "prompt": "A blonde hair, green tunic, pointed ears, pointed cap, determined expression wearing armor, wielding sword, with serious expression in day weather, featuring lightning magic — dramatic composition, 8k",
    "negativePrompt": "..."
  }
}
```

The orchestrator processes this step as it would any other — no awareness of where the prompt came from.

---

## Stage 6 — Alice saves a preset

`GenerationPreset.values` gains a key recording active sets:

```jsonc
{
  "prompt": "A #character wearing armor, ...",
  "seed": -1,
  "quantity": 4,
  "wildcardSetIds": [490, 491]
}
```

Loading the preset:

1. Form's snippet-selection node hydrates `wildcardSetIds: [490, 491]` from the preset values into its localStorage state.
2. Form fetches `getOwnedWildcardSets({ ids: [490, 491] })` to validate ownership and get set details for the picker.
3. Any IDs not owned (e.g., set was removed since the preset was saved) are silently dropped from the form state and surfaced as a warning chip in the picker.

Crucially, no DB rows are mutated by preset load — only form state changes. Alice's library is untouched.

---

## Stage 7 — Bob subscribes to fullFeatureFantasy

Bob clicks "Add set" → fullFeatureFantasy v3.0. The transaction finds existing `WildcardSet 17` and just adds a pointer:

| id | userId | wildcardSetId | nickname | sortOrder | addedAt |
|----|----|----|----|----|----|
| 492 | 2042 | 17 | "FFv3" | 3 | 2026-04-25 08:17:33 |

Zero re-extraction, zero re-audit. Content sharing pays off.

---

## Edge case examples

### Dirty category excluded automatically

Category 602 (`character_f`) is `Dirty`. The resolver's `auditStatus = 'Clean'` filter excludes it transparently. When `#character_f` is encountered during nested resolution at gen time, it fails to find a clean source and emits the literal text (or skips, depending on resolver policy). Alice's prompts skew toward `#character_m`.

### Set invalidation

Mods unpublish fullFeatureFantasy v3.0 for policy reasons:

```sql
UPDATE "WildcardSet"
SET "isInvalidated" = true,
    "invalidationReason" = 'Model removed: MOD-12834',
    "invalidatedAt" = NOW()
WHERE id = 17;
```

Resolver filter `ws."isInvalidated" = false` excludes the set immediately. Alice and Bob keep their pointers; the picker shows a warning badge.

### Audit rule version bump

```sql
SELECT id FROM "WildcardSetCategory"
WHERE "auditRuleVersion" IS NULL OR "auditRuleVersion" != '2026-05-01-r1';
```

Re-audit job sweeps affected categories and updates verdicts. Set-level aggregate is recomputed afterward.

### User deletes their User-kind set

```sql
DELETE FROM "WildcardSet" WHERE id = 30 AND "ownerUserId" = 1001;
```

Cascades through:

- `WildcardSetCategory` (Alice's `character` category, id 700) — deleted
- `UserWildcardSet` (Alice's pointer, id 490) — deleted

Other users are unaffected. Workflow metadata for past submissions still references the deleted set ID; consumers should handle missing references gracefully ("snippet source no longer available"). Step prompts already contain the substituted text, so they continue to render fine.

---

## Row counts at the end of the scenario

| Table | Row count |
|----|----|
| `WildcardSet` | 5 (3 pre-existing System + 1 new System + 1 Alice User-kind) |
| `WildcardSetCategory` | ~104 (44 pre-existing + 59 fullFeatureFantasy + 1 Alice's "character") |
| `UserWildcardSet` | 6 (3 Bob existing + 1 Alice's own + 1 Alice subscription + 1 Bob subscription) |

At projected year-one scale (§7 of schema spec): ~5k System sets, ~100k–500k User sets, ~500k–1M categories, ~500k–2M activation pointers.

---

## Takeaways for DB review

1. **Single content table for both kinds.** System-kind and User-kind sets share `WildcardSet` and `WildcardSetCategory` schemas. The `kind` discriminator + nullable `(modelVersionId, ownerUserId)` distinguishes them. CHECK constraint enforces the invariant.
2. **Values inline as Postgres `text[]`.** `WildcardSetCategory.values` is a `text[]` column. No separate value table, no JSONB. Per-category audit; the category is the atomic unit of allow/deny.
3. **Resolver is a single query** across `UserWildcardSet → WildcardSet → WildcardSetCategory`. No app-side merging of separate sources.
4. **Most write pressure is at System-kind first-import** (one bulk transaction per imported model version). User-kind writes are infrequent (one row per user save). Steady-state writes negligible.
5. **Snippet metadata lives on the workflow, not the step.** One `snippetSelections` record per submission captures the user's picks. Each step's metadata is vanilla — just the substituted prompt — so the orchestrator processes snippet-driven steps identically to ordinary steps. Reproduction is anchored on `(seed, prompt template, snippetSelections)`.
6. **System-kind categories are immutable; User-kind categories are mutable.** Source-zip-derived content never changes; user-owned categories support full CRUD on values with each mutation triggering a per-category re-audit. Selections are identified by `value` text (stable under reorder, breaks only on edit/delete — handled gracefully via picker orphan state).
