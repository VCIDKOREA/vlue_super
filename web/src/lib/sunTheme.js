/** GPS와 날짜로 일출·일몰을 구해 지도 테마를 고른다. 외부 라이브러리 없음. */

const RAD = Math.PI / 180;
const DAY_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = RAD * 23.4397;

function toJulian(date) {
  return date.valueOf() / DAY_MS - 0.5 + J1970;
}

function fromJulian(julian) {
  return new Date((julian + 0.5 - J1970) * DAY_MS);
}

function toDays(date) {
  return toJulian(date) - J2000;
}

function solarMeanAnomaly(days) {
  return RAD * (357.5291 + 0.98560028 * days);
}

function eclipticLongitude(meanAnomaly) {
  const center =
    RAD * (1.9148 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly) + 0.0003 * Math.sin(3 * meanAnomaly));
  return meanAnomaly + center + RAD * 102.9372 + Math.PI;
}

function declination(longitude) {
  return Math.asin(Math.sin(longitude) * Math.sin(OBLIQUITY));
}

function julianCycle(days, lw) {
  return Math.round(days - 0.0009 - lw / (2 * Math.PI));
}

function approxTransit(angle, lw, cycle) {
  return 0.0009 + (angle + lw) / (2 * Math.PI) + cycle;
}

function solarTransit(days, meanAnomaly, longitude) {
  return J2000 + days + 0.0053 * Math.sin(meanAnomaly) - 0.0069 * Math.sin(2 * longitude);
}

function hourAngle(height, latitudeRad, dec) {
  return Math.acos((Math.sin(height) - Math.sin(latitudeRad) * Math.sin(dec)) / (Math.cos(latitudeRad) * Math.cos(dec)));
}

export function sunTimes(date, latitude, longitude) {
  const lw = RAD * -longitude;
  const phi = RAD * latitude;
  const days = toDays(date);
  const cycle = julianCycle(days, lw);
  const transitDays = approxTransit(0, lw, cycle);
  const anomaly = solarMeanAnomaly(transitDays);
  const longitudeEcl = eclipticLongitude(anomaly);
  const dec = declination(longitudeEcl);
  const noon = solarTransit(transitDays, anomaly, longitudeEcl);
  const angle = hourAngle(-0.833 * RAD, phi, dec);
  const set = solarTransit(approxTransit(angle, lw, cycle), anomaly, longitudeEcl);
  const rise = noon - (set - noon);
  return { sunrise: fromJulian(rise), sunset: fromJulian(set) };
}

export function isDaylight(date, latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const hour = date.getHours();
    return hour >= 7 && hour < 19;
  }
  try {
    const { sunrise, sunset } = sunTimes(date, latitude, longitude);
    return date >= sunrise && date < sunset;
  } catch {
    const hour = date.getHours();
    return hour >= 7 && hour < 19;
  }
}

export function resolveMapTheme(preference, latitude, longitude, date = new Date()) {
  if (preference === "light" || preference === "dark") return preference;
  return isDaylight(date, latitude, longitude) ? "light" : "dark";
}

export function haversineMeters(aLat, aLng, bLat, bLng) {
  const r = 6371000;
  const dLat = (bLat - aLat) * RAD;
  const dLng = (bLng - aLng) * RAD;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(aLat * RAD) * Math.cos(bLat * RAD) * s2 * s2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * TODO(routes): 도로 위 Polyline과 정확한 ETA는 Google Routes API 또는 Kakao Mobility 키가 필요하다.
 * 지금은 직선 경로와 시속 28km 추정만 사용한다. 외부 지도 앱으로 보내지 않는다.
 */
export function estimateEtaMinutes(meters) {
  if (!Number.isFinite(meters) || meters < 40) return 1;
  return Math.max(1, Math.round((meters / 28000) * 60));
}
