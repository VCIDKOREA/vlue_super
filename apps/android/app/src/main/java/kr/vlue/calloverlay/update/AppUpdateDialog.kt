package kr.vlue.calloverlay.update

import android.app.Activity
import android.app.AlertDialog
import android.content.DialogInterface
import android.util.Log
import android.view.KeyEvent

/**
 * 강제 / 선택 업데이트 다이얼로그.
 */
object AppUpdateDialog {
    private const val TAG = "VlueAppUpdate"

    /**
     * @param onClosed 다이얼로그가 닫힌 뒤 호출. [openedStore]는 업데이트하기를 눌렀는지.
     */
    fun show(
        activity: Activity,
        decision: AppUpdateDecision,
        remote: AppVersionInfo?,
        onClosed: (openedStore: Boolean) -> Unit
    ) {
        if (activity.isFinishing) {
            onClosed(false)
            return
        }
        try {
            val forced = decision.kind == AppUpdateKind.FORCED
            val title =
                if (decision.latestVersionName.isNotBlank()) {
                    if (forced) {
                        "필수 업데이트 (${decision.latestVersionName})"
                    } else {
                        "업데이트 안내 (${decision.latestVersionName})"
                    }
                } else {
                    if (forced) "필수 업데이트" else "업데이트 안내"
                }
            val body =
                buildString {
                    append(decision.message.trim())
                    if (isNotEmpty()) append("\n\n")
                    append("현재 버전: ")
                    append(formatVersion(decision.currentVersionName, decision.currentVersionCode))
                    append("\n최신 버전: ")
                    append(formatVersion(decision.latestVersionName, decision.latestVersionCode))
                }

            var openedStore = false
            val builder =
                AlertDialog.Builder(activity)
                    .setTitle(title)
                    .setMessage(body)
                    .setCancelable(!forced)
                    .setPositiveButton("업데이트하기") { _, _ ->
                        openedStore = true
                        AppUpdateStoreLinks.openStore(activity, remote)
                    }

            if (!forced) {
                builder.setNegativeButton("다음에 하기") { d, _ -> d.dismiss() }
            }

            val dialog = builder.create()
            dialog.setCanceledOnTouchOutside(!forced)
            if (forced) {
                dialog.setOnKeyListener { _, keyCode, _ ->
                    keyCode == KeyEvent.KEYCODE_BACK
                }
            }
            dialog.setOnDismissListener {
                onClosed(openedStore)
            }
            dialog.setOnShowListener {
                if (forced) {
                    dialog.getButton(DialogInterface.BUTTON_POSITIVE)?.isAllCaps = false
                }
            }
            dialog.show()
        } catch (e: Exception) {
            Log.w(TAG, "show update dialog failed", e)
            onClosed(false)
        }
    }

    private fun formatVersion(name: String, code: Int): String {
        val n = name.trim()
        return when {
            n.isNotBlank() && code > 0 -> "$n ($code)"
            n.isNotBlank() -> n
            code > 0 -> code.toString()
            else -> "-"
        }
    }
}
