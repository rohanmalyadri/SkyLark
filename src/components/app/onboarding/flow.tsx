"use client";

import { useState } from "react";
import { toDraft, type ProfileDraft } from "@/components/app/profile/fields";
import type { CandidateProfile } from "@/lib/domain/types";
import { ChatIntake } from "./chat-intake";
import { OnboardingWizard } from "./wizard";

/**
 * Onboarding entry: the chat when Gemini is configured, the step-by-step form otherwise.
 * Switching either way carries the answers given so far.
 */
export function OnboardingFlow(props: { profile: CandidateProfile; firstName: string; fullName: string; avatarUrl: string | null; hasResume: boolean; chatAvailable: boolean }) {
  const { profile, chatAvailable, ...rest } = props;
  const [mode, setMode] = useState<"chat" | "form">(chatAvailable ? "chat" : "form");
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(profile));

  if (mode === "chat")
    return (
      <ChatIntake
        userId={profile.userId}
        initialDraft={draft}
        firstName={rest.firstName}
        hasResume={rest.hasResume}
        onSwitchToForm={(d) => {
          setDraft(d);
          setMode("form");
          window.scrollTo({ top: 0 });
        }}
      />
    );
  return (
    <OnboardingWizard
      {...rest}
      profile={profile}
      draft={draft}
      onSwitchToChat={
        chatAvailable
          ? (d) => {
              setDraft(d);
              setMode("chat");
              window.scrollTo({ top: 0 });
            }
          : undefined
      }
    />
  );
}
