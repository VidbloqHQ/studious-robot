import { useContext } from "react";
import { TenantContext } from "../context/index";
import { TenantContextType } from "../types/index";

export const useTenantContext = (): TenantContextType => {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }

  return context;
};
