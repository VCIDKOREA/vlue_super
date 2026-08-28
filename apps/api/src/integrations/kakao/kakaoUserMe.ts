/**
 * 카카오 로그인 액세스 토큰으로 사용자 식별 정보 조회.
 * @see https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api#req-user-info
 */
export type KakaoUserProfile = {
  id: string;
  email: string | null;
  nickname: string | null;
  emailVerified: boolean;
  profileImageUrl: string | null;
};

export async function fetchKakaoUserFromAccessToken(accessToken: string): Promise<KakaoUserProfile> {
  const tok = String(accessToken || "").trim();
  if (!tok) {
    throw new Error("socialToken(액세스 토큰)이 비어 있습니다.");
  }

  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${tok}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      res.status === 401
        ? "카카오 액세스 토큰이 만료되었거나 유효하지 않습니다."
        : `카카오 사용자 정보 요청 실패 (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`
    );
  }

  const j = (await res.json()) as Record<string, unknown>;
  const id = j.id != null ? String(j.id) : "";
  if (!id) {
    throw new Error("카카오 응답에 사용자 id가 없습니다.");
  }

  const ac = (j.kakao_account as Record<string, unknown> | undefined) || {};
  const email = typeof ac.email === "string" && ac.email.trim() ? ac.email.trim() : null;
  const emailVerified = Boolean(ac.is_email_valid) && Boolean(ac.is_email_verified);

  const props = (j.properties as Record<string, unknown> | undefined) || {};
  const prof = ac.profile as Record<string, unknown> | undefined;
  const nickNeedsAgreement = Boolean(prof?.nickname_needs_agreement);
  const imgNeedsAgreement = Boolean(prof?.profile_image_needs_agreement);

  const nickFromProps =
    !nickNeedsAgreement && typeof props.nickname === "string" ? props.nickname.trim() : "";
  const nickFromProfile =
    !nickNeedsAgreement && prof && typeof prof.nickname === "string" ? String(prof.nickname).trim() : "";
  const nickname = nickFromProps || nickFromProfile || null;

  const imgFromProfile =
    !imgNeedsAgreement && prof && typeof prof.profile_image_url === "string"
      ? String(prof.profile_image_url).trim()
      : "";
  const imgFromProps =
    !imgNeedsAgreement && typeof props.profile_image === "string"
      ? String(props.profile_image).trim()
      : "";
  const profileImageUrl = imgFromProfile || imgFromProps || null;

  return { id, email, nickname, emailVerified, profileImageUrl };
}
