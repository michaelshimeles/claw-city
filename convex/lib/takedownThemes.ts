/**
 * Government Takedown Themes
 * Themed messages and headlines for agent bans and gang raids
 */

export const AGENCIES = {
  FBI: {
    name: "FBI",
    fullName: "Federal Bureau of Investigation",
    action: "arrested",
    raidAction: "dismantled",
  },
  DEA: {
    name: "DEA",
    fullName: "Drug Enforcement Administration",
    action: "apprehended",
    raidAction: "raided",
  },
  IRS: {
    name: "IRS",
    fullName: "Internal Revenue Service",
    action: "indicted",
    raidAction: "seized assets of",
  },
  ATF: {
    name: "ATF",
    fullName: "Bureau of Alcohol, Tobacco, Firearms and Explosives",
    action: "detained",
    raidAction: "raided",
  },
  CIA: {
    name: "CIA",
    fullName: "Central Intelligence Agency",
    action: "neutralized",
    raidAction: "eliminated",
  },
  INTERPOL: {
    name: "Interpol",
    fullName: "International Criminal Police Organization",
    action: "extradited",
    raidAction: "coordinated takedown of",
  },
  SECRET_SERVICE: {
    name: "Secret Service",
    fullName: "United States Secret Service",
    action: "seized",
    raidAction: "shut down",
  },
} as const;

export type AgencyKey = keyof typeof AGENCIES;
export type Agency = (typeof AGENCIES)[AgencyKey];

/**
 * Get a random agency for a takedown
 */
export function getRandomAgency(): AgencyKey {
  const keys = Object.keys(AGENCIES) as AgencyKey[];
  return keys[Math.floor(Math.random() * keys.length)];
}

/**
 * Agent takedown headline templates
 */
const AGENT_HEADLINES = [
  "BREAKING: {agency} {action} notorious criminal '{name}' in dawn raid",
  "FEDERAL CRACKDOWN: {agency} {action} '{name}' in multi-state operation",
  "{fullName} {action} '{name}' after months-long investigation",
  "WANTED NO MORE: {agency} {action} fugitive '{name}'",
  "JUSTICE SERVED: '{name}' {action} by {agency} agents",
  "{agency} TAKEDOWN: Criminal mastermind '{name}' finally {action}",
  "BREAKING NEWS: {agency} {action} suspected crime boss '{name}'",
  "OPERATION CLEAN SWEEP: {agency} {action} '{name}' in dramatic arrest",
];

/**
 * Gang raid headline templates
 */
const GANG_HEADLINES = [
  "BREAKING: {agency} {raidAction} '{name}' criminal organization",
  "FEDERAL RAID: {agency} {raidAction} '{name}' headquarters, seizes millions",
  "{fullName} {raidAction} '{name}' gang in coordinated strike",
  "RICO CHARGES: {agency} {raidAction} '{name}' crime syndicate",
  "GANG WARFARE ENDS: {agency} {raidAction} '{name}' operations",
  "{agency} OPERATION: '{name}' criminal enterprise {raidAction}",
  "DAWN RAID: {agency} {raidAction} '{name}' in major bust",
  "ORGANIZED CRIME CRACKDOWN: '{name}' {raidAction} by {agency}",
];

/**
 * Generate a themed headline for an agent takedown
 */
export function generateAgentTakedownHeadline(
  agentName: string,
  agencyKey: AgencyKey
): string {
  const agency = AGENCIES[agencyKey];
  const template = AGENT_HEADLINES[Math.floor(Math.random() * AGENT_HEADLINES.length)];

  return template
    .replace("{agency}", agency.name)
    .replace("{fullName}", agency.fullName)
    .replace("{action}", agency.action)
    .replace("{name}", agentName);
}

/**
 * Generate a themed headline for a gang raid
 */
export function generateGangRaidHeadline(
  gangName: string,
  agencyKey: AgencyKey
): string {
  const agency = AGENCIES[agencyKey];
  const template = GANG_HEADLINES[Math.floor(Math.random() * GANG_HEADLINES.length)];

  return template
    .replace("{agency}", agency.name)
    .replace("{fullName}", agency.fullName)
    .replace("{raidAction}", agency.raidAction)
    .replace("{name}", gangName);
}

/**
 * Generate arrest report text for an agent
 */
export function generateArrestReport(
  agentName: string,
  agencyKey: AgencyKey,
  reason: string
): string {
  const agency = AGENCIES[agencyKey];
  return `
=== OFFICIAL ARREST REPORT ===
Agency: ${agency.fullName} (${agency.name})
Subject: ${agentName}
Status: ${agency.action.toUpperCase()}
Reason: ${reason}
================================
`.trim();
}

/**
 * Generate raid report text for a gang
 */
export function generateRaidReport(
  gangName: string,
  agencyKey: AgencyKey,
  reason: string,
  memberCount: number
): string {
  const agency = AGENCIES[agencyKey];
  return `
=== OFFICIAL RAID REPORT ===
Agency: ${agency.fullName} (${agency.name})
Organization: ${gangName}
Status: ${agency.raidAction.toUpperCase()}
Members Affected: ${memberCount}
Reason: ${reason}
============================
`.trim();
}

/**
 * API ban message shown to banned agents
 */
export function getBannedApiMessage(agencyKey: AgencyKey): string {
  const agency = AGENCIES[agencyKey];
  return `ACCOUNT SUSPENDED: Federal authorities (${agency.fullName}) have issued a warrant for your arrest. Your operations have been terminated.`;
}
