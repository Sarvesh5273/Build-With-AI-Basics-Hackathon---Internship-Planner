/** Overall discovery run window, shared by server and UI (private demo use: generous, still finite so a run always ends). */
export const DISCOVERY_RUN_MS = 300000;
/** After this, a run starts no new work and finishes what is in flight; DISCOVERY_RUN_MS is only a safety stop. */
export const DISCOVERY_WIND_DOWN_MS = 240000;
