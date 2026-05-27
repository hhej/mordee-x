"""Patient-segmentation helpers for MorDee+ notebook 04.

The synthetic event log (`data/synthetic/bookings.csv`) is **per-booking**, but
segmentation is **per-patient** — so we first collapse the log to one row per
`user_id`, then cluster on behavioural + history + demographic features.

Keeping the load-bearing transforms here (mirrors `synth.py` / `thai_stats.py`)
keeps the notebook readable and the logic unit-testable.
"""

from __future__ import annotations

import pandas as pd

# Persona catalogue: (label_th, label_en, recommended_action_th, colour). Colours
# are MorDee+ mint / triage CSS tokens (globals.css) so the dashboard donut + PCA
# scatter match the design system, and they track the persona's *meaning* (loyal =
# mint, chronic = teal, new = slate, at-risk = amber) rather than an arbitrary id.
PERSONAS = {
    "loyal": ("ผู้ป่วยประจำ", "Loyal regulars",
              "เสนอสิทธิพิเศษสมาชิก + นัดติดตามอัตโนมัติ", "#16a34a"),
    "chronic": ("กลุ่มเรื้อรังมูลค่าสูง", "High-value chronic",
                "นัดติดตามอัตโนมัติ + โปรแกรมดูแลโรคเรื้อรัง", "#0ea5a4"),
    "new": ("ผู้ใช้ใหม่", "New low-engagement",
            "ส่งคอนเทนต์ให้ความรู้ + กระตุ้นการใช้งานแอป", "#64748b"),
    "atrisk": ("กลุ่มเสี่ยงไม่มา", "At-risk no-show-prone",
               "ขอยืนยันก่อนนัด + ส่ง SMS/โทรเตือนหลายครั้ง", "#f59e0b"),
}
# Fallback palette for the rare k > len(PERSONAS) case (extra clusters reuse a
# persona but still need a distinct colour).
SPARE_COLORS = ["#15803d", "#ef4444", "#7c3aed", "#0284c7"]

# Features fed to the clustering models — behavioural + history + demographic.
# Kept as a module constant so the notebook, the demo-assignment archetypes, and
# the exported `feature_set` all agree on one ordering.
FEATURE_COLS = [
    "n_bookings",
    "observed_no_show_rate",
    "prior_completion_rate",
    "sms_confirm_rate",
    "reminder_click_rate",
    "avg_app_opens",
    "avg_lead_time_hours",
    "paid_upfront_rate",
    "age",
    "pct_red_yellow_triage",
]


def aggregate_patients(df: pd.DataFrame) -> pd.DataFrame:
    """Collapse the per-booking log to one row per `user_id`.

    History columns (`prior_*`) are cumulative-at-booking-time in the synth DGP,
    so the LAST booking per user carries the richest snapshot. Behavioural
    signals (engagement, payment) are averaged across all of the user's bookings.
    Returns a frame with `user_id` as a column (reset index).
    """
    g = df.sort_values(["user_id", "scheduled_at"]).groupby("user_id")
    patients = pd.DataFrame(
        {
            # recency / volume
            "n_bookings": g.size(),
            "lifetime_no_shows": g["no_show"].sum(),
            "observed_no_show_rate": g["no_show"].mean(),
            # latest-snapshot history (cumulative-at-booking — last row is richest)
            "prior_bookings_count": g["prior_bookings_count"].last(),
            "prior_no_show_count": g["prior_no_show_count"].last(),
            # NaN for single-booking users (no prior history) → treat as perfect
            # completion, matching nb01's fillna(1.0).
            "prior_completion_rate": g["prior_completion_rate"].last().fillna(1.0),
            # engagement (means across the user's bookings)
            "sms_confirm_rate": g["sms_confirmed"].mean(),
            "push_enabled_rate": g["push_enabled"].mean(),
            "reminder_click_rate": g["reminder_clicked"].mean(),
            "avg_app_opens": g["app_opens_pre_visit"].mean(),
            "avg_lead_time_hours": g["lead_time_hours"].mean(),
            "paid_upfront_rate": g["paid_upfront"].mean(),
            # demographics / clinical (stable per user)
            "age": g["age"].first(),
            "pct_red_yellow_triage": g["triage_color"].apply(lambda s: (s != "green").mean()),
        }
    )
    return patients.reset_index()


def _persona_scores(z: pd.DataFrame) -> pd.DataFrame:
    """Score each cluster against each persona from z-scored centroid profiles.

    ``z`` is clusters × :data:`FEATURE_COLS`, standardised **across clusters** so
    scores express each cluster's position *relative to the others* (absolute
    thresholds don't transfer — e.g. on this data the mean patient has ~3
    bookings, so no cluster clears a fixed "loyal ≥ 5 visits" bar). Higher = better
    fit. Returns clusters × persona-key.
    """
    engagement = z[["sms_confirm_rate", "reminder_click_rate", "avg_app_opens"]].mean(axis=1)
    return pd.DataFrame(
        {
            # high actual booking volume + engagement, low actual no-show
            "loyal": z["n_bookings"] + 0.5 * engagement - z["observed_no_show_rate"],
            # clinically complex: lots of red/yellow triage, older
            "chronic": 1.5 * z["pct_red_yellow_triage"] + 0.5 * z["age"],
            # few bookings, low clinical acuity (healthy occasional users)
            "new": -z["n_bookings"] - z["pct_red_yellow_triage"],
            # driven by the *observed* no-show rate (the direct signal; the
            # cumulative prior_completion_rate is a noisier pseudo-history field)
            "atrisk": 2.0 * z["observed_no_show_rate"],
        },
        index=z.index,
    )


def label_clusters(profile_df: pd.DataFrame) -> dict[int, dict]:
    """Assign **stable** ids + **distinct** human personas to clusters.

    ``profile_df`` is indexed by the raw cluster id (as produced by the fitted
    model) with columns = mean feature values in ORIGINAL units.

    Two things make the labels robust:
    1. **Stable ids** — sklearn cluster integers permute across runs, so we
       re-number clusters by a stable key (completion rate desc, then volume) so
       the emitted ids — and therefore UI colours + the assignment map — are
       reproducible.
    2. **Relative, distinct personas** — we z-score the centroids across clusters,
       score every (cluster, persona) pair, then greedily assign so each persona is
       used at most once until all are exhausted. This guarantees four meaningful
       personas instead of collapsing most clusters into one label.

    Returns ``{raw_id: {"id", "label_th", "label_en", "color",
    "recommended_action_th"}}`` where ``id`` is the stable 0-based id.
    """
    feats = [c for c in FEATURE_COLS if c in profile_df.columns]
    std = profile_df[feats].std(ddof=0).replace(0, 1.0)
    z = (profile_df[feats] - profile_df[feats].mean()) / std
    scores = _persona_scores(z)

    # Greedy 1-1 assignment: best-scoring pairs first; a persona is reused only
    # once all personas have been claimed (k > len(PERSONAS)).
    ranked = sorted(
        ((scores.loc[c, p], c, p) for c in scores.index for p in scores.columns),
        key=lambda t: t[0],
        reverse=True,
    )
    persona_of: dict[int, str] = {}
    used: set[str] = set()
    for _, raw_id, persona in ranked:
        if raw_id in persona_of:
            continue
        if persona in used and len(used) < len(PERSONAS):
            continue
        persona_of[raw_id] = persona
        used.add(persona)
        if len(persona_of) == len(scores.index):
            break

    order = profile_df.sort_values(
        ["prior_completion_rate", "n_bookings"], ascending=False
    ).index.tolist()
    out: dict[int, dict] = {}
    seen_persona: dict[str, int] = {}
    for stable_id, raw_id in enumerate(order):
        persona = persona_of[raw_id]
        label_th, label_en, action, color = PERSONAS[persona]
        # If a persona repeats (k > 4), keep colours distinct via the spare palette.
        dup = seen_persona.get(persona, 0)
        if dup:
            color = SPARE_COLORS[(dup - 1) % len(SPARE_COLORS)]
        seen_persona[persona] = dup + 1
        out[int(raw_id)] = {
            "id": stable_id,
            "label_th": label_th,
            "label_en": label_en,
            "color": color,
            "recommended_action_th": action,
        }
    return out
