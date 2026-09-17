package kr.vlue.calloverlay

import androidx.lifecycle.ViewModel
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.rewarded.RewardItem
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.gms.ads.rewarded.ServerSideVerificationOptions
import org.json.JSONObject

/**
 * 쇼케이스/BGM 보상형 광고 핸들러.
 * 15초·30초는 정책상 광고 단위 구분이며 실제 소재 길이는 AdMob이 결정한다.
 * 영구 권한은 네이티브 콜백이 아니라 서버 SSV가 확정한다.
 */
class VlueRewardedAdViewModel : ViewModel() {
    private var loading = false
    private var showing = false
    private var rewardedAd: RewardedAd? = null

    data class Request(
        val requestId: String,
        val action: String,
        val userId: String,
        val grantId: String,
    )

    fun show(
        activity: MainActivity,
        request: Request,
        notifyWeb: (String) -> Unit,
    ) {
        if (loading || showing) {
            notifyWeb(resultJson(request, "busy"))
            return
        }
        if (request.requestId.isBlank() || request.userId.isBlank() || request.grantId.isBlank()) {
            notifyWeb(resultJson(request, "error", "invalid_request"))
            return
        }
        val adUnitId =
            when (request.action) {
                "showcase_slot_unlock" -> BuildConfig.ADMOB_REWARDED_30_ID
                "showcase_save", "bgm_apply" -> BuildConfig.ADMOB_REWARDED_15_ID
                else -> {
                    notifyWeb(resultJson(request, "error", "invalid_action"))
                    return
                }
            }

        loading = true
        RewardedAd.load(
            activity,
            adUnitId,
            AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdFailedToLoad(error: LoadAdError) {
                    loading = false
                    rewardedAd = null
                    notifyWeb(resultJson(request, "error", "load_${error.code}"))
                }

                override fun onAdLoaded(ad: RewardedAd) {
                    loading = false
                    rewardedAd = ad
                    val ssv =
                        ServerSideVerificationOptions.Builder()
                            .setUserId(request.userId)
                            .setCustomData(request.grantId)
                            .build()
                    ad.setServerSideVerificationOptions(ssv)
                    present(activity, request, ad, notifyWeb)
                }
            },
        )
    }

    private fun present(
        activity: MainActivity,
        request: Request,
        ad: RewardedAd,
        notifyWeb: (String) -> Unit,
    ) {
        var earned = false
        showing = true
        ad.fullScreenContentCallback =
            object : FullScreenContentCallback() {
                override fun onAdFailedToShowFullScreenContent(error: AdError) {
                    showing = false
                    rewardedAd = null
                    notifyWeb(resultJson(request, "error", "show_${error.code}"))
                }

                override fun onAdDismissedFullScreenContent() {
                    showing = false
                    rewardedAd = null
                    if (!earned) notifyWeb(resultJson(request, "dismissed"))
                }
            }
        ad.show(activity) { reward: RewardItem ->
            earned = true
            /* 서버는 동일 grantId의 AdMob SSV 서명 콜백을 별도로 검증한다. */
            notifyWeb(
                resultJson(
                    request,
                    "earned",
                    rewardType = reward.type,
                    rewardAmount = reward.amount,
                ),
            )
        }
    }

    private fun resultJson(
        request: Request,
        status: String,
        error: String? = null,
        rewardType: String? = null,
        rewardAmount: Int? = null,
    ): String =
        JSONObject()
            .put("requestId", request.requestId)
            .put("grantId", request.grantId)
            .put("action", request.action)
            .put("status", status)
            .apply {
                if (error != null) put("error", error)
                if (rewardType != null) put("rewardType", rewardType)
                if (rewardAmount != null) put("rewardAmount", rewardAmount)
            }
            .toString()

    override fun onCleared() {
        rewardedAd = null
        super.onCleared()
    }
}
