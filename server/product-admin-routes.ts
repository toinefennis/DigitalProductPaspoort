import type { Express } from "express";

interface ProductAdminDependencies {
  getUser(userId: number): Promise<{ role: string; isActive: boolean } | undefined>;
  deleteProduct(productId: number): Promise<boolean>;
}

export function registerProductAdminRoutes(
  app: Express,
  dependencies: ProductAdminDependencies,
) {
  app.delete("/api/products/:id", async (req, res) => {
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
        return res.status(403).json({ message: "Alleen een superadmin kan producten verwijderen." });
      }

      const productId = Number(req.params.id);
      if (!Number.isSafeInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "Ongeldig productnummer." });
      }

      const deleted = await dependencies.deleteProduct(productId);
      if (!deleted) {
        return res.status(404).json({ message: "Product niet gevonden." });
      }

      return res.json({
        message: "Product verwijderd. Producthistorie en meldingen zijn verwijderd; gekoppelde verhalen en GS1-snapshots zijn behouden.",
      });
    } catch {
      console.error("Product deletion failed.");
      return res.status(500).json({ message: "Product verwijderen is mislukt." });
    }
  });
}
