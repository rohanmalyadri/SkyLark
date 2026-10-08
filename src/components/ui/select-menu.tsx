"use client";

import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Select as S } from "radix-ui";
import { cn } from "@/lib/utils";

export interface MenuOption {
  value: string;
  label: string;
  hint?: string;
}

const trigger =
  "group flex h-9 w-full items-center justify-between gap-2 rounded-md border border-line-strong bg-surface-2 px-3 text-left text-sm text-fg transition-[border-color,box-shadow] duration-150 hover:border-white/20 focus:outline-none focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--accent-soft)] data-[state=open]:border-accent data-[state=open]:shadow-[0_0_0_3px_var(--accent-soft)] data-[placeholder]:text-subtle disabled:cursor-not-allowed disabled:opacity-50";

export const menuPanel =
  "z-50 overflow-hidden rounded-lg border border-line-strong bg-surface-2 shadow-[0_18px_50px_rgb(0_0_0/0.55)] data-[state=open]:animate-[pop-in_140ms_ease-out]";

export const menuItem =
  "relative flex cursor-pointer select-none items-center gap-2 rounded-md py-2 pl-8 pr-3 text-[13px] text-muted outline-none transition-colors data-[highlighted]:bg-accent-soft data-[highlighted]:text-fg data-[state=checked]:text-fg data-[disabled]:pointer-events-none data-[disabled]:opacity-40";

/** Dark, on-brand replacement for the OS-drawn native <select> popup. */
export function SelectMenu({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onValueChange: (v: string) => void;
  options: MenuOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <S.Root value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <S.Trigger id={id} aria-label={ariaLabel} className={cn(trigger, className)}>
        <span className="truncate">
          <S.Value placeholder={placeholder} />
        </span>
        <S.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-subtle transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content position="popper" sideOffset={6} className={cn(menuPanel, "max-h-[min(320px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-40")}>
          <S.ScrollUpButton className="flex h-6 items-center justify-center text-subtle">
            <ChevronUp className="size-3.5" />
          </S.ScrollUpButton>
          <S.Viewport className="p-1">
            {options.map((o) => (
              <S.Item key={o.value} value={o.value} className={menuItem}>
                <S.ItemIndicator className="absolute left-2.5 inline-flex">
                  <Check className="size-3.5 text-accent" />
                </S.ItemIndicator>
                <S.ItemText>{o.label}</S.ItemText>
                {o.hint && <span className="ml-auto text-xs text-subtle">{o.hint}</span>}
              </S.Item>
            ))}
          </S.Viewport>
          <S.ScrollDownButton className="flex h-6 items-center justify-center text-subtle">
            <ChevronDown className="size-3.5" />
          </S.ScrollDownButton>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
