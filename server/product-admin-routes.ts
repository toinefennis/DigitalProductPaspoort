import type { Express } from "express";

interface ProductAdminDependencies {
  getUser(userId: number): Promise<{ role: string; isActive: boolean } | undefined>;
  archiveProduct(productId: number): Promise<boolean>;
}

export function registerProductAdminRoutes(
  app: Express,
  dependencies: ProductAdminDependencies,
) {
  app.patch("/api/products/:id/archive", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const sessionUser = (req as any).session?.user as { id?: number } | undefined;

    if (!Number.isSafeInteger(sessionUser?.id) || sessionUser!.id! <= 0) {
      return res.status(401).json({ message: "Log in om producten te beheren." });
    }

    try {
      const user = await dependencies.getUser(sessionUser!.id!);
      if (!user?.isActive) {
        return res.status(401).json({ message: "Log opnieuw in met een actief account." });
      }
      if (user.role !== "superadmin") {
        return res.status(403).json({ message: "Alleen een superadmin kan producten archiveren." });
      }

      const productId = Number(req.params.id);
      if (!Number.isSafeInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "Ongeldig productnummer." });
      }

      const archived = await dependencies.archiveProduct(productId);
      if (!archived) {
        return res.status(404).json({ message: "Product niet gevonden." });
      }

      return res.json({
        message: "Product gearchiveerd. Productgegevens, historie, meldingen en GS1-data zijn bewaard.",
      });
    } catch {
      console.error("Product archiving failed.");
      return res.status(500).json({ message: "Product archiveren is mislukt." });
    }
  });
}
