"use client";

import { useSearchParams } from "next/navigation";
import { GeneralSection } from "./sections/GeneralSection";
import { CollectionSection } from "./sections/CollectionSection";
import { UsersSection } from "./sections/UsersSection";
import type { SectionId } from "./layout";

const SECTION_COMPONENTS: Record<SectionId, React.ComponentType> = {
  general: GeneralSection,
  collection: CollectionSection,
  users: UsersSection,
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const currentSection = (searchParams.get("section") as SectionId) || "general";

  const SectionComponent = SECTION_COMPONENTS[currentSection] || GeneralSection;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      <SectionComponent />
    </div>
  );
}
