/**
 * v11 adds private free-creation exhibitions. v10 production stays unchanged.
 * v6 blueprint geometry and all reserved materials remain unchanged.
 * Older readers must reject this format rather than replay production rewards.
 * Save readers reject versions newer than this switch.
 */
export const CURRENT_SAVE_VERSION: 5 | 6 | 7 | 8 | 9 | 10 | 11 = 11;
