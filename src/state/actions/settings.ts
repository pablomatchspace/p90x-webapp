import { applyNutritionPatch } from '@/lib/nutrition'
import { applyWorkoutLink, type MediaKind, type ScoringSettings, type Settings } from '@/lib/shared'
import { applyPlayerPatch, applyScoringPatch, applyTimerPatch } from '@/lib/workouts'
import { useStore } from '@/state/store'

/**
 * SETUP-screen use-cases (US-070). Only raw inputs are written — every derived
 * number (LBM, BMI, target weight, scores…) is recomputed by pure functions.
 * Guards live with their domains (`applyScoringPatch`, `applyTimerPatch`,
 * `applyNutritionPatch`, `applyWorkoutLink`); nested groups get their own
 * patchers to keep the immer updates shallow and type-safe.
 */

type CoreSettings = Pick<
  Settings,
  'program' | 'units' | 'gender' | 'age' | 'height' | 'startWeight' | 'startBodyFat'
>

export function updateSettings(patch: Partial<CoreSettings>): void {
  useStore.getState().mutate((draft) => {
    Object.assign(draft.settings, patch)
  })
}

export function updateLimits(patch: Partial<Settings['limits']>): void {
  useStore.getState().mutate((draft) => {
    Object.assign(draft.settings.limits, patch)
  })
}

export function updateTargets(patch: Partial<Settings['targets']>): void {
  useStore.getState().mutate((draft) => {
    Object.assign(draft.settings.targets, patch)
  })
}

export function updateScoring(patch: Partial<ScoringSettings>): void {
  useStore.getState().mutate((draft) => {
    applyScoringPatch(draft.settings.scoring, patch)
  })
}

export function updateTimerSettings(patch: Partial<Settings['timer']>): void {
  useStore.getState().mutate((draft) => {
    applyTimerPatch(draft.settings.timer, patch)
  })
}

export function updatePlayerSettings(patch: Partial<Settings['player']>): void {
  useStore.getState().mutate((draft) => {
    applyPlayerPatch(draft.settings.player, patch)
  })
}

/** E19: update the default yoga play variant. */
export function updateYogaVariant(variant: Settings['yoga']): void {
  useStore.getState().mutate((draft) => {
    draft.settings.yoga = variant
  })
}

/** E20: self-reported training experience (feasibility rate tier). */
export function updateTraining(level: Settings['training']): void {
  useStore.getState().mutate((draft) => {
    draft.settings.training = level
  })
}

/** E22: nutrition-plan overrides — targets themselves stay derived (rule 2). */
export function updateNutrition(patch: Partial<Settings['nutrition']>): void {
  useStore.getState().mutate((draft) => {
    applyNutritionPatch(draft.settings.nutrition, patch)
  })
}

/** E23: set or clear one workout's video/audio deeplink. */
export function updateWorkoutLink(workoutKey: string, kind: MediaKind, url: string | null): void {
  useStore.getState().mutate((draft) => {
    applyWorkoutLink(draft.settings.workoutLinks, workoutKey, kind, url)
  })
}

/**
 * Free-form global notes (US-071) — the workbook's YOUR NOTES sheet. Autosaves
 * through the store's debounced persister and travels with export/import.
 */
export function setNotes(notes: string): void {
  useStore.getState().mutate((draft) => {
    draft.notes = notes
  })
}
