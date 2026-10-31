package kr.vlue.calloverlay.update

/** 업데이트 팝업 종류 */
enum class AppUpdateKind {
    NONE,
    OPTIONAL,
    FORCED
}

data class AppUpdateDecision(
    val kind: AppUpdateKind,
    val currentVersionCode: Int,
    val currentVersionName: String,
    val latestVersionCode: Int,
    val latestVersionName: String,
    val message: String
)

/**
 * 순수 버전 비교 — UI·네트워크와 분리해 단위 테스트한다.
 *
 * - 현재 ≥ 최신 → 없음
 * - 현재 < 최소 지원 또는 isForced → 강제
 * - 그 외 현재 < 최신 → 선택
 */
object AppVersionPolicy {
    fun decide(
        currentVersionCode: Int,
        currentVersionName: String,
        remote: AppVersionInfo
    ): AppUpdateDecision {
        val latestCode = remote.latestVersionCode
        if (latestCode <= 0 || currentVersionCode >= latestCode) {
            return AppUpdateDecision(
                kind = AppUpdateKind.NONE,
                currentVersionCode = currentVersionCode,
                currentVersionName = currentVersionName,
                latestVersionCode = latestCode,
                latestVersionName = remote.latestVersionName,
                message = ""
            )
        }

        val belowMin = currentVersionCode < remote.minRequiredVersionCode
        val forced = belowMin || remote.isForced
        return AppUpdateDecision(
            kind = if (forced) AppUpdateKind.FORCED else AppUpdateKind.OPTIONAL,
            currentVersionCode = currentVersionCode,
            currentVersionName = currentVersionName,
            latestVersionCode = latestCode,
            latestVersionName = remote.latestVersionName,
            message = if (forced) remote.forceMessage else remote.message
        )
    }
}
