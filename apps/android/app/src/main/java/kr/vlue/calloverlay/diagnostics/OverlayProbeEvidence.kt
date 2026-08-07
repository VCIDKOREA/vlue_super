package kr.vlue.calloverlay.diagnostics

import android.content.Context
import android.os.Build
import android.view.WindowManager
import org.json.JSONArray
import org.json.JSONObject

/**
 * Overlay probe 비교 결론 + Evidence Score.
 * Diagnostics 뷰어가 "왜 이 결론인지"를 바로 읽도록 structured payload 생성.
 */
object OverlayProbeEvidence {
    data class Built(
        val conclusion: String,
        val confidence: Int,
        val analysisHint: String,
        val evidence: JSONArray,
        val evidenceLines: List<String>,
        val analysisJson: JSONObject
    )

    fun resolveInstaller(context: Context): String? {
        return try {
            if (Build.VERSION.SDK_INT >= 30) {
                context.packageManager.getInstallSourceInfo(context.packageName).installingPackageName
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getInstallerPackageName(context.packageName)
            }
        } catch (_: Exception) {
            null
        }
    }

    fun build(
        context: Context,
        probeKind: String,
        result: String,
        params: WindowManager.LayoutParams?,
        canDrawOverlays: Boolean,
        priorNormalResult: String?,
        errorMessage: String?,
        errorClass: String?
    ): Built {
        val type = params?.type ?: -1
        val type2038 = type == WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        val installer = resolveInstaller(context)
        val installerLabel = installer ?: "null(sideload/unknown)"
        val isSamsung =
            Build.MANUFACTURER.equals("samsung", true) || Build.BRAND.equals("samsung", true)
        val callBadToken =
            result == "EXCEPTION" &&
                (
                    errorClass?.contains("BadToken", ignoreCase = true) == true ||
                        errorMessage?.contains("permission denied", ignoreCase = true) == true ||
                        errorMessage?.contains("2038") == true
                    )
        val callResultLabel = when {
            callBadToken -> "BadTokenException"
            result == "EXCEPTION" -> "EXCEPTION"
            else -> result
        }
        val normalOk = priorNormalResult.equals("SUCCESS", ignoreCase = true)
        val normalFailed =
            !priorNormalResult.isNullOrBlank() &&
                !priorNormalResult.equals("SUCCESS", ignoreCase = true) &&
                !priorNormalResult.equals("null", ignoreCase = true)
        val storeOrAdb =
            installer != null && (
                installer == "com.android.vending" ||
                    installer == "com.sec.android.app.samsungapps" ||
                    installer == "com.android.shell"
                )
        val nonStoreInstall = !storeOrAdb

        val items = mutableListOf<EvidenceItem>()

        when {
            probeKind == "CALL_OVERLAY_PROBE" && normalOk && result == "EXCEPTION" -> {
                items += EvidenceItem(true, "NORMAL_SUCCESS", "NORMAL_OVERLAY_PROBE = SUCCESS", 18)
                items += EvidenceItem(
                    callBadToken,
                    "CALL_BAD_TOKEN",
                    "CALL_OVERLAY_PROBE = $callResultLabel",
                    if (callBadToken) 22 else 12
                )
                items += EvidenceItem(type2038, "TYPE_2038", "LayoutParams.type = $type", 15)
                items += EvidenceItem(
                    canDrawOverlays,
                    "CAN_DRAW",
                    "Settings.canDrawOverlays = $canDrawOverlays",
                    15
                )
                items += EvidenceItem(
                    isSamsung,
                    "SAMSUNG_DEVICE",
                    "manufacturer/brand = ${Build.MANUFACTURER}/${Build.BRAND}",
                    12
                )
                items += EvidenceItem(
                    nonStoreInstall,
                    "INSTALLER",
                    "installerPackage = $installerLabel",
                    10
                )
                val score = (50 + items.sumOf { if (it.ok) it.weight else 0 }).coerceIn(0, 99)
                return finish(
                    conclusion = "SamsungCallPolicyLikely",
                    confidence = score.coerceAtLeast(70),
                    items = items
                )
            }

            probeKind == "CALL_OVERLAY_PROBE" && normalFailed && result != "SUCCESS" -> {
                items += EvidenceItem(
                    true,
                    "NORMAL_FAIL",
                    "NORMAL_OVERLAY_PROBE = $priorNormalResult",
                    20
                )
                items += EvidenceItem(
                    true,
                    "CALL_FAIL",
                    "CALL_OVERLAY_PROBE = $callResultLabel",
                    20
                )
                items += EvidenceItem(type2038, "TYPE_2038", "LayoutParams.type = $type", 12)
                items += EvidenceItem(
                    true,
                    "CAN_DRAW",
                    "Settings.canDrawOverlays = $canDrawOverlays",
                    if (!canDrawOverlays) 20 else 8
                )
                items += EvidenceItem(
                    true,
                    "INSTALLER",
                    "installerPackage = $installerLabel",
                    8
                )
                val score = (45 + items.sumOf { if (it.ok) it.weight else 0 }).coerceIn(0, 99)
                return finish(
                    conclusion = "PermissionOrContextLikely",
                    confidence = score.coerceAtLeast(65),
                    items = items
                )
            }

            probeKind == "CALL_OVERLAY_PROBE" && result == "SUCCESS" -> {
                items += EvidenceItem(true, "CALL_SUCCESS", "CALL_OVERLAY_PROBE = SUCCESS", 25)
                items += EvidenceItem(type2038, "TYPE_2038", "LayoutParams.type = $type", 10)
                items += EvidenceItem(
                    canDrawOverlays,
                    "CAN_DRAW",
                    "Settings.canDrawOverlays = $canDrawOverlays",
                    10
                )
                if (normalOk) {
                    items += EvidenceItem(true, "NORMAL_SUCCESS", "NORMAL_OVERLAY_PROBE = SUCCESS", 10)
                }
                val score = (40 + items.sumOf { if (it.ok) it.weight else 0 }).coerceIn(0, 99)
                return finish(
                    conclusion = "OverlayPermissionOk",
                    confidence = score.coerceAtLeast(60),
                    items = items
                )
            }

            probeKind == "NORMAL_OVERLAY_PROBE" && result == "SUCCESS" -> {
                items += EvidenceItem(true, "NORMAL_SUCCESS", "NORMAL_OVERLAY_PROBE = SUCCESS", 25)
                items += EvidenceItem(type2038, "TYPE_2038", "LayoutParams.type = $type", 15)
                items += EvidenceItem(
                    canDrawOverlays,
                    "CAN_DRAW",
                    "Settings.canDrawOverlays = $canDrawOverlays",
                    15
                )
                items += EvidenceItem(
                    true,
                    "INSTALLER",
                    "installerPackage = $installerLabel",
                    8
                )
                items += EvidenceItem(
                    false,
                    "AWAIT_CALL",
                    "CALL_OVERLAY_PROBE = (pending — run a call to compare)",
                    0
                )
                val score = (35 + items.sumOf { if (it.ok) it.weight else 0 }).coerceIn(0, 99)
                return finish(
                    conclusion = "AwaitCallOverlayProbe",
                    confidence = score.coerceAtMost(70),
                    items = items
                )
            }

            probeKind == "NORMAL_OVERLAY_PROBE" && result != "SUCCESS" -> {
                items += EvidenceItem(
                    true,
                    "NORMAL_FAIL",
                    "NORMAL_OVERLAY_PROBE = $result",
                    25
                )
                items += EvidenceItem(type2038, "TYPE_2038", "LayoutParams.type = $type", 12)
                items += EvidenceItem(
                    true,
                    "CAN_DRAW",
                    "Settings.canDrawOverlays = $canDrawOverlays",
                    if (!canDrawOverlays) 22 else 10
                )
                items += EvidenceItem(
                    true,
                    "INSTALLER",
                    "installerPackage = $installerLabel",
                    10
                )
                if (!errorMessage.isNullOrBlank()) {
                    items += EvidenceItem(
                        true,
                        "ERROR",
                        "error = ${errorClass ?: ""}: $errorMessage",
                        10
                    )
                }
                val score = (40 + items.sumOf { if (it.ok) it.weight else 0 }).coerceIn(0, 99)
                return finish(
                    conclusion = "PermissionOrContextLikely",
                    confidence = score.coerceAtLeast(60),
                    items = items
                )
            }

            else -> {
                items += EvidenceItem(true, "RECORDED", "$probeKind = $result", 10)
                return finish(
                    conclusion = "InsufficientEvidence",
                    confidence = 30,
                    items = items
                )
            }
        }
    }

    private fun finish(
        conclusion: String,
        confidence: Int,
        items: List<EvidenceItem>
    ): Built {
        val arr = JSONArray()
        val lines = mutableListOf<String>()
        for (item in items) {
            val mark = if (item.ok) "✔" else "✘"
            lines += "$mark ${item.label}"
            arr.put(
                JSONObject().apply {
                    put("ok", item.ok)
                    put("key", item.key)
                    put("label", item.label)
                    put("weight", item.weight)
                    put("mark", mark)
                }
            )
        }
        val analysis = JSONObject().apply {
            put("conclusion", conclusion)
            put("confidence", confidence)
            put("confidenceLabel", "$confidence%")
            put("evidenceScore", confidence)
        }
        return Built(
            conclusion = conclusion,
            confidence = confidence,
            analysisHint = conclusion,
            evidence = arr,
            evidenceLines = lines,
            analysisJson = analysis
        )
    }

    private data class EvidenceItem(
        val ok: Boolean,
        val key: String,
        val label: String,
        val weight: Int
    )
}
