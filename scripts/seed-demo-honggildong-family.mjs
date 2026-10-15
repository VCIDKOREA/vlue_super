/**
 * Play 스토어 캡처용 — 홍길동(유료) + 가족 5명 + 청담동 위치
 *
 * 실행: node scripts/seed-demo-honggildong-family.mjs
 *
 * 로그인
 *   홍길동(부모 앱)  ID: honggildong1 / 비번: HongDemo1!
 *   아들(Kids)       ID: hongson1      / 비번: HongDemo1!
 *   딸(Kids)         ID: hongdaughter1 / 비번: HongDemo1!
 *   어머니·아버지·와이프도 동일 비번, ID는 아래 FAMILY 참고
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, randomInt, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scryptAsync = promisify(scrypt);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const rel of ["apps/api/.env", "packages/db/.env", ".env"]) {
  const f = resolve(root, rel);
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();
const PASSWORD = process.env.VLUE_HONG_DEMO_PASSWORD || "HongDemo1!";
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 서울 강남구 청담동. 홍길동 가족 데모(딸 제외) 고정 좌표. */
const CHEONGDAM = { lat: 37.5244, lng: 127.0495, label: "서울 강남구 청담동" };
const SEOUL_PLACE = {
  label: CHEONGDAM.label,
  isOverseas: false,
  countryCode: "KR",
  countryName: "대한민국",
  cityName: "서울",
  timeZoneId: "Asia/Seoul"
};
/** 딸 홍길동 가족 — 미국 LA 유학. 탭하면 Google 지도 + 안심패치. */
const LOS_ANGELES = {
  lat: 34.0689,
  lng: -118.4452,
  label: "미국 로스앤젤레스",
  isOverseas: true,
  countryCode: "US",
  countryName: "미국",
  cityName: "로스앤젤레스",
  timeZoneId: "America/Los_Angeles"
};

const OWNER = {
  publicHandle: "honggildong1",
  legalName: "홍길동",
  phoneE164: "+821012345678",
  email: "support@vlue.kr",
  gender: "M",
  birthDate: "19850315",
  familyRole: "PARENT",
  portoneIdentityId: "seed_honggildong_paid_demo_v1",
  companyName: "VCID KOREA",
  jobTitle: "과장",
  lat: CHEONGDAM.lat,
  lng: CHEONGDAM.lng
};

const FAMILY = [
  {
    publicHandle: "hongson1",
    legalName: null,
    nickFeed: "아들",
    skipIdentity: true,
    phoneE164: "+821000000001",
    email: "hongson1@vlue.demo",
    gender: "M",
    birthDate: "20120501",
    familyRole: "KIDS",
    wardRole: "child",
    familyRelation: "child",
    portoneIdentityId: null,
    lat: 37.5252,
    lng: 127.0478
  },
  {
    publicHandle: "hongdaughter1",
    legalName: null,
    nickFeed: "딸",
    skipIdentity: true,
    phoneE164: "+821000000002",
    email: "hongdaughter1@vlue.demo",
    gender: "F",
    birthDate: "20140812",
    familyRole: "KIDS",
    wardRole: "child",
    familyRelation: "child",
    portoneIdentityId: null,
    place: LOS_ANGELES,
    lat: LOS_ANGELES.lat,
    lng: LOS_ANGELES.lng
  },
  {
    publicHandle: "hongmother1",
    legalName: "어머니",
    nickFeed: "어머니",
    phoneE164: "+821000000003",
    email: "hongmother1@vlue.demo",
    gender: "F",
    birthDate: "19581120",
    familyRole: "PARENT",
    wardRole: "elder",
    familyRelation: "parent",
    portoneIdentityId: "seed_hong_mother_demo_v1",
    lat: 37.526,
    lng: 127.0505
  },
  {
    publicHandle: "hongfather1",
    legalName: "아버지",
    nickFeed: "아버지",
    phoneE164: "+821000000004",
    email: "hongfather1@vlue.demo",
    gender: "M",
    birthDate: "19560308",
    familyRole: "PARENT",
    wardRole: "elder",
    familyRelation: "parent",
    portoneIdentityId: "seed_hong_father_demo_v1",
    lat: 37.5225,
    lng: 127.048
  },
  {
    publicHandle: "hongwife1",
    legalName: "와이프",
    nickFeed: "와이프",
    phoneE164: "+821000000005",
    email: "hongwife1@vlue.demo",
    gender: "F",
    birthDate: "19870922",
    familyRole: "PARENT",
    wardRole: "observer",
    familyRelation: "relative",
    portoneIdentityId: "seed_hong_wife_demo_v1",
    lat: 37.5248,
    lng: 127.052
  }
];

async function hashPassword(plain) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(plain, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function addMonths(d, months) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

function randomInviteCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  }
  return code;
}

async function upsertUser(spec, passwordHash) {
  const now = new Date();
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { phoneE164: spec.phoneE164 },
        { publicHandle: spec.publicHandle },
        ...(spec.portoneIdentityId ? [{ portoneIdentityId: spec.portoneIdentityId }] : [])
      ]
    },
    select: { id: true }
  });

  const data = {
    publicHandle: spec.publicHandle,
    phoneE164: spec.phoneE164,
    email: spec.email,
    passwordHash,
    legalName: spec.skipIdentity ? null : spec.legalName,
    legalNameLockedAt: spec.skipIdentity ? null : now,
    identityVerified: spec.skipIdentity ? false : true,
    identityVerifiedAt: spec.skipIdentity ? null : now,
    isVerified: spec.skipIdentity ? false : true,
    accountStatus: "active",
    status: "ACTIVE",
    signupMethod: "vlue_native",
    portoneIdentityId: spec.skipIdentity ? null : spec.portoneIdentityId,
    birthDate: spec.birthDate,
    gender: spec.gender,
    familyRole: spec.familyRole,
    nickFeed: spec.nickFeed || spec.legalName,
    termsVersionAccepted: "demo-seed-v13",
    termsAcceptedAt: now,
    isPhoneSearchAllowed: true,
    isNameSearchAllowed: true,
    isOrgSearchAllowed: true,
    isIdSearchAllowed: true,
    vlueVerifiedBadgeAt: now,
    hasActiveShowcase: Boolean(spec.paid)
  };

  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data });
    return { id: existing.id, created: false };
  }
  const created = await prisma.user.create({ data, select: { id: true } });
  return { id: created.id, created: true };
}

async function streetAddress(lat, lng, fallback) {
  await new Promise((resolve) => setTimeout(resolve, 1100));
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("accept-language", "ko");
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "vlue-family-location" }
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const parts = String(data.display_name || "")
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part && !/^(대한민국|south korea|united states|미국)$/i.test(part) && !/^\d{5,6}$/.test(part));
    const label = parts.reverse().join(" ").trim();
    if (label && (/\d/.test(label) || /(로|길|대로|plaza|street|avenue|road|drive)/i.test(label))) {
      return label.slice(0, 240);
    }
  } catch {
    /* 좌표 라벨 유지 */
  }
  return fallback;
}

async function upsertPresence(userId, displayName, lat, lng, place = SEOUL_PLACE) {
  const now = new Date();
  const addressLabel = await streetAddress(lat, lng, place.label);
  const geo = {
    addressLabel,
    isOverseas: Boolean(place.isOverseas),
    countryCode: place.countryCode,
    countryName: place.countryName,
    cityName: place.cityName,
    timeZoneId: place.timeZoneId,
    batteryPct: 78,
    online: true,
    connectionStatus: "CONNECTED"
  };
  await prisma.locationPresence.upsert({
    where: { userId },
    create: {
      userId,
      displayName,
      lat,
      lng,
      ...geo,
      lastLat: lat,
      lastLng: lng,
      lastSeenAt: now
    },
    update: {
      displayName,
      lat,
      lng,
      ...geo,
      lastLat: lat,
      lastLng: lng,
      lastSeenAt: now
    }
  });
}

async function main() {
  const passwordHash = await hashPassword(PASSWORD);
  const now = new Date();
  const summary = [];

  const owner = await upsertUser({ ...OWNER, paid: true, nickFeed: "홍길동" }, passwordHash);
  summary.push({ role: "본인(유료)", ...OWNER, id: owner.id, created: owner.created });

  const dccSnapshot = {
    name: OWNER.legalName,
    displayName: OWNER.legalName,
    organization: OWNER.companyName,
    companyName: OWNER.companyName,
    title: OWNER.jobTitle,
    jobTitle: OWNER.jobTitle,
    phone: "010-1234-5678",
    email: OWNER.email,
    membershipTier: "paid"
  };

  await prisma.digitalCard.upsert({
    where: { userId: owner.id },
    create: {
      userId: owner.id,
      membershipTierSnapshot: "paid",
      displayName: OWNER.legalName,
      organization: OWNER.companyName,
      titleSnapshot: OWNER.jobTitle,
      exportSnapshotJson: dccSnapshot
    },
    update: {
      membershipTierSnapshot: "paid",
      displayName: OWNER.legalName,
      organization: OWNER.companyName,
      titleSnapshot: OWNER.jobTitle,
      exportSnapshotJson: dccSnapshot,
      updatedAt: now
    }
  });

  await prisma.userBusinessProfile.upsert({
    where: { userId: owner.id },
    create: {
      userId: owner.id,
      isBusiness: true,
      companyName: OWNER.companyName,
      jobTitle: OWNER.jobTitle
    },
    update: {
      isBusiness: true,
      companyName: OWNER.companyName,
      jobTitle: OWNER.jobTitle
    }
  });

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS title_dept_verification_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      digital_card_id UUID,
      source TEXT NOT NULL DEFAULT 'bizcard_settings',
      pending_title TEXT,
      pending_department TEXT,
      approved_title TEXT,
      approved_department TEXT,
      doc_kind TEXT,
      doc_url TEXT,
      doc_data_url TEXT,
      doc_file_name TEXT,
      doc_issued_at DATE,
      review_status TEXT NOT NULL DEFAULT 'PENDING',
      reviewer_id UUID,
      review_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO title_dept_verification_reviews (
        user_id, source, pending_title, approved_title, doc_kind, doc_url, doc_file_name, doc_issued_at, review_status
      )
      SELECT $1::uuid, 'bizcard_settings', $2, $2, 'business_owner', 'demo-vcid-korea', 'vcid-korea-verified', CURRENT_DATE, 'APPROVED'
      WHERE NOT EXISTS (
        SELECT 1 FROM title_dept_verification_reviews
        WHERE user_id = $1::uuid AND UPPER(review_status) = 'APPROVED'
      )
    `,
    owner.id,
    OWNER.jobTitle
  );

  const existingCard = await prisma.businessCard.findUnique({
    where: { phoneE164: OWNER.phoneE164 },
    select: { id: true, userId: true }
  });
  if (existingCard && existingCard.userId !== owner.id) {
    throw new Error(`전화 ${OWNER.phoneE164} 이 다른 계정(${existingCard.userId})에 이미 등록되어 있습니다.`);
  }
  if (existingCard) {
    await prisma.businessCard.update({
      where: { id: existingCard.id },
      data: {
        displayName: OWNER.legalName,
        jobTitle: OWNER.jobTitle,
        companyName: OWNER.companyName,
        verificationStatus: "approved",
        isPremiumLine: true,
        dccSnapshotJson: dccSnapshot,
        profileJson: dccSnapshot
      }
    });
  } else {
    await prisma.businessCard.create({
      data: {
        userId: owner.id,
        kind: "mobile",
        phoneE164: OWNER.phoneE164,
        displayName: OWNER.legalName,
        jobTitle: OWNER.jobTitle,
        companyName: OWNER.companyName,
        verificationStatus: "approved",
        isPremiumLine: true,
        dccSnapshotJson: dccSnapshot,
        profileJson: dccSnapshot
      }
    });
  }

  await prisma.userDccAgentProfile.deleteMany({ where: { userId: owner.id } });
  await prisma.userDccAgentProfile.create({
    data: {
      userId: owner.id,
      label: "기본",
      displayName: OWNER.legalName,
      title: OWNER.jobTitle,
      department: "",
      isActive: true,
      isRepresentative: true,
      dccSnapshotJson: dccSnapshot,
      sortOrder: 0
    }
  });

  const cycleEnd = addMonths(now, 1);
  const existingSub = await prisma.userSubscription.findFirst({
    where: { userId: owner.id, status: "active" },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });
  const portoneUid = `user_customer_${owner.id}`;
  if (existingSub) {
    await prisma.userSubscription.update({
      where: { id: existingSub.id },
      data: {
        plan: "b2c_monthly",
        amountKrw: 14100,
        listPriceKrw: 28300,
        isDiscounted: true,
        cycleEndAt: cycleEnd,
        nextChargeAt: cycleEnd,
        portoneCustomerUid: portoneUid
      }
    });
  } else {
    await prisma.userSubscription.create({
      data: {
        userId: owner.id,
        plan: "b2c_monthly",
        status: "active",
        amountKrw: 14100,
        listPriceKrw: 28300,
        isDiscounted: true,
        cycleStartAt: now,
        cycleEndAt: cycleEnd,
        nextChargeAt: cycleEnd,
        portoneCustomerUid: portoneUid
      }
    });
  }

  await prisma.familyProtectionSettings.upsert({
    where: { userId: owner.id },
    create: {
      userId: owner.id,
      extraMemberPackActive: true
    },
    update: { extraMemberPackActive: true }
  });

  let group = await prisma.protectionGroup.findUnique({ where: { ownerId: owner.id } });
  if (!group) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        group = await prisma.protectionGroup.create({
          data: {
            ownerId: owner.id,
            maxMembers: 4,
            extraSlots: 2,
            inviteCode: randomInviteCode()
          }
        });
        break;
      } catch (err) {
        if (attempt === 7) throw err;
      }
    }
  } else {
    group = await prisma.protectionGroup.update({
      where: { id: group.id },
      data: { maxMembers: 4, extraSlots: 2 }
    });
  }

  await upsertPresence(owner.id, OWNER.legalName, OWNER.lat, OWNER.lng);

  for (const member of FAMILY) {
    const row = await upsertUser(member, passwordHash);
    summary.push({
      role: member.nickFeed,
      handle: member.publicHandle,
      phone: member.phoneE164,
      id: row.id,
      created: row.created,
      kids: member.familyRole === "KIDS"
    });

    await prisma.digitalCard.upsert({
      where: { userId: row.id },
      create: {
        userId: row.id,
        membershipTierSnapshot: "free",
        displayName: member.nickFeed || member.legalName
      },
      update: {
        membershipTierSnapshot: "free",
        displayName: member.nickFeed || member.legalName,
        updatedAt: now
      }
    });

    await prisma.familyProtectionLink.upsert({
      where: {
        guardianUserId_wardUserId: {
          guardianUserId: owner.id,
          wardUserId: row.id
        }
      },
      create: {
        guardianUserId: owner.id,
        wardUserId: row.id,
        wardRole: member.wardRole,
        familyRelation: member.familyRelation,
        status: "active",
        wardAcceptedAt: now,
        membershipPathLabel: `무료(가족플랜) 가족명: ${OWNER.legalName}(유료)`
      },
      update: {
        wardRole: member.wardRole,
        familyRelation: member.familyRelation,
        status: "active",
        wardAcceptedAt: now,
        membershipPathLabel: `무료(가족플랜) 가족명: ${OWNER.legalName}(유료)`
      }
    });

    await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: row.id
        }
      },
      create: {
        groupId: group.id,
        userId: row.id,
        memberType: "OWNED_MEMBER",
        isLocationSharing: true
      },
      update: {
        memberType: "OWNED_MEMBER",
        isLocationSharing: true
      }
    });

    await prisma.familyWardPresence.upsert({
      where: { wardUserId: row.id },
      create: {
        wardUserId: row.id,
        lastAppAccessAt: now,
        lastDeviceSeenAt: now
      },
      update: {
        lastAppAccessAt: now,
        lastDeviceSeenAt: now
      }
    });

    await upsertPresence(row.id, member.nickFeed || member.legalName, member.lat, member.lng, member.place || SEOUL_PLACE);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        password: PASSWORD,
        inviteCode: group.inviteCode,
        ownerLogin: {
          id: OWNER.publicHandle,
          phone: "010-1234-5678",
          name: OWNER.legalName,
          company: OWNER.companyName,
          title: OWNER.jobTitle,
          email: OWNER.email
        },
        location: CHEONGDAM.label,
        daughter: LOS_ANGELES.label,
        users: summary
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
