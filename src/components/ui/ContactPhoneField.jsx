import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import TextField from "./TextField";

const defaultCountryCodeOptions = [
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

function ContactPhoneField(props) {
  const {
    label = "Contact Phone",
    countryCode,
    phone,
    onCountryCodeChange = () => {},
    onPhoneChange = () => {},
    countryCodeOptions = defaultCountryCodeOptions,
    countryCodePlaceholder = "🇪🇺",
    phonePlaceholder = "Phone number",
    helperText,
    error = false,
    required = false,
    disabled = false,
    className = "",
    style = {},
  } = props;

  const generatedId = useId();
  const labelId = `ogcr-contact-phone-${generatedId}`;
  const helperId = `${labelId}-help`;
  const hasHelper = Boolean(helperText);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const selectedCountry = useMemo(
    () => countryCode ? countryCodeOptions.find((option) => option.value === countryCode) : null,
    [countryCodeOptions, countryCode],
  );

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <div className={`ogcr-contact-phone${error ? " ogcr-contact-phone--error" : ""} ${className}`.trim()} style={{ ...style }}>
      {label ? (
        <span className="ogcr-contact-phone__label" id={labelId}>
          {label}
          {required ? <span className="text-negative" aria-hidden="true"> *</span> : null}
        </span>
      ) : null}

      <div className="ogcr-contact-phone__field" aria-labelledby={label ? labelId : undefined}>
        <div className="ogcr-contact-phone__country-code-wrap">
          <button
            ref={buttonRef}
            type="button"
            className={`ogcr-contact-phone__country-code-button${isOpen ? " ogcr-contact-phone__country-code-button--open" : ""}`}
            aria-label={selectedCountry ? `${selectedCountry.flag} ${selectedCountry.value} ${selectedCountry.label}` : "Country code"}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((current) => !current)}
            disabled={disabled}
          >
            <span className="ogcr-contact-phone__country-code-button-flag" aria-hidden="true">
              {selectedCountry?.flag || countryCodePlaceholder}
            </span>
            <span className="ogcr-contact-phone__country-code-button-caret" aria-hidden="true">
              <CaretDownIcon />
            </span>
          </button>

          {isOpen ? (
            <div ref={menuRef} className="ogcr-contact-phone__country-code-menu" role="listbox" aria-label="European country codes">
              {countryCodeOptions.map((option) => (
                <button
                  key={`${option.value}-${option.label}`}
                  type="button"
                  className={`ogcr-contact-phone__country-code-option${option.value === countryCode ? " ogcr-contact-phone__country-code-option--selected" : ""}`}
                  role="option"
                  aria-selected={option.value === countryCode}
                  onClick={() => {
                    onCountryCodeChange({ target: { value: option.value } });
                    setIsOpen(false);
                  }}
                >
                  <span className="ogcr-contact-phone__country-code-option-flag" aria-hidden="true">{option.flag}</span>
                  <span className="ogcr-contact-phone__country-code-option-label">{option.value} {option.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <TextField
          type="number"
          inputMode="numeric"
          value={phone}
          onChange={onPhoneChange}
          placeholder={phonePlaceholder}
          required={required}
          disabled={disabled}
          error={error}
          className="ogcr-contact-phone__number"
          aria-describedby={hasHelper ? helperId : undefined}
          aria-label={label ? `${label} number` : "Phone number"}
        />
      </div>

      {hasHelper ? (
        <p id={helperId} className="ogcr-contact-phone__helper">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export default ContactPhoneField;