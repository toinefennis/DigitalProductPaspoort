// Preview-only fixtures. The real application retains its API, auth and routing.
export type DashboardStats = { totalProducts: number; totalRepairs: number; itemsOnLoan: number; remadeItems: number };
export type Product = { gtin: string };
export type Event = { id: number; eventType: string; description: string; createdAt: string };

const stats: DashboardStats = { totalProducts: 128, totalRepairs: 24, itemsOnLoan: 16, remadeItems: 8 };
const activities: (Event & { product: Product })[] = [
  { id: 1, eventType: "reparatie", description: "Werkjas gerepareerd en opnieuw beschikbaar", createdAt: "2026-10-07T10:30:00", product: { gtin: "08712345000123" } },
  { id: 2, eventType: "uitleen", description: "Product uitgeleend voor een circulair project", createdAt: "2026-10-07T09:15:00", product: { gtin: "08712345000130" } },
  { id: 3, eventType: "retour", description: "Product geretourneerd en gecontroleerd", createdAt: "2026-10-06T15:00:00", product: { gtin: "08712345000147" } },
  { id: 4, eventType: "remake", description: "Nieuw product gemaakt van hergebruikte materialen", createdAt: "2026-10-06T11:20:00", product: { gtin: "08712345000154" } },
];

export function useAuth() {
  return { isAuthenticated: true, isLoading: false, user: { role: "manager" } };
}
export function useLocation(): [string, (path: string) => void] {
  return ["/", () => {}];
}
export function useQuery<T>({ queryKey }: { queryKey: string[] }): { data: T; isLoading: boolean } {
  return { data: (queryKey[0].endsWith("/stats") ? stats : activities) as T, isLoading: false };
}
export function useQueryClient() {
  return { invalidateQueries: async (_options: unknown) => {} };
}
export function useMutation(_options: {
  mutationFn: (id: number) => Promise<unknown>;
  onSuccess: () => void;
  onError: (error: unknown) => void;
}) {
  return { mutate: (_id: number) => {} };
}
export function useToast() {
  return { toast: (_options: unknown) => {} };
}
export async function apiRequest() {
  return {};
}
