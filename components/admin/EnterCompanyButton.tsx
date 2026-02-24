"use client";

import React from "react";
import { LogIn } from "lucide-react";
import { useActiveCompany } from "@/context/ActiveCompanyContext";

/**
 * EnterCompanyButton
 * Reusable button for "Login As" / Support Mode.
 */
export default function EnterCompanyButton({
  companyId,
  companySlug,
  disabled,
  className,
  onError,
}: {
  companyId: number | string;
  companySlug?: string | null;
  disabled?: boolean;
  className?: string;
  onError?: (message: string) => void;
}) {
  const { enterCompany } = useActiveCompany();

  const buildTenantLoginUrl = (slug: string) => {
    const { protocol, hostname, port } = window.location;

    const envSuffix = process.env.NEXT_PUBLIC_TENANT_HOST_SUFFIX;
    const inferredSuffix = (() => {
      if (hostname === "localhost" || hostname.endsWith(".localhost")) return "localhost";
      if (hostname === "local" || hostname.endsWith(".local")) return "local";
      const parts = hostname.split(".");
      if (parts.length <= 1) return hostname;
      return parts.slice(1).join(".");
    })();

    const suffix = (envSuffix && String(envSuffix).trim()) || inferredSuffix;
    const host = `${slug}.${suffix}`;
    const portPart = port ? `:${port}` : "";

    return `${protocol}//${host}${portPart}/auth/login`;
  };

  const handleClick = async () => {
    try {
      if (companySlug && String(companySlug).trim()) {
        window.location.assign(buildTenantLoginUrl(String(companySlug).trim()));
        return;
      }

      await enterCompany(companyId);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as any).message) : "Failed to enter company context";
      onError?.(msg);
    }
  };

  return (
    <button type="button" onClick={handleClick} disabled={disabled} className={className}>
      <LogIn className="w-3 h-3" />
      Login As
    </button>
  );
}
