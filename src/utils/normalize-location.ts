/**
 * Locations are stored as three comma-separated lists of unique values:
 * city "San Francisco, New York", state "CA, NY", country "US".
 *
 * Models get this wrong in predictable ways even when told the format:
 * "San Francisco, CA; New York, NY" in city, stray empty entries, full
 * country names, or the same value repeated. This repairs those shapes.
 */
export interface LocationFields {
  city?: string;
  state?: string;
  country?: string;
}

/** A state/province code: two or three capital letters. */
const CODE = /^[A-Z]{2,3}$/;

/** Names models commonly write instead of the ISO 3166-1 alpha-2 code. */
const COUNTRY_CODES: Record<string, string> = {
  usa: "US", "u.s.": "US", "u.s.a.": "US", "united states": "US",
  "united states of america": "US", uk: "GB", "united kingdom": "GB",
  "great britain": "GB", england: "GB", canada: "CA", can: "CA",
  australia: "AU", aus: "AU", india: "IN", ind: "IN", germany: "DE",
  deu: "DE", france: "FR", fra: "FR", ireland: "IE", irl: "IE",
  netherlands: "NL", nld: "NL", singapore: "SG", sgp: "SG", japan: "JP",
  jpn: "JP", mexico: "MX", mex: "MX", brazil: "BR", bra: "BR",
};

const toCountryCode = (country: string) =>
  COUNTRY_CODES[country.toLowerCase()] ?? country;

const parts = (value: string, separator: RegExp) =>
  value.split(separator).map((part) => part.trim());

/** Split the city field into city names plus any state codes embedded in it. */
function splitCities(city: string): { cities: string[]; states: string[] } {
  // "San Francisco, CA; New York, NY"
  if (city.includes(";")) {
    const locations = parts(city, /;/).filter(Boolean);
    return {
      cities: locations.map((location) => parts(location, /,/)[0]!),
      states: locations.map((location) => parts(location, /,/)[1] ?? ""),
    };
  }

  // "San Francisco, CA, New York, NY" — only when names and codes strictly
  // alternate, so a list of plain city names is never misread
  const tokens = parts(city, /,/).filter(Boolean);
  const alternates =
    tokens.length % 2 === 0 &&
    tokens.every((token, i) => CODE.test(token) === (i % 2 === 1));
  if (alternates) {
    return {
      cities: tokens.filter((_, i) => i % 2 === 0),
      states: tokens.filter((_, i) => i % 2 === 1),
    };
  }

  return { cities: tokens, states: [] };
}

/** Drop empty entries and case-insensitive repeats, keeping first-seen order. */
function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeLocation(fields: LocationFields): LocationFields {
  const { cities, states: embedded } = splitCities(fields.city ?? "");
  // States written next to a city are the reliable ones, so they win
  const states = embedded.some(Boolean)
    ? embedded
    : parts(fields.state ?? "", /[;,]/);
  const countries = parts(fields.country ?? "", /[;,]/).map(toCountryCode);

  const result: LocationFields = {};
  const set = (key: keyof LocationFields, values: string[]) => {
    const list = unique(values);
    if (list.length > 0) result[key] = list.join(", ");
  };
  set("city", cities);
  set("state", states);
  set("country", countries);
  return result;
}
