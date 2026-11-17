import { FormFieldset, Input, Select } from "@majistudio/ogcr-design-system";
import { defaultCountryCodeOptions } from "./phone";

/**
 * A dialling code and a number, kept apart so `phone.js` can join them into
 * the single string the API stores. Both callbacks receive the new value.
 */
function ContactPhoneField(props) {
  const {
    label = "Contact Phone",
    countryCode,
    phone,
    onCountryCodeChange = () => {},
    onPhoneChange = () => {},
    countryCodeOptions = defaultCountryCodeOptions,
    countryCodePlaceholder = "Code",
    phonePlaceholder = "Phone number",
    helperText,
    error = false,
    required = false,
    disabled = false,
  } = props;

  return (
    <FormFieldset legend={label} helperText={helperText} error={error} required={required}>
      <div className="ogcr-contact-phone__field">
        <Select
          aria-label="Country code"
          value={countryCode || null}
          options={countryCodeOptions.map((option) => ({
            value: option.value,
            label: `${option.flag} ${option.value}`,
            meta: option.label,
          }))}
          placeholder={countryCodePlaceholder}
          disabled={disabled}
          error={error}
          onValueChange={(value) => onCountryCodeChange(value || "")}
        />
        <Input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
          placeholder={phonePlaceholder}
          required={required}
          disabled={disabled}
          error={error}
          aria-label={label ? `${label} number` : "Phone number"}
        />
      </div>
    </FormFieldset>
  );
}

export default ContactPhoneField;
