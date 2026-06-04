/** VLUE public handle 비교용 정규화 */
export function normalizeFamilyHandle(handle) {
  return String(handle || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
}

/** 가족 보호 API 응답 → 채팅 목록 매칭용 활성 피어 집합 */
export function familyPeersFromProtectionData(data) {
  const userIds = new Set();
  const handles = new Set();

  const add = (user, status) => {
    if (status !== "active" || !user) return;
    const id = user.id ?? user.userId;
    if (id) userIds.add(String(id));
    const h = normalizeFamilyHandle(user.publicHandle);
    if (h) handles.add(h);
  };

  for (const link of data?.asGuardian || []) {
    add(link.wardUser, link.status);
  }
  for (const link of data?.asWard || []) {
    add(link.guardianUser, link.status);
  }
  for (const peer of data?.familyPeers || []) {
    if (peer.status !== "active") continue;
    if (peer.userId) userIds.add(String(peer.userId));
    const h = normalizeFamilyHandle(peer.publicHandle);
    if (h) handles.add(h);
  }

  return { userIds, handles };
}

export function roomMatchesFamilyPeer(room, peers) {
  if (!room || !peers) return false;
  const uid = room.peerUserId;
  if (uid && peers.userIds.has(String(uid))) return true;
  const handle = normalizeFamilyHandle(room.peerPublicHandle);
  if (handle && peers.handles.has(handle)) return true;
  return false;
}
