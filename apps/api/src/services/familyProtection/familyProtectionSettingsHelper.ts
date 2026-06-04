import { prisma } from "../../db/client.js";
import { familyProtectionDb } from "../../db/familyProtectionDb.js";

export const DEFAULT_NO_APP_HOURS = 24;
export const DEFAULT_MISSED_CALL_THRESHOLD = 3;
export const DEFAULT_LONG_CALL_MINUTES = 10;
export const DEFAULT_BANK_THRESHOLD_KRW = 10000;

export type FamilyProtectionSettingsRow = {
  userId: string;
  alertNoAppEnabled: boolean;
  alertNoAppHours: number;
  alertMissedCallEnabled: boolean;
  alertMissedCallThreshold: number;
  alertChildSiteEnabled: boolean;
  alertElderLongCallEnabled: boolean;
  alertElderLongCallMinutes: number;
  alertElderRemoteAppEnabled: boolean;
  alertElderGovCallEnabled: boolean;
  alertChildBankEnabled: boolean;
  alertChildBankAllTx: boolean;
  alertChildBankThresholdKrw: number;
  alertChildUnknownPayeeEnabled: boolean;
};

export function defaultFamilySettings(userId: string): FamilyProtectionSettingsRow {
  return {
    userId,
    alertNoAppEnabled: true,
    alertNoAppHours: DEFAULT_NO_APP_HOURS,
    alertMissedCallEnabled: true,
    alertMissedCallThreshold: DEFAULT_MISSED_CALL_THRESHOLD,
    alertChildSiteEnabled: true,
    alertElderLongCallEnabled: true,
    alertElderLongCallMinutes: DEFAULT_LONG_CALL_MINUTES,
    alertElderRemoteAppEnabled: true,
    alertElderGovCallEnabled: true,
    alertChildBankEnabled: true,
    alertChildBankAllTx: false,
    alertChildBankThresholdKrw: DEFAULT_BANK_THRESHOLD_KRW,
    alertChildUnknownPayeeEnabled: true
  };
}

export async function getOrCreateFamilySettings(guardianUserId: string): Promise<FamilyProtectionSettingsRow> {
  const user = await prisma.user.findUnique({ where: { id: guardianUserId }, select: { id: true } });
  if (!user) return defaultFamilySettings(guardianUserId);

  try {
    const row = await familyProtectionDb.familyProtectionSettings.upsert({
      where: { userId: guardianUserId },
      update: {},
      create: { userId: guardianUserId }
    });
    return row as FamilyProtectionSettingsRow;
  } catch {
    return defaultFamilySettings(guardianUserId);
  }
}

export function mergeLinkAlertConfig(
  link: {
    alertNoAppEnabled: boolean | null;
    alertNoAppHours: number | null;
    alertMissedCallEnabled: boolean | null;
    alertMissedCallThreshold: number | null;
  },
  settings: FamilyProtectionSettingsRow
) {
  return {
    noAppEnabled: link.alertNoAppEnabled ?? settings.alertNoAppEnabled,
    noAppHours: link.alertNoAppHours ?? settings.alertNoAppHours,
    missedCallEnabled: link.alertMissedCallEnabled ?? settings.alertMissedCallEnabled,
    missedCallThreshold: link.alertMissedCallThreshold ?? settings.alertMissedCallThreshold,
    childSiteEnabled: settings.alertChildSiteEnabled,
    longCallEnabled: settings.alertElderLongCallEnabled,
    longCallMinutes: settings.alertElderLongCallMinutes,
    remoteAppEnabled: settings.alertElderRemoteAppEnabled,
    govCallEnabled: settings.alertElderGovCallEnabled,
    childBankEnabled: settings.alertChildBankEnabled,
    childBankAllTx: settings.alertChildBankAllTx,
    childBankThresholdKrw: settings.alertChildBankThresholdKrw,
    childUnknownPayeeEnabled: settings.alertChildUnknownPayeeEnabled
  };
}

export async function getGuardianElderLinks(wardUserId: string) {
  return familyProtectionDb.familyProtectionLink.findMany({
    where: { wardUserId, status: "active", wardRole: "elder" }
  });
}

export async function getGuardianChildLinks(wardUserId: string) {
  return familyProtectionDb.familyProtectionLink.findMany({
    where: { wardUserId, status: "active", wardRole: "child" }
  });
}
