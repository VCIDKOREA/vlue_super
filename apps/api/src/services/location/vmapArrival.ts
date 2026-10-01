export const AUTO_ARRIVE_METERS = 15;
export const DROPOUT_MS = 15 * 60 * 1000;

type ArrivalMember = {
  departed?: boolean;
  arrived?: boolean;
  updatedAt?: Date | string | null;
};

export function isVmapDropout(member: ArrivalMember, now = Date.now()) {
  if (!member.departed || member.arrived) return false;
  const updated = member.updatedAt ? new Date(member.updatedAt).getTime() : 0;
  if (!Number.isFinite(updated)) return false;
  return now - updated >= DROPOUT_MS;
}

/** 출발했고 15분 안에 위치가 남은 사람만 전원 도착 조건에 넣는다. */
export function vmapRoomReadyToClose(members: ArrivalMember[], now = Date.now()) {
  const departed = members.filter((member) => member.departed);
  if (!departed.length) return false;
  const counted = departed.filter((member) => !isVmapDropout(member, now));
  if (!counted.length) return false;
  return counted.every((member) => member.arrived);
}
