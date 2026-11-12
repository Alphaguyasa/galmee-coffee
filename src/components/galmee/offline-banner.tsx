"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * A full-width strip under the header whenever the connection drops.
 * The label comes in as a prop so the component copies between apps unchanged.
 */
export function OfflineBanner({ label, className }: { label: string; className?: string }) {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-2 bg-warn/10 px-4 py-2.5 text-sm font-semibold text-warn",
        className,
      )}
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      {label}
    </p>
  );
}
