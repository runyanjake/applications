import { useState } from "react";
import {
  getTimezone,
  saveTimezone,
  TIMEZONE_OPTIONS,
} from "../../utils/timezone-store";
import { Button } from "../ui/button";
import { TitledCard } from "../ui/card";
import { Field, inputClass } from "../ui/field";
import { useSavedFlash } from "../../hooks/use-saved-flash";

export function TimezoneCard() {
  const [timezone, setTimezone] = useState(getTimezone);
  const { saved, flash } = useSavedFlash();

  const handleSave = () => {
    saveTimezone(timezone);
    flash();
  };

  return (
    <TitledCard
      title="Timezone"
      description="Dates and times are stored in UTC and displayed in your selected timezone."
    >
      <div className="space-y-4">
        <Field label="Display timezone">
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={inputClass}
          >
            {TIMEZONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        {saved && <p className="text-sm text-green-600">Saved!</p>}
        <Button onClick={handleSave}>Save</Button>
      </div>
    </TitledCard>
  );
}
