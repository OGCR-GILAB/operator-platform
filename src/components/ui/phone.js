// Dialling codes for ContactPhoneField, and the helpers that map its two
// inputs onto the single `phone` string the API stores.

export const defaultCountryCodeOptions = [
  { value: "+355", flag: "🇦🇱", label: "Albania" },
  { value: "+376", flag: "🇦🇩", label: "Andorra" },
  { value: "+374", flag: "🇦🇲", label: "Armenia" },
  { value: "+43", flag: "🇦🇹", label: "Austria" },
  { value: "+375", flag: "🇧🇾", label: "Belarus" },
  { value: "+32", flag: "🇧🇪", label: "Belgium" },
  { value: "+387", flag: "🇧🇦", label: "Bosnia and Herzegovina" },
  { value: "+359", flag: "🇧🇬", label: "Bulgaria" },
  { value: "+385", flag: "🇭🇷", label: "Croatia" },
  { value: "+357", flag: "🇨🇾", label: "Cyprus" },
  { value: "+420", flag: "🇨🇿", label: "Czechia" },
  { value: "+45", flag: "🇩🇰", label: "Denmark" },
  { value: "+372", flag: "🇪🇪", label: "Estonia" },
  { value: "+298", flag: "🇫🇴", label: "Faroe Islands" },
  { value: "+358", flag: "🇫🇮", label: "Finland" },
  { value: "+33", flag: "🇫🇷", label: "France" },
  { value: "+350", flag: "🇬🇮", label: "Gibraltar" },
  { value: "+49", flag: "🇩🇪", label: "Germany" },
  { value: "+30", flag: "🇬🇷", label: "Greece" },
  { value: "+299", flag: "🇬🇱", label: "Greenland" },
  { value: "+36", flag: "🇭🇺", label: "Hungary" },
  { value: "+354", flag: "🇮🇸", label: "Iceland" },
  { value: "+353", flag: "🇮🇪", label: "Ireland" },
  { value: "+39", flag: "🇮🇹", label: "Italy" },
  { value: "+383", flag: "🇽🇰", label: "Kosovo" },
  { value: "+371", flag: "🇱🇻", label: "Latvia" },
  { value: "+423", flag: "🇱🇮", label: "Liechtenstein" },
  { value: "+370", flag: "🇱🇹", label: "Lithuania" },
  { value: "+352", flag: "🇱🇺", label: "Luxembourg" },
  { value: "+356", flag: "🇲🇹", label: "Malta" },
  { value: "+373", flag: "🇲🇩", label: "Moldova" },
  { value: "+377", flag: "🇲🇨", label: "Monaco" },
  { value: "+382", flag: "🇲🇪", label: "Montenegro" },
  { value: "+31", flag: "🇳🇱", label: "Netherlands" },
  { value: "+47", flag: "🇳🇴", label: "Norway" },
  { value: "+48", flag: "🇵🇱", label: "Poland" },
  { value: "+351", flag: "🇵🇹", label: "Portugal" },
  { value: "+40", flag: "🇷🇴", label: "Romania" },
  { value: "+7", flag: "🇷🇺", label: "Russia" },
  { value: "+378", flag: "🇸🇲", label: "San Marino" },
  { value: "+381", flag: "🇷🇸", label: "Serbia" },
  { value: "+421", flag: "🇸🇰", label: "Slovakia" },
  { value: "+386", flag: "🇸🇮", label: "Slovenia" },
  { value: "+34", flag: "🇪🇸", label: "Spain" },
  { value: "+46", flag: "🇸🇪", label: "Sweden" },
  { value: "+41", flag: "🇨🇭", label: "Switzerland" },
  { value: "+90", flag: "🇹🇷", label: "Turkey" },
  { value: "+380", flag: "🇺🇦", label: "Ukraine" },
  { value: "+44", flag: "🇬🇧", label: "United Kingdom" },
  { value: "+379", flag: "🇻🇦", label: "Vatican City" },
];

/**
 * The API keeps one `phone` string ("+381 641234567"); the field edits it as a
 * dialling code plus a number. The longest matching code wins, so "+3816…" is
 * Serbia rather than a stray "+3".
 */
export function splitPhone(value, options = defaultCountryCodeOptions) {
  const phone = String(value || "").trim();
  if (!phone) return { countryCode: "", number: "" };

  const match = options
    .filter((option) => phone.startsWith(option.value))
    .sort((a, b) => b.value.length - a.value.length)[0];

  if (!match) return { countryCode: "", number: phone.replace(/\D/g, "") };

  return { countryCode: match.value, number: phone.slice(match.value.length).replace(/\D/g, "") };
}

export function joinPhone(countryCode, number) {
  const digits = String(number || "").replace(/\D/g, "");
  if (!digits) return "";
  return countryCode ? `${countryCode} ${digits}` : digits;
}

/**
 * Why a number cannot be sent yet, or "". Without a dialling code `joinPhone`
 * yields bare digits, which the API refuses as not international.
 */
export function phoneProblem(countryCode, number) {
  const digits = String(number || "").replace(/\D/g, "");
  if (digits && !countryCode) return "Choose the country code.";
  return "";
}
