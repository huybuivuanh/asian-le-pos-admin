/**
 * Changes that touch two collections at once, e.g. a category and the menu items that
 * point back to it. Each one is a single Firestore batch, so it either fully succeeds or
 * changes nothing; the two sides can't end up disagreeing. The stores' live listeners
 * pick up the result, so nothing needs re-fetching. (Same as asian-le-website-admin.)
 *
 * Use these instead of calling two store actions one after another.
 */
import { bizDoc } from "@/lib/business";
import { writeBatch } from "firebase/firestore";
import { clientDb } from "@/lib/firebase-config";
import {
  itemReferencesOptionGroup,
  removeOptionGroupRef,
} from "@/lib/menu-item-option-groups";
import {
  patchClearDefaultIfNotInOptionIds,
  patchClearDefaultIfOptionRemoved,
} from "@/lib/option-group-updates";
import { useCategoriesStore } from "@/stores/useCategoriesStore";
import { useItemStore } from "@/stores/useItemStore";
import { useOptionGroupStore } from "@/stores/useOptionGroupStore";
import { useOptionStore } from "@/stores/useOptionStore";

const CATEGORIES = "categories";
const MENU_ITEMS = "menuItems";
const OPTION_GROUPS = "optionGroups";
const OPTIONS = "options";

type Write =
  | { kind: "update"; collection: string; id: string; data: Record<string, unknown> }
  | { kind: "delete"; collection: string; id: string };

/** Firestore allows at most 500 writes per batch. */
const MAX_BATCH_WRITES = 500;

async function commit(writes: Write[]) {
  if (writes.length > MAX_BATCH_WRITES) {
    // Far beyond what this menu can produce; refuse rather than split into several
    // batches and lose the all-or-nothing guarantee.
    throw new Error(`Too many changes at once (${writes.length}).`);
  }
  if (writes.length === 0) return;
  // clientDb is read here (not at import) so the demo database switch applies.
  const batch = writeBatch(clientDb);
  for (const w of writes) {
    const ref = bizDoc(w.collection, w.id);
    if (w.kind === "update") batch.update(ref, w.data);
    else batch.delete(ref);
  }
  await batch.commit();
}

function without(list: string[] | undefined, id: string): string[] {
  return (list ?? []).filter((x) => x !== id);
}

function withAdded(list: string[] | undefined, id: string): string[] {
  return [...new Set([...(list ?? []), id])];
}

/**
 * Updates for every doc whose membership in `ownerId` is out of line with `selectedIds`:
 * selected docs gain `ownerId` in their `field` list, the rest lose it. Checked against
 * each doc's own list, so docs that had drifted out of sync are corrected too, and docs
 * that are already right aren't written.
 */
function membershipUpdates<T extends { id?: string }>(
  collection: string,
  docs: T[],
  field: keyof T & string,
  ownerId: string,
  selectedIds: string[],
): Write[] {
  const selected = new Set(selectedIds);
  return docs
    .filter((d): d is T & { id: string } => d.id != null)
    .filter((d) => {
      const has = ((d[field] as string[] | undefined) ?? []).includes(ownerId);
      return selected.has(d.id) !== has;
    })
    .map((d) => {
      const current = d[field] as string[] | undefined;
      return {
        kind: "update" as const,
        collection,
        id: d.id,
        data: {
          [field]: selected.has(d.id) ? withAdded(current, ownerId) : without(current, ownerId),
        },
      };
    });
}

const categories = () => useCategoriesStore.getState().categories;
const menuItems = () => useItemStore.getState().items;
const optionGroups = () => useOptionGroupStore.getState().optionGroups;
const options = () => useOptionStore.getState().options;

// ---------- Categories ↔ menu items ----------

/** Sets which items are in a category, and updates each item's `categoryIds` to match. */
export async function setCategoryItems(categoryId: string, itemIds: string[]) {
  await commit([
    { kind: "update", collection: CATEGORIES, id: categoryId, data: { itemIds } },
    ...membershipUpdates(MENU_ITEMS, menuItems(), "categoryIds", categoryId, itemIds),
  ]);
}

export async function removeItemFromCategory(categoryId: string, itemId: string) {
  const category = categories().find((c) => c.id === categoryId);
  await setCategoryItems(categoryId, without(category?.itemIds, itemId));
}

/** Deletes a category and removes it from every item that was in it. */
export async function deleteCategory(categoryId: string) {
  await commit([
    { kind: "delete", collection: CATEGORIES, id: categoryId },
    ...menuItems()
      .filter((item) => item.id && item.categoryIds?.includes(categoryId))
      .map((item) => ({
        kind: "update" as const,
        collection: MENU_ITEMS,
        id: item.id!,
        data: { categoryIds: without(item.categoryIds, categoryId) },
      })),
  ]);
}

/** Saves a new category order (0, 1, 2, … in the given order) in one batch. */
export async function reorderCategories(orderedIds: string[]) {
  await commit(
    orderedIds.map((id, index) => ({
      kind: "update" as const,
      collection: CATEGORIES,
      id,
      data: { order: index },
    })),
  );
}

// ---------- Menu items ↔ option groups ----------

/**
 * Sets a menu item's option groups (and their order), and updates each group's
 * `itemIds` to match.
 */
export async function setMenuItemOptionGroups(itemId: string, optionGroupIds: OptionGroupId[]) {
  await commit([
    { kind: "update", collection: MENU_ITEMS, id: itemId, data: { optionGroupIds } },
    ...membershipUpdates(
      OPTION_GROUPS,
      optionGroups(),
      "itemIds",
      itemId,
      optionGroupIds.map((r) => r.optionGroupId),
    ),
  ]);
}

export async function removeOptionGroupFromItem(itemId: string, groupId: string) {
  const item = menuItems().find((m) => m.id === itemId);
  if (!item) return;
  await setMenuItemOptionGroups(itemId, removeOptionGroupRef(item, groupId));
}

/** Deletes a menu item and removes it from its categories and option groups. */
export async function deleteMenuItem(itemId: string) {
  await commit([
    { kind: "delete", collection: MENU_ITEMS, id: itemId },
    ...categories()
      .filter((c) => c.id && c.itemIds?.includes(itemId))
      .map((c) => ({
        kind: "update" as const,
        collection: CATEGORIES,
        id: c.id!,
        data: { itemIds: without(c.itemIds, itemId) },
      })),
    ...optionGroups()
      .filter((g) => g.id && g.itemIds?.includes(itemId))
      .map((g) => ({
        kind: "update" as const,
        collection: OPTION_GROUPS,
        id: g.id!,
        data: { itemIds: without(g.itemIds, itemId) },
      })),
  ]);
}

// ---------- Option groups ↔ options ----------

/**
 * Sets which options are in a group (clearing the default if it was removed), and
 * updates each option's `groupIds` to match.
 */
export async function setOptionGroupOptions(groupId: string, optionIds: string[]) {
  const group = optionGroups().find((g) => g.id === groupId);
  await commit([
    {
      kind: "update",
      collection: OPTION_GROUPS,
      id: groupId,
      data: {
        optionIds,
        ...(group ? patchClearDefaultIfNotInOptionIds(group, optionIds) : {}),
      },
    },
    ...membershipUpdates(OPTIONS, options(), "groupIds", groupId, optionIds),
  ]);
}

export async function removeOptionFromGroup(groupId: string, optionId: string) {
  const group = optionGroups().find((g) => g.id === groupId);
  await setOptionGroupOptions(groupId, without(group?.optionIds, optionId));
}

/** Deletes an option group and removes it from every menu item and option that used it. */
export async function deleteOptionGroup(groupId: string) {
  await commit([
    { kind: "delete", collection: OPTION_GROUPS, id: groupId },
    ...menuItems()
      .filter((item) => item.id && itemReferencesOptionGroup(item, groupId))
      .map((item) => ({
        kind: "update" as const,
        collection: MENU_ITEMS,
        id: item.id!,
        data: { optionGroupIds: removeOptionGroupRef(item, groupId) },
      })),
    ...options()
      .filter((o) => o.id && o.groupIds?.includes(groupId))
      .map((o) => ({
        kind: "update" as const,
        collection: OPTIONS,
        id: o.id!,
        data: { groupIds: without(o.groupIds, groupId) },
      })),
  ]);
}

/** Deletes an option and removes it from every group (clearing it as default where set). */
export async function deleteOption(optionId: string) {
  await commit([
    { kind: "delete", collection: OPTIONS, id: optionId },
    ...optionGroups()
      .filter((g) => g.id && g.optionIds?.includes(optionId))
      .map((g) => ({
        kind: "update" as const,
        collection: OPTION_GROUPS,
        id: g.id!,
        data: {
          optionIds: without(g.optionIds, optionId),
          ...patchClearDefaultIfOptionRemoved(g, optionId),
        },
      })),
  ]);
}
