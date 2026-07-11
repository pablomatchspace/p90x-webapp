# FFMI Target Feasibility Requirements (Reality Check)

This document is the authoritative specification (the "oracle") of the scientific and practitioner evidence tiers, constants, equations, and product policies used by the FFMI Target Feasibility engine.

---

## 1. Evidence Policy & Tiers

To build trust with athletes, all feasibility assessments must explicitly disclose the strength of the underlying evidence. We classify evidence into two primary tiers:
- **Tier A (Strong Clinical/Epidemiological Evidence)**: Direct peer-reviewed studies with large cohorts, controlled trials, or consensus statements from major sports nutrition organizations.
- **Tier B (Practitioner Observations & Heuristics)**: Models derived from longitudinal tracking of natural athletes by coaches, or retrospective analyses of competitive drug-free bodybuilders.

---

## 2. Muscle-Gain Rate Models (Tier B)

Two peer-reviewed practitioner heuristic models are presented side by side (with no picker). 

### 2.1 Aragon %BW Model (Aragon 2012)
- **Reference**: Aragon, A. (2012). *Aragon Girth/Fat-Free Mass Equations and Rate of Gain Heuristics*.
- **Mechanism**: Muscle gain rate scales as a percentage of the athlete's current total body weight per month.
- **Tiers**:
  - **Novice**: 1.0% to 1.5% of bodyweight per month.
  - **Intermediate**: 0.5% to 1.0% of bodyweight per month.
  - **Advanced**: 0.25% to 0.5% of bodyweight per month.
- **Sex Adjustment**: No female multiplier is applied. Relative lean-mass gains under resistance training are similar between sexes (Refalo et al., 2025).

### 2.2 McDonald Absolute Model (McDonald 2009)
- **Reference**: McDonald, L. (2009). *The Lyle McDonald Model for Genetic Muscular Potential*.
- **Mechanism**: Absolute rate of lean mass gain per year for male natural lifters, mapped to years of training:
  - **Novice (Year 1)**: 9.0 to 11.0 kg per year (0.75 to 0.917 kg/month).
  - **Intermediate (Year 2)**: 4.5 to 5.5 kg per year (0.375 to 0.458 kg/month).
  - **Advanced (Year 3)**: 2.0 to 3.0 kg per year (0.167 to 0.25 kg/month).
- **Sex Adjustment**: Rates are halved (0.5× multiplier) for female users to reflect different baseline levels and hormonal profiles (McDonald, 2009).

---

## 3. Natural FFMI Ceilings (Tier A/A−)

- **Male Ceiling**: **25.0** (Based on Kouri et al., 1995, which identified a normalized FFMI ceiling of 25.0 in a cohort of 74 drug-free bodybuilders).
- **Female Ceiling**: **23.9** (Based on Harty et al., 2021, representing the 97.5th percentile of elite natural female strength/aesthetic athletes).
- **Display normalization**: Ceilings are normalized to a standard height of 1.8m (6.1-normalized) consistent with the app's overall FFMI representation.

---

## 4. Muscle-Sparing Fat Loss Pace (Tier A)

- **Reference**: Helms, E. R., Aragon, A. A., & Fitschen, P. J. (2014). *Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation*. Journal of the International Society of Sports Nutrition.
- **Mechanism**: To preserve lean mass during fat loss, body weight loss should target a rate of **0.5% to 1.0% of body weight per week**.
- **Verdict Mapping**:
  - **Realistic**: Weekly weight loss rate is $\le$ 1.0% of body weight (Helms high end).
  - **Aggressive**: Weekly rate is $\le$ 1.15% of body weight (product policy safety buffer).
  - **Unrealistic**: Weekly rate exceeds 1.15% of body weight.

---

## 5. Body Recomposition (Recomp) Simultaneity (Tier A/B)

- **Reference**: Barakat, C., et al. (2020). *Body Recomposition: Can Trained Individuals Build Muscle and Lose Fat at the Same Time?* Strength and Conditioning Journal.
- **Mechanism**: Simultaneous fat loss and muscle gain (recomposition) is possible but heavily influenced by training experience and starting body fat.
- **Verdict Mapping**:
  - **Novice** or **Current BF% $\ge$ 25%**: Marked as **"ok"** (highest likelihood).
  - **Intermediate**: Marked as **"harder"**.
  - **Advanced**: Marked as **"unlikely"**.
  - **Not simultaneous** (only gain or only loss required): Marked as **"not-applicable"**.

---

## 6. Concurrent-Training Caveat

- **Reference**: Wilson, J. M., et al. (2012). *Concurrent training: a meta-analysis examining interference of aerobic and resistance exercise*. Journal of Strength and Conditioning Research.
- **Mechanism**: Combining high-volume cardio (such as the intense plyometric and aerobic circuits in P90X) with hypertrophy protocols can attenuate maximal strength and muscle gains.
- **Product Policy**: The app displays a concurrent-training caveat citing Wilson 2012 to set expectations, but does not apply arbitrary numeric discount multipliers to the feasibility models.

---

## 7. Product Policies & Suggested Target Derivation

- **Verdict Bands (0.85× / 1.15×)**: 
  - **Realistic**: Required pace $\le 0.85 \times$ the high end of the best performing model.
  - **Aggressive**: Required pace $\le 1.15 \times$ the high end of the best performing model.
  - **Unrealistic**: Required pace $> 1.15 \times$ the high end of the best performing model.
- **Horizon & Baseline**:
  - **Baseline**: Current lean mass from the latest weigh-in; fallback is start lean mass.
  - **Horizon**: Remaining program days (calculated as $90 - \text{days elapsed}$). If no start date, default to 90. If days elapsed $\ge$ 90, display "program complete — fresh 90-day block" and set horizon to 90.
- **Suggested Feasible Target**:
  - Derived from the conservative (low-end) rate of gain of the lower model between Aragon and Lyle over the remaining horizon.
  - Capped at the sex-specific natural FFMI ceiling.
  - Hidden from the UI if the suggested target is not at least $0.1$ higher than the current FFMI.
- **Disclaimer**: All outputs are presented with the disclaimer: "Not medical or coaching advice."
