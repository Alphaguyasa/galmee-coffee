"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { FormState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Field = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
};

export function AuthForm({
  action,
  fields,
  submitLabel,
  namespace,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: Field[];
  submitLabel: string;
  namespace: "auth" | "onboarding";
}) {
  const t = useTranslations(namespace);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid gap-4">
      {fields.map((f) => (
        <div key={f.name} className="grid gap-2">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input
            id={f.name}
            name={f.name}
            type={f.type ?? "text"}
            autoComplete={f.autoComplete}
            inputMode={f.inputMode}
            spellCheck={f.type === "email" ? false : undefined}
            autoCapitalize={f.type === "email" ? "none" : undefined}
            aria-describedby={f.hint ? `${f.name}-hint` : undefined}
            required
          />
          {f.hint ? (
            <p id={`${f.name}-hint`} className="text-sm text-muted-foreground">
              {f.hint}
            </p>
          ) : null}
        </div>
      ))}
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(state.error)}
        </p>
      ) : null}
      {state?.info ? (
        <p role="status" className="rounded-md bg-accent p-3 text-sm">
          {t(state.info)}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
