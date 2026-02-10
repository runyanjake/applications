import type { ApplicationFormData } from "../types/application";

export type ValidationErrors = Partial<Record<keyof ApplicationFormData, string>>;

export function validateApplicationForm(
  data: Partial<ApplicationFormData>,
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.position?.trim()) {
    errors.position = "Position is required";
  }

  if (!data.companyName?.trim()) {
    errors.companyName = "Company name is required";
  }

  if (!data.status) {
    errors.status = "Status is required";
  }

  if (!data.interest) {
    errors.interest = "Interest level is required";
  }

  if (
    data.salaryMin != null &&
    data.salaryMax != null &&
    data.salaryMin > data.salaryMax
  ) {
    errors.salaryMin = "Min salary cannot exceed max salary";
  }

  if (data.companyWebsite && !isValidUrl(data.companyWebsite)) {
    errors.companyWebsite = "Invalid URL";
  }

  if (data.jobPostingUrl && !isValidUrl(data.jobPostingUrl)) {
    errors.jobPostingUrl = "Invalid URL";
  }

  return errors;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
