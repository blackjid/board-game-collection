---
name: Unified Navigation Refactor
overview: Move key application routes into a `(main)` route group with a persistent, unified Sidebar and Header layout. This integrates Home, Games, Picking, and Settings into a single cohesive navigation structure.
todos:
  - id: nav-user
    content: Create components/NavUser.tsx
    status: pending
  - id: app-sidebar
    content: Create components/AppSidebar.tsx
    status: pending
    dependencies:
      - nav-user
  - id: site-header
    content: Create components/SiteHeader.tsx
    status: pending
  - id: main-layout
    content: Create app/(main)/layout.tsx
    status: pending
    dependencies:
      - app-sidebar
      - site-header
  - id: move-home
    content: Move app/page.tsx to app/(main)/page.tsx
    status: pending
    dependencies:
      - main-layout
  - id: move-game
    content: Move app/game/ to app/(main)/game/
    status: pending
    dependencies:
      - main-layout
  - id: move-pick
    content: Move app/pick/ to app/(main)/pick/
    status: pending
    dependencies:
      - main-layout
  - id: move-settings
    content: Move app/settings/ to app/(main)/settings/
    status: pending
    dependencies:
      - main-layout
  - id: refactor-settings
    content: Refactor app/(main)/settings/page.tsx and remove layout
    status: pending
    dependencies:
      - move-settings
  - id: refactor-home
    content: Refactor HomeClient to remove legacy sidebar
    status: pending
    dependencies:
      - move-home
---

