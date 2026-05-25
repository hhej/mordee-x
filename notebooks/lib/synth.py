"""Synthetic MorDee+ event log generator.

Generates a realistic ~30k-row pandas DataFrame of telemedicine bookings,
calibrated to constants in `thai_stats.py`. Every feature is one that
MorDee+ could plausibly log from its actual app usage — there is nothing
in this dataset that requires a hypothetical instrumentation MorDee+
does not already have.

Schema reference (also serialized at the top of nb00):

    user_id              str   — anonymous user id
    age                  int   — years
    gender               str   — F/M/Other
    province             str   — Thai province (BKK-heavy)
    language             str   — th/en
    booking_id           str   — unique booking id
    doctor_id            str   — D001..D033 (matches src/data/doctors.json)
    specialty            str   — clinical specialty
    booked_at            ts    — when the user booked
    scheduled_at         ts    — when the visit is scheduled
    lead_time_hours      float — scheduled_at - booked_at
    scheduled_dow        int   — 0=Mon
    scheduled_hour       int   — 0–23
    is_thai_holiday      bool  — scheduled_at falls on a Thai holiday
    booking_channel      str   — app/web
    platform             str   — iOS/Android/web
    sms_confirmed        bool  — did the user confirm via SMS
    push_enabled         bool  — push notifications enabled
    reminder_clicked     bool  — opened reminder push within window
    app_opens_pre_visit  int   — app opens between booking & visit
    prior_bookings_count int   — bookings completed before this one
    prior_no_show_count  int   — no-shows by this user before this one
    prior_completion_rate float — derived
    triage_color         str   — green/yellow/red
    symptom_category     str   — coarse category (cardio/resp/gi/...)
    rag_top_k_hit        bool  — RAG retrieval found a relevant KB entry
    paid_upfront         bool  — patient paid deposit at booking
    payment_method       str   — promptpay/credit_card/cod
    no_show              int   — 0/1 target label
"""

from __future__ import annotations

import json
import math
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable

import holidays
import numpy as np
import pandas as pd

from . import thai_stats as ts


# ── Doctor roster (read from the canonical catalog so it can never drift) ──
# Source of truth = src/data/doctors.json. As of 2026-05-25 this holds 33
# doctors across 18 specialties (some specialties have multiple doctors).
# Anchored to the module location, not cwd, so direct imports work too.
_REPO = Path(__file__).resolve().parents[2]  # notebooks/lib/synth.py -> repo root
_DOCTORS_PATH = _REPO / "src" / "data" / "doctors.json"


def _load_doctors() -> list[dict]:
    raw = json.loads(_DOCTORS_PATH.read_text(encoding="utf-8"))
    return [{"id": d["id"], "specialty": d["specialty"]} for d in raw]


DOCTORS: list[dict] = _load_doctors()

# Symptom category mapped per specialty for realism. Phase 3 RAG can
# refine this; here we just need a categorical correlated with specialty.
SYMPTOM_CATEGORIES_PER_SPECIALTY = {
    "General Practice": ["general", "fever", "cold"],
    "Internal Medicine": ["hypertension", "diabetes", "general"],
    "Cardiology": ["chest_pain", "palpitations", "hypertension"],
    "OB-GYN": ["menstrual", "pregnancy", "gyn_other"],
    "Pediatrics": ["pediatric_fever", "pediatric_rash", "pediatric_gi"],
    "Dermatology": ["rash", "acne", "eczema"],
    "Orthopedics": ["back_pain", "joint_pain", "injury"],
    "Psychiatry": ["anxiety", "depression", "insomnia"],
    "Gastroenterology": ["abdominal_pain", "diarrhea", "gerd"],
    "Pulmonology": ["cough", "dyspnea", "asthma"],
    "Neurology": ["headache", "dizziness", "weakness"],
    "Endocrinology": ["diabetes", "thyroid", "obesity"],
    "ENT": ["sore_throat", "ear_pain", "sinusitis"],
    "Allergy & Immunology": ["allergy_rhinitis", "urticaria", "asthma"],
    "Urology": ["uti", "kidney_stone", "bph"],
    # New specialties added with the 33-doctor roster (2026-05-25). Categories
    # align with each doctor's Thai expertise_tags in doctors.json.
    "Ophthalmology": ["dry_eye", "red_eye", "blurred_vision"],
    "Family Medicine": ["general", "chronic_followup", "preventive_care"],
    "Emergency Medicine": ["minor_injury", "acute_pain", "first_aid"],
}


# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────


def _weighted_choice(rng: np.random.Generator, mapping: dict, n: int) -> np.ndarray:
    keys = list(mapping.keys())
    p = np.array(list(mapping.values()), dtype=float)
    p = p / p.sum()
    return rng.choice(keys, size=n, p=p)


def _sample_age(rng: np.random.Generator, n: int) -> np.ndarray:
    buckets = list(ts.AGE_BUCKETS.keys())
    probs = np.array(list(ts.AGE_BUCKETS.values()))
    probs = probs / probs.sum()
    chosen = rng.choice(len(buckets), size=n, p=probs)
    ages = np.empty(n, dtype=int)
    for i, idx in enumerate(chosen):
        lo, hi = buckets[idx]
        ages[i] = rng.integers(lo, hi)
    return ages


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


# ─────────────────────────────────────────────────────────────────────
# Main generator
# ─────────────────────────────────────────────────────────────────────


@dataclass
class GenConfig:
    n_rows: int = 30_000
    start: datetime = datetime(2025, 5, 20)
    end: datetime = datetime(2026, 5, 19, 23, 59)
    seed: int = 20260520


def _thai_holiday_set(start: datetime, end: datetime) -> set:
    th = holidays.country_holidays("TH", years=range(start.year, end.year + 1))
    return set(th.keys())


def _draw_scheduled_at(rng: np.random.Generator, cfg: GenConfig) -> pd.Series:
    """Draw scheduled_at timestamps biased by hour/dow/monsoon/holiday."""
    holiday_set = _thai_holiday_set(cfg.start, cfg.end)
    # Build a per-hour weight series over the full window
    span_hours = int((cfg.end - cfg.start).total_seconds() / 3600) + 1
    ts_index = pd.date_range(start=cfg.start, periods=span_hours, freq="h")
    dow = ts_index.dayofweek.to_numpy()
    hour = ts_index.hour.to_numpy()
    month = ts_index.month.to_numpy()
    is_hol = np.array([d.date() in holiday_set for d in ts_index])

    w = np.array(ts.HOURLY_DEMAND)[hour] * np.array(ts.DOW_DEMAND)[dow]
    w = np.where(np.isin(month, list(ts.MONSOON_MONTHS)), w * ts.MONSOON_BOOST, w)
    w = np.where(is_hol, w * ts.HOLIDAY_DROP, w)
    w = w / w.sum()
    idx = rng.choice(span_hours, size=cfg.n_rows, p=w)
    minutes = rng.integers(0, 60, size=cfg.n_rows)
    return pd.to_datetime(ts_index[idx]) + pd.to_timedelta(minutes, unit="m")


def _draw_lead_time_hours(rng: np.random.Generator, n: int) -> np.ndarray:
    """Log-normal lead time in hours, median ~12h, p90 ~120h."""
    mu = math.log(ts.LEAD_TIME_MEDIAN_HOURS)
    sig = ts.LEAD_TIME_SIGMA
    raw = rng.lognormal(mean=mu, sigma=sig, size=n)
    return np.clip(raw, 0.25, 24 * 60)  # cap at 60 days


def _draw_triage(rng: np.random.Generator, specialty: np.ndarray) -> np.ndarray:
    """Triage color, biased by specialty (cardiology more red, derm more green)."""
    base = np.array([ts.TRIAGE_SHARE["green"], ts.TRIAGE_SHARE["yellow"], ts.TRIAGE_SHARE["red"]])
    out = np.empty(len(specialty), dtype=object)
    for i, sp in enumerate(specialty):
        if sp == "Cardiology":
            p = np.array([0.45, 0.40, 0.15])
        elif sp == "Emergency Medicine":
            # ER telemed skews acute — more yellow/red than baseline.
            p = np.array([0.40, 0.40, 0.20])
        elif sp in {"Dermatology", "Allergy & Immunology", "ENT", "Ophthalmology"}:
            p = np.array([0.85, 0.13, 0.02])
        elif sp in {"Psychiatry"}:
            p = np.array([0.55, 0.40, 0.05])
        else:
            # General Practice, Family Medicine, NCD specialties, etc.
            p = base.copy()
        p = p / p.sum()
        out[i] = rng.choice(["green", "yellow", "red"], p=p)
    return out


def _compute_no_show_proba(df: pd.DataFrame) -> np.ndarray:
    """Logit model linking features → P(no_show). Coefficients come from
    `ts.EFFECT` so the data-generating process is transparent."""
    logit = np.full(len(df), math.log(ts.BASE_NO_SHOW_RATE / (1 - ts.BASE_NO_SHOW_RATE)))
    e = ts.EFFECT
    logit += e["sms_confirmed"] * df["sms_confirmed"].astype(int).to_numpy()
    logit += e["prior_no_show_count"] * df["prior_no_show_count"].clip(0, 5).to_numpy()
    logit += e["lead_time_log_hours"] * np.log1p(df["lead_time_hours"].to_numpy())
    logit += e["triage_red"] * (df["triage_color"] == "red").astype(int).to_numpy()
    logit += e["triage_yellow"] * (df["triage_color"] == "yellow").astype(int).to_numpy()
    logit += e["triage_green"] * (df["triage_color"] == "green").astype(int).to_numpy()
    logit += e["paid_upfront"] * df["paid_upfront"].astype(int).to_numpy()
    logit += e["age_60_plus"] * (df["age"] >= 60).astype(int).to_numpy()
    logit += e["age_under_30"] * (df["age"] < 30).astype(int).to_numpy()
    logit += e["reminder_clicked"] * df["reminder_clicked"].astype(int).to_numpy()
    logit += e["app_opens_pre_visit_log"] * np.log1p(df["app_opens_pre_visit"].to_numpy())
    logit += e["non_bangkok"] * (df["province"] != "Bangkok").astype(int).to_numpy()
    # Add a touch of irreducible noise so models can't reach AUC=1
    noise = np.random.default_rng(7).normal(0, 0.25, size=len(df))
    logit += noise
    return _sigmoid(logit)


def generate(cfg: GenConfig | None = None) -> pd.DataFrame:
    cfg = cfg or GenConfig()
    rng = np.random.default_rng(cfg.seed)
    n = cfg.n_rows

    # ── basic identity ──
    user_id = np.array([f"U{rng.integers(1, n // 3):06d}" for _ in range(n)])  # ~3 visits/user avg
    age = _sample_age(rng, n)
    gender = rng.choice(["F", "M"], size=n, p=[ts.FEMALE_SHARE, 1 - ts.FEMALE_SHARE])
    province = _weighted_choice(rng, ts.PROVINCE_SHARE, n)
    language = np.where(rng.random(n) < 0.05, "en", "th")

    # ── specialty + doctor ──
    specialty = _weighted_choice(rng, ts.SPECIALTY_SHARE, n)
    # Map each booking to a doctor WITHIN the sampled specialty. Several
    # specialties now have multiple doctors (e.g. 4 GPs), so we group then
    # draw uniformly among that specialty's doctors — seed-deterministic, and
    # it splits a specialty's demand evenly across its doctors.
    spec_to_docs: dict[str, list[str]] = defaultdict(list)
    for d in DOCTORS:
        spec_to_docs[d["specialty"]].append(d["id"])
    # Fail loud if the demand mix and the catalog ever drift apart.
    missing = set(ts.SPECIALTY_SHARE) - set(spec_to_docs)
    assert not missing, f"SPECIALTY_SHARE has specialties absent from doctors.json: {missing}"
    doctor_id = np.empty(n, dtype=object)
    for sp, docs in spec_to_docs.items():
        mask = specialty == sp
        if mask.any():
            doctor_id[mask] = rng.choice(docs, size=int(mask.sum()))

    # ── timing ──
    scheduled_at = _draw_scheduled_at(rng, cfg)
    lead_time_hours = _draw_lead_time_hours(rng, n)
    booked_at = scheduled_at - pd.to_timedelta(lead_time_hours, unit="h")
    scheduled_dow = scheduled_at.dayofweek.to_numpy()
    scheduled_hour = scheduled_at.hour.to_numpy()
    th_hols = _thai_holiday_set(cfg.start, cfg.end + timedelta(days=1))
    is_thai_holiday = np.array([d.date() in th_hols for d in scheduled_at])

    # ── engagement ──
    booking_channel = rng.choice(["app", "web"], size=n, p=[0.84, 0.16])
    platform = rng.choice(["iOS", "Android", "web"], size=n, p=[0.42, 0.46, 0.12])
    sms_confirmed = rng.random(n) < ts.SMS_CONFIRM_RATE
    push_enabled = rng.random(n) < ts.PUSH_ENABLED_RATE
    reminder_clicked = push_enabled & (rng.random(n) < ts.REMINDER_CLICK_RATE_IF_PUSH)
    app_opens_pre_visit = rng.poisson(ts.APP_OPENS_LAMBDA, size=n)

    # ── prior history per user ──
    # Order rows by user_id + booked_at to compute rolling counts.
    df = pd.DataFrame({
        "user_id": user_id,
        "booked_at": booked_at,
        "scheduled_at": scheduled_at,
    })
    df = df.sort_values(["user_id", "scheduled_at"]).reset_index(drop=True)

    # Pre-simulate prior_no_show via a 'pseudo-history' draw: each user
    # has an intrinsic no-show propensity drawn beta(2,8) ≈ 0.20 mean.
    user_propensity = {}
    propensity_arr = np.empty(len(df))
    for i, u in enumerate(df["user_id"].to_numpy()):
        if u not in user_propensity:
            user_propensity[u] = rng.beta(2, 8)
        propensity_arr[i] = user_propensity[u]

    # rolling counts per user (booking index within user)
    df["bk_idx"] = df.groupby("user_id").cumcount()
    # simulate prior history: for each prior booking, was it a no-show?
    # We use the user's propensity. This couples prior_no_show_count with
    # the user's true propensity, which is realistic.
    prior_no_show = np.empty(len(df), dtype=int)
    prior_no_show[0] = 0
    seen: dict = {}
    for i, (u, idx) in enumerate(zip(df["user_id"].to_numpy(), df["bk_idx"].to_numpy())):
        if idx == 0:
            seen[u] = 0
            prior_no_show[i] = 0
        else:
            # draw the missed outcome for the PREVIOUS booking
            prev_missed = int(rng.random() < propensity_arr[i - 1])
            seen[u] = seen.get(u, 0) + prev_missed
            prior_no_show[i] = seen[u]

    df["prior_bookings_count"] = df["bk_idx"]
    df["prior_no_show_count"] = prior_no_show
    df["prior_completion_rate"] = np.where(
        df["prior_bookings_count"] > 0,
        1 - df["prior_no_show_count"] / df["prior_bookings_count"].clip(lower=1),
        np.nan,
    )

    # restore original ordering (by booking_id later) — but first attach back the other columns
    # by aligning on the same sorted order
    sort_idx = df.index.to_numpy()
    df["age"] = age[df.index]
    df["gender"] = gender[df.index]
    df["province"] = province[df.index]
    df["language"] = language[df.index]
    df["specialty"] = specialty[df.index]
    df["doctor_id"] = doctor_id[df.index]
    df["lead_time_hours"] = lead_time_hours[df.index]
    df["scheduled_dow"] = scheduled_dow[df.index]
    df["scheduled_hour"] = scheduled_hour[df.index]
    df["is_thai_holiday"] = is_thai_holiday[df.index]
    df["booking_channel"] = booking_channel[df.index]
    df["platform"] = platform[df.index]
    df["sms_confirmed"] = sms_confirmed[df.index]
    df["push_enabled"] = push_enabled[df.index]
    df["reminder_clicked"] = reminder_clicked[df.index]
    df["app_opens_pre_visit"] = app_opens_pre_visit[df.index]

    # triage + symptom_category
    df["triage_color"] = _draw_triage(rng, df["specialty"].to_numpy())
    df["symptom_category"] = [
        rng.choice(SYMPTOM_CATEGORIES_PER_SPECIALTY[s]) for s in df["specialty"]
    ]
    df["rag_top_k_hit"] = rng.random(len(df)) < 0.78  # RAG hit-rate target

    df["paid_upfront"] = rng.random(len(df)) < ts.PAY_UPFRONT_RATE
    df["payment_method"] = np.where(
        df["paid_upfront"],
        rng.choice(["promptpay", "credit_card"], size=len(df), p=[0.65, 0.35]),
        "cod",
    )

    # ── compute no_show ──
    p_no_show = _compute_no_show_proba(df)
    df["p_no_show_true"] = p_no_show  # ground-truth probability (for analysis only; will be dropped before modeling)
    df["no_show"] = (rng.random(len(df)) < p_no_show).astype(int)

    # ── booking_id ──
    df = df.sort_values("booked_at").reset_index(drop=True)
    df["booking_id"] = [f"B{(i + 1):06d}" for i in range(len(df))]

    # final column order
    cols = [
        "booking_id", "user_id", "age", "gender", "province", "language",
        "doctor_id", "specialty",
        "booked_at", "scheduled_at", "lead_time_hours", "scheduled_dow", "scheduled_hour", "is_thai_holiday",
        "booking_channel", "platform",
        "sms_confirmed", "push_enabled", "reminder_clicked", "app_opens_pre_visit",
        "prior_bookings_count", "prior_no_show_count", "prior_completion_rate",
        "triage_color", "symptom_category", "rag_top_k_hit",
        "paid_upfront", "payment_method",
        "p_no_show_true", "no_show",
    ]
    return df[cols].drop(columns=["p_no_show_true"])  # don't leak ground truth into training data
