"use client";

import { Suspense } from "react";
import { Toaster } from "sonner";
import { SmoothAnchors } from "@/components/marketing/smooth-anchors";
import { MotionProvider } from "@/components/ui/motion";
import { TooltipProvider } from "@/components/ui/overlay";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <TooltipProvider delayDuration={250}>
        {children}
        {/* Reads the URL, so it must stream behind a boundary under Cache Components. */}
        <Suspense fallback={null}>
          <SmoothAnchors />
        </Suspense>
        <Toaster
          theme="dark"
          position="bottom-right"
          offset={20}
          mobileOffset={{ bottom: 84 }}
          toastOptions={{
            classNames: {
              toast: "!bg-surface-2 !border !border-line-strong !text-fg !rounded-lg !shadow-[0_16px_48px_rgb(0_0_0/0.5)] !font-sans",
              description: "!text-muted",
              success: "[&_[data-icon]]:!text-success",
              error: "[&_[data-icon]]:!text-danger",
            },
          }}
        />
      </TooltipProvider>
    </MotionProvider>
  );
}
