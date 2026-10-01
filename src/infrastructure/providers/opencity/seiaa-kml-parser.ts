import { XMLParser } from "fast-xml-parser";

export interface SeiaaKmlPlacemark {
  readonly constructionId?: string;
  readonly kGISCode?: string;
  readonly rawConstructionName?: string;
  readonly villageId?: string;
  readonly departmentCode?: string;
  readonly rawCoordinates?: string;
}

function asArray(value: unknown): readonly unknown[] {
  return value === undefined || value === null
    ? []
    : Array.isArray(value)
      ? value
      : [value];
}

function collectPlacemarks(
  value: unknown,
  collected: unknown[] = [],
): unknown[] {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectPlacemarks(item, collected);
    }
    return collected;
  }

  if (typeof value !== "object" || value === null) {
    return collected;
  }

  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (key === "Placemark") {
      collected.push(...asArray(child));
      continue;
    }

    collectPlacemarks(child, collected);
  }

  return collected;
}

function textValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "object" && value !== null) {
    const text = (value as Record<string, unknown>)["#text"];
    return typeof text === "string" ? textValue(text) : undefined;
  }

  return undefined;
}

function simpleData(
  placemark: Record<string, unknown>,
): Record<string, string> {
  const values: Record<string, string> = {};
  const extendedData = placemark.ExtendedData as
    Record<string, unknown> | undefined;
  const schemaData = extendedData?.SchemaData as
    Record<string, unknown> | undefined;

  for (const data of asArray(schemaData?.SimpleData)) {
    if (typeof data !== "object" || data === null) {
      continue;
    }

    const record = data as Record<string, unknown>;
    const name = textValue(record["@_name"]);
    const value = textValue(record);

    if (name !== undefined && value !== undefined) {
      values[name] = value;
    }
  }

  return values;
}

export function parseSeiaaKml(kml: string): readonly SeiaaKmlPlacemark[] {
  const parsed = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    trimValues: true,
  }).parse(kml) as Record<string, unknown>;

  const placemarks = collectPlacemarks(parsed.kml);

  return placemarks.map((value) => {
    const placemark = value as Record<string, unknown>;
    const data = simpleData(placemark);
    const point = placemark.Point as Record<string, unknown> | undefined;

    return {
      constructionId: data.KGISCONSTRUCTIONId,
      kGISCode: data.KGISCode,
      rawConstructionName: data.CONSTRUCTIONName,
      villageId: data.KGISVillageID,
      departmentCode: data.DepartmentCode,
      rawCoordinates: textValue(point?.coordinates),
    };
  });
}
