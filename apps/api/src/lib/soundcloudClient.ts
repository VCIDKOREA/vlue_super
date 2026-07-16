// /**
//  * SoundCloud api-v2 / tracks 클라이언트 (서버)
//  *
//  * 상업적 안전성: Creative Commons — Commercial Use Allowed 만 반환.
//  * @see ./musicLicensePolicy.ts
//  */

// import {
//   buildSoundCloudSourceVerification,
//   isCommercialCreativeCommonsLicense,
//   normalizeSoundCloudLicense,
//   SOUNDCLOUD_COMMERCIAL_CC_LICENSES,
//   soundCloudLicenseLabel
// } from "./musicLicensePolicy.js";

// let cachedClientId = "";
// let cachedAt = 0;
// const CLIENT_ID_TTL_MS = 6 * 60 * 60 * 1000;

// const CLIENT_ID_RE = /client_id["'\s:=]+([a-zA-Z0-9]{16,40})/i;

// export function getSoundCloudClientIdFromEnv() {
//   return String(process.env.SOUNDCLOUD_CLIENT_ID || "").trim();
// }

// async function extractClientIdFromSoundCloud(): Promise<string> {
//   const res = await fetch("https://soundcloud.com", {
//     headers: {
//       Accept: "text/html",
//       "User-Agent": "VLUE-SoundCloud-BGM/1.0"
//     }
//   });
//   if (!res.ok) throw new Error(`soundcloud_home_${res.status}`);
//   const html = await res.text();
//   const inline = html.match(CLIENT_ID_RE);
//   // if (inline?.[1]) return inline[1];

//   const scriptUrls = [...html.matchAll(/src="(https:\/\/[^"]+sndcdn\.com[^"]+\.js)"/g)].map((m) => m[1]);
//   for (const url of scriptUrls.slice(0, 8)) {
//     try {
//       const jsRes = await fetch(url, {
//         headers: { "User-Agent": "VLUE-SoundCloud-BGM/1.0" }
//       });
//       if (!jsRes.ok) continue;
//       const js = await jsRes.text();
//       const m = js.match(CLIENT_ID_RE);
//       if (m?.[1]) return m[1];
//     } catch {
//       /* try next */
//     }
//   }
//   throw new Error("soundcloud_client_id_not_found");
// }

// export async function resolveSoundCloudClientId(): Promise<string> {
//   const fromEnv = getSoundCloudClientIdFromEnv();
//   if (fromEnv) return fromEnv;
//   if (cachedClientId && Date.now() - cachedAt < CLIENT_ID_TTL_MS) return cachedClientId;
//   const id = await extractClientIdFromSoundCloud();
//   cachedClientId = id;
//   cachedAt = Date.now();
//   return id;
// }

// export type SoundCloudTrackDto = {
//   id: string;
//   trackId: string;
//   trackUrl: string;
//   title: string;
//   artist: string;
//   artworkUrl: string;
//   playbackCount: number;
//   permalinkUrl: string;
//   license: string;
//   licenseLabel: string;
//   sourceVerified: true;
//   commercialCcOnly: true;
//   attribution: string;
//   verifiedAt: string;
// };

// function artwork500(url: string) {
//   const u = String(url || "");
//   if (!u) return "";
//   return u.replace("-large", "-t500x500").replace("-badge", "-t500x500");
// }

// /** @param {any} raw */
// export function normalizeSoundCloudTrack(raw: any): SoundCloudTrackDto | null {
//   if (!raw || raw.kind === "playlist") return null;
//   const id = String(raw.id || "").trim();
//   if (!id) return null;

//   /* 음원 출처 확인: license 없거나 상업용 CC가 아니면 결과에서 제외 */
//   const license = normalizeSoundCloudLicense(raw.license);
//   if (!isCommercialCreativeCommonsLicense(license)) return null;

//   const policy = String(raw.policy || "").toUpperCase();
//   if (policy === "BLOCK" || policy === "SNIP") return null;
//   if (raw.streamable === false) return null;
//   const title = String(raw.title || "").trim();
//   if (!title) return null;
//   const artist = String(raw.user?.username || raw.user?.full_name || "").trim();
//   const permalink =
//     String(raw.permalink_url || "").trim() || `https://api.soundcloud.com/tracks/${id}`;

//   const verification = buildSoundCloudSourceVerification({
//     license,
//     title,
//     artist,
//     permalinkUrl: permalink
//   });
//   if (!verification) return null;

//   return {
//     id: `sc-${id}`,
//     trackId: id,
//     trackUrl: `https://api.soundcloud.com/tracks/${id}`,
//     title,
//     artist,
//     artworkUrl: artwork500(raw.artwork_url || raw.user?.avatar_url || ""),
//     playbackCount: Number(raw.playback_count) || 0,
//     permalinkUrl: permalink,
//     license: verification.license,
//     licenseLabel: verification.licenseLabel,
//     sourceVerified: true,
//     commercialCcOnly: true,
//     attribution: verification.attribution,
//     verifiedAt: verification.verifiedAt
//   };
// }

// async function fetchTracksByLicense(
//   query: string,
//   license: string,
//   clientId: string,
//   limit: number
// ): Promise<any[]> {
//   /* 공식 API: license 필터 지원 (상업용 CC 전용 검색) */
//   const official = new URL("https://api.soundcloud.com/tracks");
//   official.searchParams.set("q", query);
//   official.searchParams.set("license", license);
//   official.searchParams.set("client_id", clientId);
//   official.searchParams.set("limit", String(Math.min(50, limit)));
//   official.searchParams.set("linked_partitioning", "1");

//   try {
//     const res = await fetch(official.toString(), {
//       headers: {
//         Accept: "application/json",
//         "User-Agent": "VLUE-SoundCloud-BGM/1.0"
//       }
//     });
//     if (res.ok) {
//       const data = await res.json();
//       if (Array.isArray(data)) return data;
//       if (Array.isArray(data?.collection)) return data.collection;
//     }
//   } catch {
//     /* fall through to v2 */
//   }

//   /* api-v2 폴백: license 쿼리 + 클라이언트 측 재검증 */
//   const v2 = new URL("https://api-v2.soundcloud.com/search/tracks");
//   v2.searchParams.set("q", `${query} ${license}`);
//   v2.searchParams.set("client_id", clientId);
//   v2.searchParams.set("limit", String(Math.min(50, limit)));
//   v2.searchParams.set("offset", "0");
//   v2.searchParams.set("app_locale", "ko");
//   v2.searchParams.set("filter.license", license);

//   const res2 = await fetch(v2.toString(), {
//     headers: {
//       Accept: "application/json",
//       "User-Agent": "VLUE-SoundCloud-BGM/1.0",
//       Origin: "https://soundcloud.com",
//       Referer: "https://soundcloud.com/"
//     }
//   });
//   if (!res2.ok) return [];
//   const data2 = (await res2.json()) as { collection?: unknown[] };
//   return Array.isArray(data2.collection) ? data2.collection : [];
// }

// /**
//  * Creative Commons(상업 이용 가능)만 검색 → playback_count 인기순
//  */
// export async function searchSoundCloudTracksPopular(
//   query: string,
//   opts: { limit?: number; fetchLimit?: number } = {}
// ): Promise<SoundCloudTrackDto[]> {
//   const q = String(query || "").trim();
//   if (!q) return [];
//   const limit = Math.min(50, Math.max(1, Number(opts.limit) || 30));
//   const perLicense = Math.min(
//     50,
//     Math.max(12, Number(opts.fetchLimit) || Math.max(Math.ceil(limit / 2), 16))
//   );
//   const clientId = await resolveSoundCloudClientId();

//   const batches = await Promise.all(
//     SOUNDCLOUD_COMMERCIAL_CC_LICENSES.map((license) =>
//       fetchTracksByLicense(q, license, clientId, perLicense)
//     )
//   );

//   const mapped: SoundCloudTrackDto[] = [];
//   for (const batch of batches) {
//     for (const row of batch) {
//       const t = normalizeSoundCloudTrack(row);
//       if (t) mapped.push(t);
//     }
//   }

//   mapped.sort((a, b) => b.playbackCount - a.playbackCount);

//   const seen = new Set<string>();
//   const unique: SoundCloudTrackDto[] = [];
//   for (const t of mapped) {
//     /* 이중 검증: license 재확인 */
//     if (!isCommercialCreativeCommonsLicense(t.license) || !t.sourceVerified) continue;
//     if (seen.has(t.trackId)) continue;
//     seen.add(t.trackId);
//     unique.push(t);
//     if (unique.length >= limit) break;
//   }
//   return unique;
// }

// export { soundCloudLicenseLabel, isCommercialCreativeCommonsLicense };
