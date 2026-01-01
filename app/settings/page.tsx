"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GeneralSection } from "./sections/GeneralSection";
import { CollectionSection } from "./sections/CollectionSection";
import { SessionsSection } from "./sections/SessionsSection";
import { UsersSection } from "./sections/UsersSection";
import { AboutSection } from "./sections/AboutSection";
import type { SectionId } from "./layout";

const SECTION_COMPONENTS: Record<SectionId, React.ComponentType> = {
  general: GeneralSection,
  collection: CollectionSection,
  sessions: SessionsSection,
  users: UsersSection,
  about: AboutSection,
};

function SettingsContent() {
  const searchParams = useSearchParams();
  const currentSection = (searchParams.get("section") as SectionId) || "general";

  const SectionComponent = SECTION_COMPONENTS[currentSection] || GeneralSection;

  return <SectionComponent />;
}

export default function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      <Suspense fallback={<div className="text-stone-500">Loading...</div>}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
