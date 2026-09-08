import { useState } from "react";
import { useApplications } from "../hooks/use-applications";
import type { ApplicationFormData } from "../types/application";
import { PageHeader } from "../components/ui/page-header";
import { Alert } from "../components/ui/alert";
import { Card } from "../components/ui/card";
import { RequireSpreadsheet } from "../components/routing/require-spreadsheet";
import { ApplicationForm } from "../components/applications/application-form";

export function AddApplicationPage() {
  const { addApplication } = useApplications();
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (data: ApplicationFormData) => {
    addApplication(data);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <RequireSpreadsheet>
      <PageHeader
        title="Add Application"
        description="Track a new job application"
      />

      {success && (
        <Alert tone="success" className="mb-4">
          Application added successfully!
        </Alert>
      )}

      <Card className="p-6">
        <ApplicationForm onSubmit={handleSubmit} />
      </Card>
    </RequireSpreadsheet>
  );
}
