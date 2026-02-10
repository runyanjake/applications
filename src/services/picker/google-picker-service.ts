import type { PickerDocument } from "../../types/google";
import { ENV } from "../../config/env";

export function openSpreadsheetPicker(
  accessToken: string,
): Promise<PickerDocument | null> {
  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView(
      window.google.picker.ViewId.SPREADSHEETS,
    );
    view.setMimeTypes(
      "application/vnd.google-apps.spreadsheet",
    );

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(ENV.googleApiKey)
      .setCallback((data) => {
        if (
          data.action === window.google.picker.Action.PICKED &&
          data.docs?.[0]
        ) {
          const doc = data.docs[0];
          resolve({
            id: doc.id,
            name: doc.name,
            mimeType: doc.mimeType,
            url: doc.url,
          });
        } else if (
          data.action === window.google.picker.Action.CANCEL
        ) {
          resolve(null);
        }
      })
      .build();

    picker.setVisible(true);
  });
}
