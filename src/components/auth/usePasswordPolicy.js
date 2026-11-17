import { useEffect, useState } from "react";
import $auth from "../../services/$auth";

// Shown only when DCR cannot report its policy (503); DCR still checks on submit.
export const FALLBACK_PASSWORD_HINT = "At least 10 characters with upper and lower case, a digit and a special character (or longer than 16).";

// One read per page: the rules rarely change and every form shares them.
let policyRequest = null;

function loadPolicy() {
  if (!policyRequest) {
    policyRequest = $auth.passwordPolicy().catch((err) => {
      policyRequest = null;
      throw err;
    });
  }
  return policyRequest;
}

/**
 * `GET auth/password-policy/`. `policy` stays null while loading and when DCR
 * cannot report it, and every check then answers "unknown" so the form never
 * blocks on a rule it could not read.
 */
export default function usePasswordPolicy() {
  const [policy, setPolicy] = useState(null);

  useEffect(() => {
    let cancelled = false;

    loadPolicy()
      .then((data) => { if (!cancelled) setPolicy(data); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  return {
    policy,
    description: policy?.description || FALLBACK_PASSWORD_HINT,
  };
}

const safeRegex = (source) => {
  try {
    return new RegExp(source);
  } catch {
    return null;
  }
};

/** "a", "a and b", "a, b and c". */
const joinList = (items) => (items.length < 2
  ? items.join("")
  : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

const describeCharacter = (character) => (character === " " ? "the spaces" : character);

/**
 * What one policy still needs, as short sentences (empty means it is met), and
 * `distance`: roughly how many characters to add or remove to meet it.
 */
function gapsFor(rule, password) {
  const notes = [];
  const characters = [...password];
  const length = characters.length;
  let distance = 0;

  const missingClasses = (rule.required_character_classes || []).filter((characterClass) => {
    const pattern = safeRegex(characterClass.regex);
    return pattern && !pattern.test(password);
  });
  const short = rule.min_length && length < rule.min_length ? rule.min_length - length : 0;

  const needs = missingClasses.map(({ name }) => `${/^[aeiou]/i.test(name) ? "an" : "a"} ${name}`);
  if (short) needs.unshift(`at least ${rule.min_length} characters`);
  if (needs.length) notes.push(`Still needs ${joinList(needs)}.`);
  // One added character can fill a missing class and the length at once.
  distance += Math.max(short, missingClasses.length);

  if (rule.max_length && length > rule.max_length) {
    notes.push(`Too long: at most ${rule.max_length} characters.`);
    distance += length - rule.max_length;
  }

  if (rule.allowed_characters) {
    const disallowed = characters.filter((character) => !rule.allowed_characters.includes(character));
    if (disallowed.length) {
      notes.push(`Remove ${joinList([...new Set(disallowed)].map(describeCharacter))}.`);
      distance += disallowed.length;
    }
  }

  // Whatever the parts above miss (e.g. no `allowed_characters` sent) the
  // full pattern still catches.
  if (!notes.length && rule.regex) {
    const pattern = safeRegex(rule.regex);
    if (pattern && !pattern.test(password)) {
      notes.push("Use only printable characters, no spaces.");
      distance += 1;
    }
  }

  return { notes, distance };
}

/**
 * Checks a password against DCR's policy: valid when it matches any one of the
 * policies. Returns `{ valid, hint }` — `valid` is null when the policy is
 * unknown or nothing has been typed, and `hint` says what the closest policy
 * still needs (ties go to the one DCR lists first).
 */
export function checkPassword(policy, password) {
  const rules = policy?.policies || [];
  if (!rules.length || !password) return { valid: null, hint: "" };

  const gaps = rules.map((rule) => gapsFor(rule, password));
  if (gaps.some(({ notes }) => notes.length === 0)) return { valid: true, hint: "" };

  const closest = gaps.reduce((best, gap) => (gap.distance < best.distance ? gap : best));
  return { valid: false, hint: closest.notes.join(" ") };
}
