package kr.vlue.calloverlay

import android.view.View
import android.view.WindowManager

/**
 * 오버레이 창 참조만 보관한다.
 * 서비스 인스턴스가 바뀌어 필드 참조를 잃어도, 통화 종료 때 붙어 있는 창을 제거한다.
 * 위치·크기·탭 동작은 바꾸지 않는다.
 */
object OverlayWindowRegistry {
    private val lock = Any()
    private var windowManager: WindowManager? = null
    private var root: View? = null

    fun hold(wm: WindowManager, view: View) {
        synchronized(lock) {
            windowManager = wm
            root = view
        }
    }

    /** 이미 제거된 창이면 참조만 버리고, 아직 붙어 있으면 즉시 제거한다. */
    fun removeIfAttached() {
        val wm: WindowManager
        val view: View
        synchronized(lock) {
            wm = windowManager ?: return
            view = root ?: return
            windowManager = null
            root = null
        }
        if (!view.isAttachedToWindow) return
        try {
            wm.removeViewImmediate(view)
        } catch (_: Exception) {
            try {
                wm.removeView(view)
            } catch (_: Exception) {
                /* 이미 떨어진 창 */
            }
        }
    }
}
