# SentiMate — Design System & Visual Specification

## 1. Design Principles & Personality
- **Core Personality**: Calm, credible, warm, and professional. Crafted with the finish of a premier modern healthcare and student wellbeing SaaS platform.
- **Tone & Empathy**: Respectful, non-judgmental, transparent. Never patronizing, never using forced positivity or guilt-based engagement.
- **Copy Boundaries**: Use supportive language without claiming clinical diagnostic capability, guarantees of improvement, or replacement of professional medical/counselling support.
- **Visual Restraint**: 
  - Strictly avoid generic purple-blue AI gradients.
  - Strictly avoid pages made entirely of identical rounded cards.
  - Strictly avoid excessive glowing borders, floating neon blobs, sparkles, or decorative generic AI icons.
  - Strictly avoid fake testimonials, fabricated user counts, fake ratings, or unverified claims.
  - Strictly avoid unnecessary parallax, distracting loops, or visual clutter.

---

## 2. Tooling & Figma Status
- **Figma MCP Status**: Inspected environment on 2026-10-19. Neither Figma MCP server nor external Figma OAuth tokens are configured in the current toolchain (available MCPs: `StitchMCP`, `supabase-mcp-server`).
- **Design System Authority**: Standalone production token system specified below in CSS custom properties and Tailwind tokens.
- **Screen Specifications Documented**:
  - Landing page (Hero, Interactive preview, How it works, Privacy & Control, Human support, FAQ, Footer)
  - Student Workspace (`/student/chat`, sidebar, conversation view, accessible multiline composer, check-ins, profile)
  - Counsellor Workspace (`/counsellor/dashboard`, review queue, case management, availability & appointments)
  - Admin Console (`/admin/dashboard`, counsellor provisioning, user management, audit logs, system health)

---

## 3. Design Tokens & Color Palette

### 3.1 Light Theme (Warm Canvas & Restrained Teal)
- **Background Root**: `#FBFBFA` (Warm off-white / alabaster canvas)
- **Surface Level 1**: `#FFFFFF` (Pure white card / panel surface)
- **Surface Level 2**: `#F4F4F1` (Subtle muted container / input background)
- **Surface Level 3**: `#EAEAE5` (Hover / active element surface)
- **Border Subtle**: `#E2E2DC` (Soft neutral border)
- **Border Strong**: `#C8C8C0` (High-contrast focus / active border)
- **Text Primary**: `#18191B` (Charcoal near-black, high contrast)
- **Text Secondary**: `#4A4D54` (Muted readable neutral, meets WCAG 4.5:1)
- **Text Tertiary**: `#71757E` (Subtle captions, timestamps)
- **Teal Primary (Brand)**: `#0D766E` (Tailwind teal-700 — grounded, clinical yet warm)
- **Teal Hover**: `#0F766E`
- **Teal Light (Accent Surface)**: `#F0FDFA` (Tailwind teal-50)
- **Teal Subtle Border**: `#CCFBF1` (Tailwind teal-100)
- **Warning / Amber**: `#B45309` (Amber-700) on `#FFFBEB`
- **Critical / Danger**: `#B91C1C` (Red-700) on `#FEF2F2`
- **Success**: `#047857` (Emerald-700) on `#ECFDF5`

### 3.2 Dark Theme (Deep Slate Charcoal & Muted Teal)
- **Background Root**: `#0F1115` (Deep charcoal canvas, comfortable on eyes)
- **Surface Level 1**: `#17191E` (Panel surface)
- **Surface Level 2**: `#1F2228` (Elevated card / composer background)
- **Surface Level 3**: `#282C34` (Hover / active input surface)
- **Border Subtle**: `#2C3038` (Comfortable dark neutral border)
- **Border Strong**: `#3E434E` (Selected / focus border)
- **Text Primary**: `#F3F4F6` (Crisp readable light slate)
- **Text Secondary**: `#9CA3AF` (Muted secondary slate)
- **Text Tertiary**: `#6B7280` (Muted timestamps / hints)
- **Teal Primary (Brand)**: `#14B8A6` (Teal-500 — accessible contrast against dark surface)
- **Teal Hover**: `#2DD4BF`
- **Teal Dark Surface**: `rgba(20, 184, 166, 0.12)`
- **Teal Subtle Border**: `rgba(20, 184, 166, 0.25)`
- **Warning / Amber**: `#FBBF24` (Amber-400) on `rgba(245, 158, 11, 0.12)`
- **Critical / Danger**: `#F87171` (Red-400) on `rgba(239, 68, 68, 0.12)`
- **Success**: `#34D399` (Emerald-400) on `rgba(16, 185, 129, 0.12)`

### 3.3 Glassmorphism Rules
- Use strictly for floating navigation headers and modal overlays.
- Light Theme: `background: rgba(251, 251, 250, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(226, 226, 220, 0.8);`
- Dark Theme: `background: rgba(15, 17, 21, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(44, 48, 56, 0.8);`
- Opaque fallbacks provided automatically via `@supports not (backdrop-filter: blur(1px))`.

### 3.4 Skeleton Loading Tokens & Motion Design
- **Light Theme Placeholder Tokens**:
  - Surface Base (`--skeleton-base`): `#E8E8E2` (Soft neutral tone harmonious with `#FBFBFA` canvas).
  - Shimmer Highlight (`--skeleton-highlight`): `#F5F5F2` (Gentle highlight providing subtle luminance contrast without stark glare).
- **Dark Theme Placeholder Tokens**:
  - Surface Base (`--skeleton-base`): `#22262E` (Muted slate-charcoal harmonious with `#0F1115` canvas).
  - Shimmer Highlight (`--skeleton-highlight`): `#2C323D` (Restrained lighter charcoal sweep avoiding flash or distraction).
- **Shimmer Animation Specification**:
  - Linear gradient: `linear-gradient(90deg, var(--skeleton-base) 0%, var(--skeleton-highlight) 50%, var(--skeleton-base) 100%)`.
  - Background size: `200% 100%`.
  - Timing: `1.5s infinite ease-in-out`.
  - Reduced Motion (`prefers-reduced-motion: reduce`): Shimmer animation is disabled; renders a static, neutral background to respect user vestibular comfort.
- **Accessibility Invariants**:
  - All decorative skeleton silhouettes (`Skeleton`) specify `aria-hidden="true"`.
  - Asynchronous content boundaries are enclosed in `<LoadingRegion>` which toggles `aria-busy="true"` and issues exactly one polite `<span className="sr-only" role="status" aria-live="polite">` announcement per loading zone.
- **Data State Principles**:
  - Initial load: Render structural skeletons matching the target content layout (cards, lists, tables, charts, or form grids).
  - Success: Transition immediately to real data.
  - Empty: Calm, actionable `<EmptyState>` with a relevant primary trigger (e.g., booking an appointment or creating a session).
  - Error: Concise `<ErrorState>` with a keyboard-accessible retry trigger.
  - Refreshes/Form Saves: Existing populated data remains visible while buttons show non-blocking pending indicators to prevent duplicate submissions without layout jarring.
  - Numerical Validity: Treat zero (`0`) as a valid metric, GPA, or count rather than mistaking it for missing or uninitialized state.

### 3.5 Glassmorphic Toast Notification Tokens & Placement
- **Visual Design Philosophy**:
  - Translucent frosted glass matching reference with `backdrop-filter: blur(16px)` and opaque fallback.
  - Fine 1px subtle neutral border and soft layered drop-shadow.
  - 16px corner radii (`rounded-2xl`) and comfortable `p-3.5 sm:p-4` padding.
  - Small outlined status icon on left, title & optional description in middle, discreet close button on right.
  - Background blur applies strictly to the toast surface; the underlying page remains pin-sharp and interactive.
- **Light Theme Tokens**:
  - Surface (`--toast-bg`): `rgba(255, 255, 255, 0.88)` (Warm translucent white).
  - Border (`--toast-border`): `rgba(226, 226, 220, 0.85)` (Subtle neutral border).
  - Shadow (`--toast-shadow`): `0 12px 32px -4px rgba(24, 25, 27, 0.08), 0 4px 12px -2px rgba(24, 25, 27, 0.04)`.
  - Title (`--toast-title`): `#18191B` (Dark charcoal, high contrast).
  - Description (`--toast-desc`): `#5E626C` (Muted readable neutral).
  - Success Accent (`--toast-success-accent`): `#0D766E` (Muted clinical teal).
  - Success Badge Bg (`--toast-success-bg`): `rgba(13, 118, 110, 0.08)`.
  - Error Accent (`--toast-error-accent`): `#DC2626` (Restrained crimson red).
  - Warning Accent (`--toast-warning-accent`): `#D97706` (Muted amber).
  - Info Accent (`--toast-info-accent`): `#2563EB` (Restrained soft blue).
- **Dark Theme Tokens**:
  - Surface (`--toast-bg`): `rgba(23, 25, 30, 0.88)` (Translucent smoked charcoal).
  - Border (`--toast-border`): `rgba(255, 255, 255, 0.09)` (Restrained light border).
  - Shadow (`--toast-shadow`): `0 14px 36px -4px rgba(0, 0, 0, 0.55), 0 4px 16px -2px rgba(0, 0, 0, 0.35)`.
  - Title (`--toast-title`): `#F3F4F6` (Crisp light slate).
  - Description (`--toast-desc`): `#9CA3AF` (Muted secondary slate).
  - Success Accent (`--toast-success-accent`): `#14B8A6` (Soft glowing teal).
  - Success Badge Bg (`--toast-success-bg`): `rgba(20, 184, 166, 0.12)`.
  - Error Accent (`--toast-error-accent`): `#F87171` (Soft readable red).
  - Warning Accent (`--toast-warning-accent`): `#FBBF24` (Soft amber).
  - Info Accent (`--toast-info-accent`): `#60A5FA` (Soft readable blue).
- **Placement & Layering**:
  - Fixed top-right: Desktop & tablet 20px margin (`sm:top-5 sm:right-5`), max-width 400px.
  - Mobile: Full width with 12px side margins (`left-3 right-3 sm:left-auto`).
  - Safe-Area Inset: `marginTop: env(safe-area-inset-top, 0px)`.
  - Overlay Layering: `z-[100]` with `pointer-events-none` container and `pointer-events-auto` cards.
  - Stacking: Displays at most 3 visible toasts simultaneously; queue bounded at 10 items.
- **Motion & Accessibility**:
  - Short fade and subtle vertical slide: `toast-enter` (220ms cubic-bezier(0.16, 1, 0.3, 1)), `toast-exit` (180ms).
  - `prefers-reduced-motion`: Animations and transforms zeroed.
  - Live Region: Polite announcements for success/info, assertive for actionable errors.
  - Pause on hover and keyboard focus: Resumes countdown on leave/blur.

---

## 4. Typography Hierarchy
- **Font Family**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Scale**:
  - `Hero Display`: 40px – 56px (line-height: 1.15, font-weight: 700, letter-spacing: -0.025em)
  - `Heading 1`: 28px – 34px (line-height: 1.25, font-weight: 600, letter-spacing: -0.02em)
  - `Heading 2`: 22px – 26px (line-height: 1.3, font-weight: 600, letter-spacing: -0.015em)
  - `Heading 3`: 17px – 19px (line-height: 1.4, font-weight: 600)
  - `Body Large`: 16px (line-height: 1.6, font-weight: 400)
  - `Body Base`: 14px – 15px (line-height: 1.55, font-weight: 400)
  - `Caption / Meta`: 12px – 13px (line-height: 1.45, font-weight: 500)
- **Line Length**: Max 65 to 75 characters for conversational messages and articles to ensure effortless reading comfort.

---

## 5. Responsive Breakpoints & Viewport Behavior
- **Mobile (< 640px / ~360px tested)**:
  - Sidebar folds into an accessible slide-over drawer with backdrop overlay.
  - Chat composer hugs the bottom safe area with sticky positioning.
  - Touch targets minimum 44px × 44px for primary controls.
  - Tables adapt into card-based summary views with direct action triggers.
- **Tablet (640px – 1024px / ~768px tested)**:
  - Responsive 2-column grids for dashboard cards and review queues.
  - Collapsible sidebar with icon/title mode.
- **Laptop & Desktop (1024px – 1440px+)**:
  - Two/three-pane layouts (Navigation | List/History | Active View/Detail).
  - Fixed-width maximum containers for chat reading line lengths (max-w-3xl).

---

## 6. Accessibility & Motion Guidelines
- **WCAG Compliance**: Strict WCAG 2.2 Level AA compliance across both color themes.
- **Focus Indicators**: 2px solid teal offset outline (`ring-2 ring-teal-500 ring-offset-2 ring-offset-background`) on keyboard navigation (`:focus-visible`).
- **Status Communication**: Never communicate state solely by color; always accompany with clear text, badge labels, or accessible icons with `aria-label`.
- **Motion**:
  - Fast, purposeful micro-transitions (150ms to 200ms cubic-bezier(0.16, 1, 0.3, 1)).
  - Respect `prefers-reduced-motion: reduce` by zeroing transition durations and transforms.
