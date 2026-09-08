import type { PickerDocument } from "../../types/google";
import { ENV } from "../../config/env";
import { createLogger } from "../../utils/logger";

const log = createLogger("picker");

/** Only one picker may be open at a time; a stale instance blocks new ones. */
let openPicker: { setVisible(visible: boolean): void; dispose(): void } | null =
  null;

/** Hide and tear down the active picker so the next open starts clean. */
function closeActivePicker(): void {
  if (!openPicker) return;
  const picker = openPicker;
  openPicker = null;
  try {
    picker.setVisible(false);
    picker.dispose();
  } catch (err) {
    log.warn("Failed to dispose picker:", err);
  }
}

/**
 * Show the Google Picker and resolve with the chosen spreadsheet,
 * or `null` if the user cancelled.
 *
 * The instance is always disposed on the way out. Google's Picker leaves its
 * dialog and backdrop in the DOM otherwise, which stops any *subsequent*
 * picker from becoming visible — the "nothing happens on the second open" bug.
 */
export function openSpreadsheetPicker(
  accessToken: string,
): Promise<PickerDocument | null> {
  const picker = window.google?.picker;
  if (!picker) {
    return Promise.reject(
      new Error(
        "Google Picker failed to load. Reload the page, and check that the " +
          "Google Picker API is enabled for this project.",
      ),
    );
  }

  // A picker left over from a previous open would swallow this one.
  closeActivePicker();

  return new Promise((resolve, reject) => {
    try {
      const view = new picker.DocsView(picker.ViewId.SPREADSHEETS);
      view.setMimeTypes("application/vnd.google-apps.spreadsheet");

      const instance = new picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(ENV.googleApiKey)
        .setCallback((data) => {
          log.debug("Picker callback:", data.action);
          if (data.action === picker.Action.PICKED) {
            const doc = data.docs?.[0];
            closeActivePicker();
            resolve(
              doc
                ? {
                    id: doc.id,
                    name: doc.name,
                    mimeType: doc.mimeType,
                    url: doc.url,
                  }
                : null,
            );
          } else if (data.action === picker.Action.CANCEL) {
            closeActivePicker();
            resolve(null);
          }
          // Other actions (e.g. "loaded") are progress notifications.
        })
        .build();

      openPicker = instance;
      instance.setVisible(true);
    } catch (err) {
      log.error("Failed to open picker:", err);
      closeActivePicker();
      reject(
        err instanceof Error
          ? err
          : new Error("Could not open the Google Picker."),
      );
    }
  });
}
