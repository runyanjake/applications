import { useState, useEffect } from "react";
import { getTimezone, saveTimezone, TIMEZONE_OPTIONS } from "../../utils/timezone-store";

export function TimezoneCard() {
  const [tz, setTz] = useState(getTimezone);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTz(getTimezone());
  }, []);

  const handleSave = () => {
    saveTimezone(tz);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputCls =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Timezone</h2>
      <p className="mb-4 text-sm text-gray-500">
        Dates and times are stored in UTC and displayed in your selected timezone.
      </p>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Display timezone
          </label>
          <select
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            className={inputCls}
          >
            {TIMEZONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {saved && <p className="text-sm text-green-600">Saved!</p>}
        <button
          onClick={handleSave}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}
