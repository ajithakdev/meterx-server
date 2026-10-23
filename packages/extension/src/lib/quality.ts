/**
 * Quality rules live in @meterx/shared so the site uses the same ones; this file adds the toolbar badge colours.
 * @license AGPL-3.0
 */

import type { Quality } from '@meterx/shared';

export { getQuality, qualityOf, scoreUseCases, USE_CASES, type QualityLabel, type UseCaseScore, type UseCaseScores } from '@meterx/shared';

/** Toolbar badge colours. Kept in sync with the --q-* tokens in static/styles/tokens.css. */
export const QUALITY_COLORS: Record<Quality, string> = {
    excellent: '#0f9f6e',
    good: '#2f7de1',
    fair: '#c27c0e',
    poor: '#d64545',
};
