const graphicViolence = /\b(gore|beheaded|dismember(?:ed|ment)?|torture|mutilat(?:ed|ion)|decapitat(?:ed|ion)|graphic violence|blood-soaked)\b/i;
const hateRequest = /\b(?:kill|exterminate|wipe out|attack|harm)\s+(?:all\s+)?(?:a\s+)?(?:race|ethnicity|religion|religious group|immigrants|gay people|trans people)\b/i;
const namedPersonCue = /\b(?:real|actual|living|famous|public)\s+(?:person|individual|celebrity|politician|athlete|actor)\b/i;
const namedPersonInPremise = /\b(?:about|featuring|involving|based on|murder(?:ing)?|kill(?:ing)?)\s+[A-Z][a-z]{1,24}\s+[A-Z][a-z]{1,24}\b/;

export function premiseRejection(premise) {
  if (graphicViolence.test(premise)) return 'Use a non-graphic premise. Mysteries in this room stay suitable for ages 13 and up.';
  if (hateRequest.test(premise)) return 'That premise targets a protected group. Try a fictional mystery without hateful content.';
  if (namedPersonCue.test(premise) || namedPersonInPremise.test(premise)) return 'Use fictional characters rather than real named individuals.';
  return null;
}
