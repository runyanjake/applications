import { useContext } from "react";
import { StorageContext } from "../providers/storage-provider";

export function useStorage() {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error("useStorage must be used within StorageProvider");
  return ctx;
}
