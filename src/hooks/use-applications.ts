import { useContext } from "react";
import { ApplicationContext } from "../providers/application-provider";

export function useApplications() {
  const ctx = useContext(ApplicationContext);
  if (!ctx)
    throw new Error(
      "useApplications must be used within ApplicationProvider",
    );
  return ctx;
}
