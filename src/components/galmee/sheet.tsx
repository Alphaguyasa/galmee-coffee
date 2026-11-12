"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A bottom sheet on phones (grab handle, rounded top), a centred dialog from
 * 640 px up. Built on the native <dialog> so focus trapping and Esc come free.
 * For confirmations and short sub-flows; anything over three fields gets a page.
 */
export function Sheet({
  open,
  onClose,
  title,
  closeLabel,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 w-full max-w-full bg-transparent p-0 backdrop:bg-black/40",
        "fixed inset-x-0 top-auto bottom-0",
        "sm:inset-0 sm:m-auto sm:h-fit sm:max-w-md",
        className,
      )}
    >
      <div className="rounded-t-xl bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-md motion-safe:animate-[sheet-up_200ms_ease-out]">
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex size-12 items-center justify-center rounded-md hover:bg-band"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
