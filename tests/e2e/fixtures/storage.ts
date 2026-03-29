import type { Page } from "@playwright/test";

export const TUTORIAL_STORAGE_KEY = "frontier-flow:tutorial";
export const SEEN_TUTORIAL_STORAGE_STATE = {
  version: 1,
  hasSeenTutorial: true,
} as const;

export async function clearStorageAndMarkTutorialSeen(page: Page): Promise<void> {
  await page.addInitScript(
    ({ tutorialState, tutorialStorageKey }) => {
      window.localStorage.clear();
      window.localStorage.setItem(tutorialStorageKey, JSON.stringify(tutorialState));
    },
    {
      tutorialState: SEEN_TUTORIAL_STORAGE_STATE,
      tutorialStorageKey: TUTORIAL_STORAGE_KEY,
    },
  );
}