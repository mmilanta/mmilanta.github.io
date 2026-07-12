# Bayesian Bouldering Model — Detailed Explanation

## 1. Overview

This project builds a **hierarchical Bayesian model** of bouldering ascents using PyMC. The goal is to infer latent (hidden) traits about climbers and boulders from observed ascent data — who tried what, who sent what, who flashed what. The model simultaneously estimates:

- **Climber ability** (θ): how strong each climber is
- **Climber prolificity** (α): how likely a climber is to try *any* boulder, regardless of difficulty
- **Boulder difficulty** (d): how hard each boulder actually is (inferred, not just the community grade)
- **Boulder popularity** (π): how likely a boulder is to be tried, all else equal
- **Selectivity** (γ): how narrowly a climber targets problems near their level ("Goldilocks" effect)
- **Preferred difficulty** (μ_try): the difficulty sweet-spot each climber prefers

The specific run analyzed is `runs/bayesian_2026-06-29_20-48-58`, which was trained with **per-climber try curves** and **sector-level hierarchical difficulty**, reaching **R² = 0.75** (difficulty-only explanation of community grade variance) and **R² = 0.79** (difficulty + popularity).

---

## 2. Data

### Sources

| File | Description |
|------|-------------|
| `data/ascents.jsonl` | ~1.36 million ascent records: who climbed what, and how (go/send/flash) |
| `data/boulders.jsonl` | ~185k boulders with names, grades, crags, sectors, ascent counts |

### Dataset Construction (`vl_predictor/dataset.py`)

The dataset is built in "per_crag" mode:

1. **Positive samples**: Every (climber, boulder) pair from the ascent logs, labeled as:
   - `1` = **go** (tried, didn't send)
   - `2` = **send** (sent but not first try)
   - `3` = **flash** (sent first try)

2. **Negative samples**: For each climber, we enumerate all boulders in crags they've visited that they *haven't* logged an ascent on. These are labeled `0` ("ambiguous negative" — could be "didn't try" or "tried and failed, but didn't log it").

This yields:
- ~31,616 climbers
- ~50,514 boulders that have ascent data
- ~60k positive samples (1/2/3)
- ~600k negative samples (0)

For training, negatives are subsampled at ratio **neg:pos = 10:1** to keep the problem balanced.

---

## 3. The Bayesian Model

### 3.1 Latent Variables and Priors

All core latents use **centered parameterizations** with hierarchical priors — the large number of observations per group (~600k / 50k boulders) makes the posterior funnel well-determined and centered parameterizations converge faster.

```
σ_ability ~ HalfNormal(2)       θ_i ~ Normal(0, σ_ability)        i ∈ climbers
σ_prolificity ~ HalfNormal(2)   α_i ~ Normal(0, σ_prolificity)    i ∈ climbers
σ_popularity ~ HalfNormal(2)    π_j ~ Normal(0, σ_popularity)     j ∈ boulders
```

**Boulder difficulty** `d_j` uses a two-level hierarchical prior when `--hierarchy sector` is active (which it is in this run):

```
σ_d_between ~ HalfNormal(2)
σ_d_within  ~ HalfNormal(2)

d_sector_raw_k ~ Normal(0, 1)    k ∈ sectors (3,927 groups)
d_sector_k = σ_d_between · d_sector_raw_k

d_raw_j ~ Normal(0, 1)           j ∈ boulders
d_j = d_sector[sector(j)] + σ_d_within · d_raw_j
```

This pools difficulty information within sectors: a boulder's difficulty is the sector's baseline difficulty plus an individual offset. This helps regularize boulders with few ascents.

**Global intercept** (β) shifts the flash threshold:

```
β ~ Normal(0, 2)
```

### 3.2 Per-Climber Try Curves ("Goldilocks" effect)

Climbers don't try boulders uniformly — they preferentially attempt problems near their own level. This is captured by a **quadratic try-curve** with per-climber parameters:

```
log_gamma_mu    ~ Normal(0, 1)
log_gamma_sigma ~ HalfNormal(1)
log_gamma_i     ~ Normal(log_gamma_mu, log_gamma_sigma)    i ∈ climbers
γ_i = exp(log_gamma_i)

μ_try_mu    ~ Normal(0, 1)
μ_try_sigma ~ HalfNormal(1)
μ_try_i ~ Normal(μ_try_mu, μ_try_sigma)    i ∈ climbers
```

- **γ_i** controls the *width* of the try-curve: high γ means the climber is very selective (narrow window); low γ means they'll try a wide range of difficulties.
- **μ_try_i** is the climber's *preferred difficulty* in the same latent space as θ and d — it shifts the peak of their try parabola.

These are drawn from population-level hyperpriors, so climbers with few observations are regularized toward the population mean.

### 3.3 Observed Data Likelihood

The observed outcome for a (climber i, boulder j) pair is modeled as a **sequential decision cascade**:

```
              ┌──────────────┐
              │  Try?        │  ──No──▶  Negative (0)
              └──────┬───────┘
                     │Yes
              ┌──────▼───────┐
              │  Send?       │  ──No──▶  Go (1)
              └──────┬───────┘
                     │Yes
              ┌──────▼───────┐
              │  Flash?      │  ──No──▶  Send (2)
              └──────┬───────┘
                     │Yes
                     ▾
                 Flash (3)
```

Each step is a logistic regression on latent variables:

**Try probability:**

```
logit(P_try) = α_i + π_j − γ_i · (θ_i − d_j − μ_try_i)²
```

This is the key equation. The try probability peaks when the climber's ability matches the boulder's difficulty (shifted by their preferred offset μ_try_i). It drops off quadratically as the boulder gets too easy or too hard. The climber's baseline tendency to try things (α_i) and the boulder's appeal (π_j) shift the whole curve up or down.

**Send probability** (given they tried):

```
logit(P_send | try) = θ_i − d_j
```

Simply: stronger climbers are more likely to send easier boulders.

**Flash probability** (given they sent):

```
logit(P_flash | send) = θ_i − d_j − β
```

Same as send but shifted by a global threshold β. A positive β means flashing requires a bigger ability advantage.

**Full outcome probabilities:**

```
P(negative) = (1 − P_try) + P_try × (1 − P_send|try)
P(go)       = P_try × (1 − P_send|try)
P(send)     = P_try × P_send|try × (1 − P_flash|send)
P(flash)    = P_try × P_send|try × P_flash|send
```

Note that class 0 (negative) is ambiguous: it represents *either* not trying *or* trying and failing. The model marginalizes over this ambiguity via `logaddexp` in the likelihood. This is essential because we don't have direct "didn't try" annotations — we only know someone *didn't* log an ascent.

### 3.4 Why This Structure?

- **Separating θ and α**: Ability (θ) determines success; prolificity (α) determines willingness to try. Without this split, a climber who tries everything but rarely succeeds would be indistinguishable from one who only tries routes they can send.
- **Goldilocks try-curve**: The `−γ·(diff − μ)²` term means climbers aren't just uniformly more likely to try easy boulders — they're most likely to try boulders near their own level. This captures the real behavior: strong climbers avoid "junk miles" on easy problems, while beginners don't attempt projects way above their grade.
- **Separating d and π**: Difficulty and popularity are different. A V0 in a famous area might be more popular than a V10 in an obscure crag, even though it's easier.

---

## 4. Training

### 4.1 Inference Method

The model is trained using **Automatic Differentiation Variational Inference (ADVI)** with the `fullrank_advi` method (a multivariate Gaussian approximation), rather than MCMC (NUTS). This is necessary because:

- The dataset has millions of observations and ~82k latent parameters — MCMC would be prohibitively slow.
- ADVI scales to large data via minibatch stochastic optimization.
- Minibatch size: 4,096. The log-likelihood is scaled up by `n_total / batch_size` to provide an unbiased estimate of the full-data gradient.

Training ran for **2,000,000 iterations** with Adam optimizer (lr=0.003). After convergence, **3,000 posterior draws** were sampled from the fitted variational approximation.

### 4.2 Validation Metric: Weighted R² against Community Grade

The key validation metric is how well the inferred difficulty (d) predicts the community grade. A weighted R² is computed:

1. For each boulder with a known community grade (e.g., "7A", "6C+"), map it to a numeric scale (2–29 for French grades).
2. Regress grade onto d (plus optionally π) with ascent-count-squared weights.
3. Report R².

**R² = 0.75** for difficulty alone, **R² = 0.79** when popularity is included. This is high — the latent difficulty d is strongly aligned with the human-assigned grade, confirming the model is learning something meaningful.

### 4.3 Training Run Configuration

| Parameter | Value |
|-----------|-------|
| Method | ADVI (fullrank) |
| Iterations | 2,000,000 |
| Posterior draws | 3,000 |
| Batch size | 4,096 |
| Learning rate | 0.003 |
| Neg:pos ratio | 10:1 |
| Hierarchy | sector (3,927 groups) |
| Per-climber try | True |
| Data mode | per_crag |

---

## 5. Analysis (analysis_bayesian.ipynb)

The notebook loads checkpoint `posterior_iter0340000.nc` (iter 340,000) which had the best R² (0.75/0.79). It then systematically explores the inferred latents:

### 5.1 Boulder Rankings
- **Hardest boulders**: Top 30 by lower 95% CI of difficulty d. These are the problems the model considers most difficult, regardless of their community grade.
- **Most popular boulders**: Top 30 by lower CI of popularity π.

### 5.2 Difficulty vs Grade Calibration
- Scatter plots of inferred d against community grade (both French and V-scale), showing strong linear correlation.
- Weighted regression to predict grade from d + π.
- **Residual analysis**: Boulders where d deviates most from grade-based expectation are flagged as potential **sandbags** (harder than graded) or **soft touches** (easier than graded).

### 5.3 Climber Rankings
- **Strongest climbers**: Top 30 by lower CI of ability θ.
- **Ability vs prolificity**: Scatter showing the relationship between being strong and being active.
- **Fuzzy name lookup**: Search for specific climbers and see their estimated ability, prolificity, selectivity (γ), and preferred difficulty (μ_try).

### 5.4 Try Curves (Goldilocks)
- Distribution of γ_i and μ_try_i across climbers.
- Try-probability curves overlaid for climbers at different ability percentiles, showing how the preferred-difficulty peak shifts with climber strength.
- **Selectivity vs ability**: Do stronger climbers have narrower (more selective) or wider (more exploratory) try windows?

### 5.5 Uncertainty Analysis
- Posterior standard deviation of d vs ascent count — confirming that boulders with more ascents have tighter difficulty estimates (Bayesian shrinkage at work).
- Distributions of hyperparameters (σ_ability, σ_prolificity, σ_popularity, σ_d_between, σ_d_within).

### 5.6 Residual Histograms by Crag
- Which climbing areas tend to grade conservatively (soft grades) vs aggressively (sandbagged)? Aggregated residual distributions by crag.

### 5.7 Median-Based Residuals
- For each grade, the median difficulty d is computed. Residuals = d − median(d for that grade). This normalizes out the overall grade scale and highlights which boulders are unusually hard or easy *for their grade*.

---

## 6. Key Findings

1. **Difficulty d strongly correlates with community grade** (R²=0.75), validating that the model recovers a meaningful difficulty signal purely from ascent patterns.

2. **Popularity π adds explanatory power** (R² rises to 0.79), suggesting that popular boulders tend to have slightly inflated grades (or that certain grades tend to attract more traffic).

3. **The sector-level hierarchy helps**: boulders in the same sector share a difficulty baseline, regularizing estimates for problems with few ascents.

4. **Per-climber try curves are meaningful**: γ_i (selectivity) and μ_try_i (preferred difficulty) vary systematically with climber ability.

5. **The model identifies sandbags and soft touches**: some boulders are consistently harder or easier than their community grade suggests, and these tend to cluster by area.

---

## 7. File Structure

```
vl-predictor/
├── data/
│   ├── ascents.jsonl           # ~1.36M ascent records
│   └── boulders.jsonl          # ~185k boulder metadata
├── vl_predictor/
│   ├── bayesian_model.py       # PyMC model definition + predictive utilities
│   ├── dataset.py              # Dataset construction (positive/negative sampling)
│   ├── validation.py           # Weighted R² computation
│   ├── model.py                # PyTorch embedding model (alternative approach)
│   └── loss.py                 # Torch loss functions
├── train_bayesian.py           # Main training script for the PyMC model
├── train.py                    # PyTorch neural net training (alternative approach)
├── analysis_bayesian.ipynb     # Posterior analysis notebook (what we've been exploring)
├── plot_hardest.py             # Standalone script for hardest-boulder plots
└── runs/
    └── bayesian_2026-06-29_20-48-58/
        ├── config.json          # Run configuration
        ├── dataset.pt           # Processed dataset tensors
        ├── checkpoints/         # Intermediate posterior snapshots (every 20k iters)
        └── validation_log.jsonl # R² metrics at each checkpoint
```
