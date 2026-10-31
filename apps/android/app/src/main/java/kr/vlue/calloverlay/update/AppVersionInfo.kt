package kr.vlue.calloverlay.update

/**
 * 서버 `/api/app/android-version` 응답 모델.
 * camelCase·snake_case 모두 파싱한다.
 */
data class AppVersionInfo(
    val latestVersionCode: Int,
    val latestVersionName: String,
    val minRequiredVersionCode: Int,
    val isForced: Boolean,
    val message: String,
    val forceMessage: String,
    val playStoreUrl: String? = null,
    val marketUrl: String? = null,
    val appStoreUrl: String? = null
) {
    companion object {
        fun fromJson(json: org.json.JSONObject): AppVersionInfo {
            val store = json.optJSONObject("store")
            val latestCode =
                json.optInt("latestVersionCode", 0).takeIf { it > 0 }
                    ?: json.optInt("latest_version_code", 0)
            val minRequired =
                json.optInt("minRequiredVersionCode", 0).takeIf { it > 0 }
                    ?: json.optInt("min_required_version", 0).takeIf { it > 0 }
                    ?: 1
            val forced =
                when {
                    json.has("isForced") -> json.optBoolean("isForced", false)
                    json.has("is_forced") -> json.optBoolean("is_forced", false)
                    else -> false
                }
            val latestName =
                json.optString("latestVersionName").trim().ifBlank {
                    json.optString("latest_version").trim()
                }
            return AppVersionInfo(
                latestVersionCode = latestCode,
                latestVersionName = latestName,
                minRequiredVersionCode = minRequired.coerceAtMost(latestCode.coerceAtLeast(1)),
                isForced = forced,
                message =
                    json.optString("message").trim().ifBlank {
                        "새로운 버전이 있습니다. 업데이트하시겠습니까?"
                    },
                forceMessage =
                    json.optString("forceMessage").trim().ifBlank {
                        json.optString("force_message").trim().ifBlank {
                            "필수 업데이트가 있습니다. 스토어에서 최신 버전으로 업데이트해 주세요."
                        }
                    },
                playStoreUrl = store?.optString("play")?.trim()?.ifBlank { null },
                marketUrl = store?.optString("market")?.trim()?.ifBlank { null },
                appStoreUrl = store?.optString("appStore")?.trim()?.ifBlank { null }
            )
        }
    }
}
