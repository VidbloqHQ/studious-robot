import { useContext, useEffect } from "react";
import { TenantContext } from "../context";
import { Tenant } from "../types";

type ThemeProviderProps = {
  children: React.ReactNode;
};

/**
 * ThemeProvider handles the application of theme variables based on tenant settings.
 * It consumes the TenantContext to access tenant styling preferences.
 */
export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const tenantContext = useContext(TenantContext);

  // Apply theme based on tenant data
  useEffect(() => {
    if (tenantContext?.tenant) {
      applyThemeVariables(tenantContext.tenant);
    } else {
      applyDefaultTheme();
    }
  }, [tenantContext?.tenant]);

  return <>{children}</>;
};

/**
 * Applies theme variables from tenant configuration
 */
const applyThemeVariables = (tenantData: Tenant) => {
  // Apply base theme variables from tenant data
  document.documentElement.style.setProperty(
    "--sdk-primary-color",
    tenantData.primaryColor || "#4300B1"
  );
  document.documentElement.style.setProperty(
    "--sdk-secondary-color",
    tenantData.secondaryColor || "#7D6EA4"
  );
  document.documentElement.style.setProperty(
    "--sdk-accent-color",
    tenantData.accentColor || "#F55959"
  );
  document.documentElement.style.setProperty(
    "--sdk-text-primary-color",
    tenantData.textPrimaryColor || "#000000"
  );
  document.documentElement.style.setProperty(
    "--sdk-text-secondary-color",
    tenantData.textSecondaryColor || "#666666"
  );

  // Apply theme mode (light/dark)
  if (tenantData.theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};

/**
 * Applies default theme when no tenant data is available
 */
const applyDefaultTheme = () => {
  // Set default theme variables
  document.documentElement.style.setProperty("--sdk-primary-color", "#4300B1");
  document.documentElement.style.setProperty(
    "--sdk-secondary-color",
    "#7D6EA4"
  );
  document.documentElement.style.setProperty("--sdk-accent-color", "#F55959");
  document.documentElement.style.setProperty(
    "--sdk-text-primary-color",
    "#000000"
  );
  document.documentElement.style.setProperty(
    "--sdk-text-secondary-color",
    "#666666"
  );

  // By default, use light mode
  document.documentElement.classList.remove("dark");
};
