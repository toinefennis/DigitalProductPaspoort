import type { Event, Product } from "@shared/schema";

// Legacy MySQL-only fields (location, owner_id, sustainability_score) are omitted:
// the app has no source values for them, so an export must not erase existing data.
export const MYSQL_PRODUCT_UPSERT = `
  INSERT INTO products (
    id, gtin, name, type, status, description, photo_url,
    materials, source_gtins, repair_history,
    repairability_index, durability_score, care_symbols, carbon_footprint,
    carbon_footprint_breakdown, water_footprint_liters, energy_consumption_kwh,
    renewable_energy_percentage, microplastic_shedding_estimated, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    type = VALUES(type),
    status = VALUES(status),
    description = VALUES(description),
    photo_url = VALUES(photo_url),
    materials = VALUES(materials),
    source_gtins = VALUES(source_gtins),
    repair_history = VALUES(repair_history),
    repairability_index = VALUES(repairability_index),
    durability_score = VALUES(durability_score),
    care_symbols = VALUES(care_symbols),
    carbon_footprint = VALUES(carbon_footprint),
    carbon_footprint_breakdown = VALUES(carbon_footprint_breakdown),
    water_footprint_liters = VALUES(water_footprint_liters),
    energy_consumption_kwh = VALUES(energy_consumption_kwh),
    renewable_energy_percentage = VALUES(renewable_energy_percentage),
    microplastic_shedding_estimated = VALUES(microplastic_shedding_estimated),
    updated_at = VALUES(updated_at)
`;

export function mysqlProductValues(product: Product, events: Event[]) {
  let carbonFootprint = product.carbonFootprintDetailed?.totalKg ?? null;
  if (carbonFootprint === null && product.co2Footprint?.trim()) {
    carbonFootprint = Number(product.co2Footprint);
  }
  if (carbonFootprint !== null && !Number.isFinite(carbonFootprint)) {
    throw new Error("CO2 footprint must be a finite number in kilograms");
  }

  return [
    product.id,
    product.gtin,
    product.name,
    product.type,
    product.status,
    product.description,
    product.photoUrl,
    JSON.stringify(product.material ? [product.material] : []),
    JSON.stringify(product.sourceGtins ?? []),
    JSON.stringify(events.filter(event => event.productId === product.id && event.eventType === "reparatie")),
    product.repairabilityIndex,
    product.durabilityScore,
    JSON.stringify(product.careSymbols ?? []),
    carbonFootprint,
    JSON.stringify(product.carbonFootprintDetailed ?? {}),
    product.waterFootprintLiters,
    product.energyConsumptionKwh,
    product.renewableEnergyPercentage,
    product.microplasticSheddingEstimated,
    product.createdAt,
    product.updatedAt,
  ];
}