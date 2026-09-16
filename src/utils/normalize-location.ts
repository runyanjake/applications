/**
 * Locations are stored as three parallel comma-separated lists, one entry per
 * location: city "San Francisco, New York", state "CA, NY", country "US, US".
 *
 * Small models get this wrong in predictable ways even when told the format:
 * "San Francisco, CA; New York, NY" in city, a state list with a stray empty
 * slot, or one country for several cities. This repairs those shapes.
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

export function normalizeLocation(fields: LocationFields): LocationFields {
  if (!fields.city) return fields;

  const { cities, states: embedded } = splitCities(fields.city);
  const count = cities.length;
  if (count === 0) return fields;

  const fit = (list: string[]) =>
    Array.from({ length: count }, (_, i) => list[i] ?? "");
  const join = (list: string[]) =>
    list.some(Boolean) ? fit(list).join(", ") : undefined;

  // States written next to each city cannot be misaligned, so prefer them
  let states = embedded.some(Boolean)
    ? embedded
    : parts(fields.state ?? "", /[;,]/);
  // More entries than cities means a stray empty slot, e.g. ", CA, NY"
  if (states.length > count) states = states.filter(Boolean);

  // One country given for several cities applies to all of them
  let countries = parts(fields.country ?? "", /[;,]/).map(toCountryCode);
  if (countries.filter(Boolean).length === 1 && count > 1) {
    countries = fit([]).fill(countries.find(Boolean)!);
  }

  return {
    city: cities.join(", "),
    state: join(states),
    country: join(countries),
  };
}
