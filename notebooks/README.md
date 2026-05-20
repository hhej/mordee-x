# MorDee+ Phase 2 notebooks

Four executed Jupyter notebooks that produce the JSON artifacts Phase 3's API routes consume.

## Quick start

```bash
# from repo root
uv sync                                                # install Python deps
uv run jupyter nbconvert --to notebook --execute --inplace notebooks/00_generate_synthetic_data.ipynb
uv run jupyter nbconvert --to notebook --execute --inplace notebooks/01_no_show_full_pipeline.ipynb
uv run jupyter nbconvert --to notebook --execute --inplace notebooks/02_demand_forecast_full_pipeline.ipynb
uv run jupyter nbconvert --to notebook --execute --inplace notebooks/03_seed_symptom_kb.ipynb
```

Notebook 03 needs `GOOGLE_API_KEY` in `.env` for Gemini embeddings (gemini-embedding-001, 768-dim).

## What each notebook does

| File | Purpose | Output |
|---|---|---|
| `00_generate_synthetic_data.ipynb` | Generate ~30k MorDee+ bookings (12 mo) calibrated to Thai stats | `data/synthetic/bookings.csv` |
| `01_no_show_full_pipeline.ipynb` | XGBoost no-show prediction (§7 13-section spec, SHAP, simulated week) | `data/ml/no_show_predictions.json` |
| `02_demand_forecast_full_pipeline.ipynb` | Prophet · SARIMA · LightGBM hourly demand for D001 (GP) | `data/ml/demand_forecast_7d.json` |
| `03_seed_symptom_kb.ipynb` | 50-entry RAG KB with TH+EN guidance + Gemini embeddings | `data/symptom_kb.json` |

## Regenerating notebook source

If you want to modify a notebook (e.g., change a calibration constant), edit `notebooks/_build.py` instead of the .ipynb — the JSON inside .ipynb is a build artifact:

```bash
uv run python notebooks/_build.py nb01      # rebuild just nb01
uv run python notebooks/_build.py           # rebuild all
```

Then re-execute with nbconvert.

## Calibration sources

Every constant in `notebooks/lib/thai_stats.py` cites a published source:
- Liebert TMR 2024 — Thai hospital telemedicine utilization (female %, age distribution)
- SAGE UCS 2024 — Thai UC scheme telemedicine patterns (specialty mix)
- AJPM 2024 — telemed vs in-person no-show base rates
- PubMed 20569761 — SMS-reminder meta-analysis (effect size)
- Manchester Triage System, WHO 2009 Dengue, Thai ACS Guidelines 2020 (symptom KB)
