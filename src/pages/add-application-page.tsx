import { useState } from "react";
import { useApplications } from "../hooks/use-applications";
import { useStorage } from "../hooks/use-storage";
import type { ApplicationFormData } from "../types/application";
import { PageHeader } from "../components/shared/page-header";
import { ApplicationForm } from "../components/applications/application-form";
import { SpreadsheetSetup } from "../components/dashboard/spreadsheet-setup";

export function AddApplicationPage() {
  const { isConfigured } = useStorage();
  const { addApplication } = useApplications();
  const [success, setSuccess] = useState(false);

  if (!isConfigured) return <SpreadsheetSetup />;

  const handleSubmit = async (data: ApplicationFormData) => {
    addApplication(data);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div>
      <PageHeader
        title="Add Application"
        description="Track a new job application"
      />

      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Application added successfully!
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <ApplicationForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
