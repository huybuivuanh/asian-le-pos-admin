# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js + Turbopack)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

**Stack**: Next.js 15 App Router, React 19, TypeScript, Firebase (Firestore + Auth), Zustand, Tailwind CSS v4, Radix UI, dnd-kit.

### Folder layout

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Protected route group (auth-gated layout: Navbar + AppModal)
│   │   ├── (standard)/     # Full-width pages: dashboard (/), orders, tables, customers, credits, users, …
│   │   └── menu/           # Collapsible sidebar + /menu/{categories,items,option-groups,options}
│   ├── login/              # Sign-in page
│   └── api/users/          # Server-side user management (firebase-admin); _auth.ts = admin token + business checks
├── features/               # Domain feature modules (named exports, file name = component name)
│   ├── add-extras/         # AddExtraList, AddExtraForm
│   ├── credits/            # CreditList, CreditTableRow, CreditForm
│   ├── customers/          # CustomerList, CustomerTableRow, CustomerForm
│   ├── menu/
│   │   ├── categories/     # CategoriesSection, CategoryList, CategoryForm, SortCategoriesForm, AddCategoryItemsForm
│   │   ├── items/          # ItemsSection, ItemList, ItemCard, ItemForm, AddItemOptionGroupsForm, SortOptionGroupsForm
│   │   ├── option-groups/  # OptionGroupsSection, OptionGroupList, OptionGroupCard, OptionGroupForm, AddGroupOptionsForm
│   │   ├── options/        # OptionsSection, OptionList, OptionForm
│   │   ├── publish/        # PublishMenuToolbar
│   │   └── MenuSidebar.tsx
│   ├── menu-changes/       # MenuChangeList, MenuChangeCard, MenuChangeForm, ItemChangeForm
│   ├── orders/             # OrderHistoryView, OrderCard, OrderItemBlock, RewardsBadge
│   ├── tables/             # TablesSection, AddTableDialog, EditTableDialog
│   └── users/              # UserList, UserForm
├── stores/                 # Zustand stores, one per domain (+ useModalStore for popups)
├── providers/              # AuthProvider
├── services/               # userService (calls Next.js API routes), rewardsService (Rewards Cloud Functions)
├── lib/                    # Shared utilities and Firestore helpers
│   ├── firebase-config.ts  # Firebase client SDK init (shared asianlepos project)
│   ├── business.ts         # current business from the admin's claim; bizCol/bizDoc path helpers
│   ├── firebase-admin.ts   # Firebase Admin SDK init
│   ├── linked-writes.ts    # Atomic (batched) writes for linked menu docs
│   ├── order-history-firestore.ts  # Order queries + print/paid/complete/cancel writes
│   ├── order-loyalty.ts    # Reverses rewards points on cancel
│   ├── order-calculations.ts  # orderItemsSubtotal, calculateTaxBreakdown (same math as POS)
│   ├── rewards-badge.ts    # Rewards badge text (same as POS)
│   ├── formatters.ts       # formatCurrency, formatTimestamp, formatOrderedAt, etc.
│   ├── list-utils.ts       # matchesQuery, sortCustomers, sortByNameAndCreated
│   ├── menu-item-option-groups.ts
│   ├── menu-unused.ts      # isUnusedItem/OptionGroup/Option (Unused badge + filter)
│   ├── option-group-updates.ts
│   ├── firestore-timestamp.ts
│   └── utils.ts            # cn() helper
├── components/
│   ├── ui/                 # Radix UI primitives (Button, Dialog, Input, Select, …)
│   └── layout/             # Navbar, PageHeader, SectionSidebar, RowParts, AppModal, EntityFormDialog
└── types/
    ├── global.d.ts         # All domain interfaces, declared globally (no import needed)
    └── enum.ts             # Enums (OrderStatus, KitchenType, etc.) — runtime values, import from @/types/enum
```

### Data flow

Two data-access patterns co-exist:

1. **Client → Firestore directly**: Zustand stores open `onSnapshot` listeners for real-time updates. Components read store state and call store actions.
2. **Client → API route → firebase-admin → Firestore**: Used for privileged operations (user management). `src/services/` calls `POST /api/users/*`; the API route uses the admin SDK.

### Store subscriptions

Stores are subscribed per-route in layout files under `src/app/(app)/`. Each route layout subscribes only to the stores it needs via a `useEffect` keyed on `[loading, user]`. Every Zustand store exposes a `subscribe(): () => void` method that returns its `onSnapshot` unsubscribe. When adding a new store, expose `subscribe` on it, then add it to the relevant route layout(s). Do not subscribe to stores inside feature components.

### Rewards

A second Firebase app connects to the Asian Le Rewards project (`NEXT_PUBLIC_REWARDS_FIREBASE_*`). Each browser signs in once as the shared POS account (role: "pos") from the Dashboard page; the login is separate from the admin login. Cancelling an order calls the Rewards `reverseOrder` function (skipped on the demo database).

### Auth

Firebase Auth with custom claims for role-based access. `AuthProvider` persists session and exposes user + role via `useAuth()`. Protected routes check auth state in the `(app)` layout.

### Conventions

- All interactive/stateful components are Client Components (`"use client"`).
- Feature components use named exports and the file name matches the component name. Only route files (`page.tsx`, `layout.tsx`) use default exports.
- Path alias `@/` maps to `src/`.
- Tailwind v4 with `clsx` + `tailwind-merge` via `cn()` for conditional classes.
- Firebase credentials live in `.env.local` (not tracked).
- **Types**: domain interfaces live in `src/types/global.d.ts` under `declare global` — use them directly without importing. Enums are runtime values, so import them from `@/types/enum`.
- **Formatting**: use helpers from `@/lib/formatters` (`formatTimestamp`, `formatCurrency`, etc.) — never inline `toLocaleString()` or `.toFixed(2)` directly in components.
- **Search/sort**: use `matchesQuery` and `sortByNameAndCreated` from `@/lib/list-utils`.
- **List components**: keep them thin — search state + filter + a loop. Extract per-item display into a `*Card` or `*Row` component that calls the store directly.
- **Add/edit forms**: one `<Entity>Form` per entity handles both — no entity prop = add, entity prop = edit. Build it on `EntityFormDialog` and load field values in `onOpenChange(true)` (not `useState(prop)`), so edits always start from the latest data.
- **Dialogs**: each dialog component owns its own loading/saving state and handlers. Pass only the minimal data needed (e.g. the selected entity) as props.
- **UI style** (matches asian-le-website-admin): page header = `PageHeader` (title + count + actions). List rows use `rowCardClass` / `rowHeaderClass` / `RowActions` (Edit + red Delete) / `RemoveButton` / `EmptyState` from `@/components/layout/RowParts`. Brand colors `ink`, `gold`, `on-ink` live in `globals.css`.
- **Linked menu data**: categories ↔ items, items ↔ option groups, option groups ↔ options keep id lists on both sides. Change or delete them only through `@/lib/linked-writes` (one Firestore batch each), never with two separate store calls.
- **Popups**: never use `window.alert` / `window.confirm`. Use `alertDialog` / `confirmDialog` from `@/stores/useModalStore` (`{ danger: true, confirmLabel: "Delete" }` for deletes).

## Shared Firebase project

pos-admin uses the shared `asianlepos` project with the POS, KDS, Orders app, website and rewards.

- **All data is under `businesses/{businessId}/…`** — build client paths with `bizCol` / `bizDoc` (`src/lib/business.ts`), never `collection(clientDb, …)`.
- **Only admins sign in:** custom claims `{ businessId, role: "admin" }`. `AuthProvider` checks after sign-in and on restore, sets the business, and signs out anyone else.
- **User API routes** (`src/app/api/users/*`) use the Admin SDK, which skips security rules, so `_auth.ts` checks every call: the client sends the admin's ID token (`postAsAdmin` in `userService.ts`), `requireAdmin` verifies it, and the business always comes from that token — never the request body. Update/delete only touch users of the same business; an admin can't demote or delete themselves.
- **Roles** are `staff` (POS, KDS, Orders app) and `admin` (everything). Creating/updating a user sets claims `{ businessId, role }` and writes the display copy to `businesses/{id}/users/{uid}`.
- **Rewards** functions (same project) are called with the admin's login.
- Security rules live in the separate `D:\Projects\asian-le-firebase` repo. The App Store review Demo is just another business.
