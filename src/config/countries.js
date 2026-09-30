// The single source of truth for country options.
//
// `GET reference/countries/` returns the full ISO 3166-1 list — 249 entries,
// worldwide — and is what the API validates `country_code` against. It is not a
// drop-in replacement for this list: the curated set below is what the user
// picks from (flag emoji, EU first, candidates after). Use the endpoint as the
// validation set via `validateCountryCode()` / `syncLabelsWithReference()`.

export const euAndCandidateCountryOptions = [
  { value: "AT", label: "🇦🇹 Austria" },
  { value: "BE", label: "🇧🇪 Belgium" },
  { value: "BG", label: "🇧🇬 Bulgaria" },
  { value: "HR", label: "🇭🇷 Croatia" },
  { value: "CY", label: "🇨🇾 Cyprus" },
  { value: "CZ", label: "🇨🇿 Czechia" },
  { value: "DK", label: "🇩🇰 Denmark" },
  { value: "EE", label: "🇪🇪 Estonia" },
  { value: "FI", label: "🇫🇮 Finland" },
  { value: "FR", label: "🇫🇷 France" },
  { value: "DE", label: "🇩🇪 Germany" },
  { value: "GR", label: "🇬🇷 Greece" },
  { value: "HU", label: "🇭🇺 Hungary" },
  { value: "IE", label: "🇮🇪 Ireland" },
  { value: "IT", label: "🇮🇹 Italy" },
  { value: "LV", label: "🇱🇻 Latvia" },
  { value: "LT", label: "🇱🇹 Lithuania" },
  { value: "LU", label: "🇱🇺 Luxembourg" },
  { value: "MT", label: "🇲🇹 Malta" },
  { value: "NL", label: "🇳🇱 Netherlands" },
  { value: "PL", label: "🇵🇱 Poland" },
  { value: "PT", label: "🇵🇹 Portugal" },
  { value: "RO", label: "🇷🇴 Romania" },
  { value: "SK", label: "🇸🇰 Slovakia" },
  { value: "SI", label: "🇸🇮 Slovenia" },
  { value: "ES", label: "🇪🇸 Spain" },
  { value: "SE", label: "🇸🇪 Sweden" },
  { value: "AL", label: "🇦🇱 Albania (candidate)" },
  { value: "BA", label: "🇧🇦 Bosnia and Herzegovina (candidate)" },
  { value: "GE", label: "🇬🇪 Georgia (candidate)" },
  { value: "MD", label: "🇲🇩 Moldova (candidate)" },
  { value: "ME", label: "🇲🇪 Montenegro (candidate)" },
  { value: "MK", label: "🇲🇰 North Macedonia (candidate)" },
  { value: "RS", label: "🇷🇸 Serbia (candidate)" },
  { value: "TR", label: "🇹🇷 Türkiye (candidate)" },
  { value: "UA", label: "🇺🇦 Ukraine (candidate)" },
  { value: "XK", label: "🇽🇰 Kosovo (candidate)" },
];

const FLAG_PREFIX = /^\p{Extended_Pictographic}+\s*/u;

export const stripFlag = (label) => String(label ?? "").replace(FLAG_PREFIX, "");

export const flagOf = (label) => (String(label ?? "").match(FLAG_PREFIX) || [""])[0].trim();

export const getCountryNameByCode = (countryCode, countries = euAndCandidateCountryOptions) => {
  const option = countries.find((item) => item.value === countryCode);

  if (!option) {
    return countryCode;
  }

  return stripFlag(option.label);
};

/**
 * Is this code one the API will accept? Pass the array from
 * `$reference.countries()`; without it, falls back to the curated list.
 */
export const validateCountryCode = (countryCode, referenceCountries) => {
  if (!countryCode) return false;

  if (Array.isArray(referenceCountries) && referenceCountries.length) {
    return referenceCountries.some((country) => country.code === countryCode);
  }

  return euAndCandidateCountryOptions.some((option) => option.value === countryCode);
};

/**
 * Keep the curated order and flags, but take the country names from the API so
 * the labels never drift. Codes the API no longer knows are dropped.
 */
export const syncLabelsWithReference = (referenceCountries) => {
  if (!Array.isArray(referenceCountries) || !referenceCountries.length) {
    return euAndCandidateCountryOptions;
  }

  const byCode = new Map(referenceCountries.map((country) => [country.code, country.name]));

  return euAndCandidateCountryOptions
    .filter((option) => byCode.has(option.value))
    .map((option) => {
      const flag = flagOf(option.label);
      const suffix = /\(candidate\)$/.test(option.label) ? " (candidate)" : "";
      return { value: option.value, label: `${flag} ${byCode.get(option.value)}${suffix}`.trim() };
    });
};

/** Every ISO country as a select option, for the rare case all 249 are wanted. */
export const toCountryOptions = (referenceCountries = []) =>
  referenceCountries.map((country) => ({ value: country.code, label: country.name }));
