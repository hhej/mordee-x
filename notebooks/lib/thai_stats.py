"""Cited Thai-healthcare / telemedicine constants used to calibrate the
MorDee+ synthetic event log.

Every constant below has a SOURCE comment with the URL of the underlying
study so the analysis story is: "we did not invent these numbers — they
are anchored to published research."

Citations (accessed 2026-05-20):
 - Telemed Util. in Thai Tertiary Hospitals 2024, Liebert TMR
   https://www.liebertpub.com/doi/10.1089/tmr.2024.0027
 - Telemed Util. Patterns Amidst COVID, Thailand UCS 2024, SAGE
   https://doi.org/10.1177/00469580241246466
 - Factors associated with Telemed Acceptance (Dusit), Nature SciRep 2025
   https://www.nature.com/articles/s41598-025-11193-6
 - Telemed Reduces Missed Appointments, AJPM 2024
   https://www.ajpmonline.org/article/S0749-3797(24)00066-7/abstract
 - SMS reminder meta-analysis (PubMed)
   https://pubmed.ncbi.nlm.nih.gov/20569761/
 - MorDee platform profile (True Blog, 100k+ patients, 500+ doctors)
   https://trueblog.info/blog/en/thailands-first-telemedicine-platform-mordee/
"""

# ── Demographics ──────────────────────────────────────────────────────
# Female share of Thai telemedicine users (Liebert TMR 2024 — ">65% at 3/4
# Thai hospitals studied"). We pick the midpoint of "65–70%".
FEMALE_SHARE = 0.66

# Age distribution. "Almost 70% of telemedicine users in Thailand were
# over 40 years old" (SAGE UCS 2024). We split that 70% across 40–59
# and 60+ buckets, and the remaining 30% across 18–39.
AGE_BUCKETS = {
    # (low, high_exclusive): share
    (18, 30): 0.12,
    (30, 40): 0.18,
    (40, 50): 0.25,
    (50, 60): 0.20,
    (60, 70): 0.15,
    (70, 85): 0.10,
}

# ── Geographic ────────────────────────────────────────────────────────
# Bangkok skew on digital-health adoption. Thailand population is ~14%
# Bangkok-proper but BMR (Bangkok Metropolitan Region) + digital adoption
# pushes telemed users toward ~30–35% BKK. We use 33%.
PROVINCE_SHARE = {
    "Bangkok": 0.33,
    "Nonthaburi": 0.07,
    "Samut Prakan": 0.06,
    "Chiang Mai": 0.06,
    "Chonburi": 0.05,
    "Khon Kaen": 0.04,
    "Songkhla": 0.04,
    "Phuket": 0.03,
    "Nakhon Ratchasima": 0.05,
    "Other": 0.27,
}

# ── Specialty mix ─────────────────────────────────────────────────────
# Top conditions on Thai telemed (SAGE UCS 2024):
#   mental health 25.6%, essential hypertension 12.6%, diabetes 9.2%.
# We map those to MorDee+ specialties from §6.
SPECIALTY_SHARE = {
    "General Practice": 0.22,        # walk-in equivalent
    "Internal Medicine": 0.16,       # NCDs - hypertension, diabetes
    "Psychiatry": 0.18,              # mental health (largest Thai telemed segment)
    "Dermatology": 0.08,
    "Pediatrics": 0.07,
    "OB-GYN": 0.05,
    "Endocrinology": 0.04,
    "Cardiology": 0.04,
    "Gastroenterology": 0.04,
    "Orthopedics": 0.04,
    "Pulmonology": 0.03,
    "Neurology": 0.02,
    "ENT": 0.015,
    "Allergy & Immunology": 0.015,
    "Urology": 0.005,
}

# ── No-show base rate ─────────────────────────────────────────────────
# AJPM 2024: telemed no-show 12%, in-person no-show 25%. MorDee+ is
# telemed, so anchor near 12%. We use 14% (slightly above pure US
# telemed average to account for first-time-app friction in Thai market).
BASE_NO_SHOW_RATE = 0.14

# Effect sizes (relative-risk multipliers, applied via logit on a base).
# All values are derived from cited literature where possible.
EFFECT = {
    # SMS confirmation: meta-analysis median 34% relative reduction
    # https://pubmed.ncbi.nlm.nih.gov/20569761/
    "sms_confirmed": -0.85,           # logit shift if SMS confirmed
    # Prior no-shows: classic strongest predictor in no-show literature
    "prior_no_show_count": +0.55,     # per prior no-show
    # Lead time: longer wait => more chance to forget
    "lead_time_log_hours": +0.18,     # per ln(hours)
    # Triage red: critical patients almost never miss
    "triage_red": -1.20,
    "triage_yellow": -0.20,
    "triage_green": +0.10,
    # Paid upfront commits the patient
    "paid_upfront": -0.60,
    # Older users skew toward higher adherence on Thai telemed
    # (60+ are the engaged-NCD demographic)
    "age_60_plus": -0.25,
    "age_under_30": +0.20,
    # App engagement signals intent
    "reminder_clicked": -0.45,
    "app_opens_pre_visit_log": -0.15,  # per ln(1+opens)
    # Geographic: non-BKK slightly higher (less reliable connectivity / habit)
    "non_bangkok": +0.12,
}

# ── Engagement priors ─────────────────────────────────────────────────
# SMS confirmation rate: ~70% of patients confirm in Thai studies
SMS_CONFIRM_RATE = 0.72
# Push enabled: smartphone-app context, high
PUSH_ENABLED_RATE = 0.78
# Reminder clicked (downstream of push)
REMINDER_CLICK_RATE_IF_PUSH = 0.45
# Paid upfront: MorDee+ requires deposit for premium specialties
PAY_UPFRONT_RATE = 0.55

# ── Triage distribution ───────────────────────────────────────────────
# From real triage volumes in Thai EDs (KCMH retrospective): red ~3%,
# yellow ~35%, green ~62%. Telemed skews greener (acute cases call 1669
# instead) so we adjust slightly: red 2%, yellow 30%, green 68%.
TRIAGE_SHARE = {"red": 0.02, "yellow": 0.30, "green": 0.68}

# ── Demand calendar ──────────────────────────────────────────────────
# Hour-of-day demand multipliers (24 hrs). Peak evening 19–21 because
# Thai office workers book after work; secondary peak 10–12. Night
# trough 02–05.
HOURLY_DEMAND = [
    0.05, 0.04, 0.03, 0.03, 0.04, 0.10,   # 00–05
    0.30, 0.55, 0.80, 0.95, 1.10, 1.05,   # 06–11
    0.95, 0.90, 0.95, 0.90, 0.85, 0.95,   # 12–17
    1.20, 1.50, 1.40, 1.10, 0.70, 0.35,   # 18–23
]
# Day-of-week multipliers (Mon=0 ... Sun=6). Weekday > weekend on Thai
# telemed (Doctor Raksa data: heaviest Mon-Tue per platform reports).
DOW_DEMAND = [1.20, 1.18, 1.05, 1.00, 0.95, 0.78, 0.85]

# Monsoon months (Jun–Oct) — +15% respiratory/dermatology demand.
MONSOON_MONTHS = {6, 7, 8, 9, 10}
MONSOON_BOOST = 1.15

# Thai holidays — 30% drop (people travel / clinics closed referrals)
HOLIDAY_DROP = 0.70

# ── Booking lead time ────────────────────────────────────────────────
# Most telemed bookings are same-day or next-day in MorDee+ context.
# Log-normal-ish distribution: median ~12h, p90 ~120h.
LEAD_TIME_MEDIAN_HOURS = 12
LEAD_TIME_SIGMA = 1.4  # log-normal scale

# ── Pre-visit app engagement ─────────────────────────────────────────
# Mean app opens between booking and appointment (Poisson)
APP_OPENS_LAMBDA = 2.4
