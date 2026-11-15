export type ExpenseCategoryOption = { id: string; name: string; icon: string | null };

export const categoryOptionLabel = (c: { icon: string | null; name: string }) => (c.icon ? `${c.icon} ${c.name}` : c.name);
