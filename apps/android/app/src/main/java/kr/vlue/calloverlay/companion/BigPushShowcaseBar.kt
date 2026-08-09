package kr.vlue.calloverlay.companion

import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import kr.vlue.calloverlay.R
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * 수신자용 BigPush 쇼케이스 바 (상대에게 보이는 UI).
 * 앱 홈 미리보기와 동일 정보(회사·이름·직함·로고·인증)를 표시하되
 * 소유자 전용 「통화화면 보기」「설정」은 절대 노출하지 않는다.
 *
 * 아바타: CEO(@ceo) → VLUE 브랜드 마크 / 그 외 사진 없음 → 카톡형 실루엣
 * (빈 로고에 VLUE 눈을 자동 넣지 않음)
 */
object BigPushShowcaseBar {

    const val TAG_ROOT = "bigpush_showcase_bar"
    const val TAG_BRAND = "bar_brand"
    const val TAG_PRIMARY = "bar_primary"
    const val TAG_SECONDARY = "bar_secondary"
    const val TAG_AVATAR = "bar_avatar"
    const val TAG_VERIFIED = "bar_verified"
    const val WINDOW_HEIGHT_DP = 156

    enum class AvatarKind {
        PHOTO,
        CEO_BRAND,
        SILHOUETTE
    }

    private val io by lazy { Executors.newSingleThreadExecutor() }
    private val main by lazy { Handler(Looper.getMainLooper()) }

    data class Model(
        val brandLabel: String,
        val primaryLine: String,
        val secondaryLine: String,
        val verified: Boolean,
        val avatarUrl: String?,
        val avatarKind: AvatarKind
    )

    fun parseModel(phone: String, verified: Boolean, cardJson: String?): Model {
        val json = cardJson?.takeIf { it.isNotBlank() }?.let {
            try {
                JSONObject(it)
            } catch (_: Exception) {
                null
            }
        }
        val card = json?.optJSONObject("card") ?: json
        val profile = card?.optJSONObject("profile") ?: json?.optJSONObject("profile")

        val displayName = firstNonBlank(
            card?.optString("displayName"),
            json?.optString("displayName"),
            card?.optString("name"),
            card?.optString("legalName")
        )
        /* API cardLookup: companyName / jobTitle (organization 아님) */
        val org = firstNonBlank(
            card?.optString("companyName"),
            json?.optString("companyName"),
            card?.optString("organization"),
            json?.optString("organization"),
            profile?.optString("companyName"),
            profile?.optString("organization")
        )
        val handle = firstNonBlank(
            card?.optString("publicHandle"),
            json?.optString("publicHandle"),
            card?.optString("vlueId"),
            json?.optString("vlueId")
        )?.removePrefix("@")?.lowercase()
        val isCeo = handle == "ceo" ||
            firstNonBlank(json?.optString("phoneE164"), card?.optString("phoneE164"), phone)
                ?.let { normalizeDigits(it) } == "821080144666"
        /* 프로필 사진만 — 회사 로고·VLUE 눈을 빈 자리에 넣지 않음 */
        val photo = firstNonBlank(
            json?.optString("image_url"),
            card?.optString("image_url"),
            card?.optString("photoUrl"),
            card?.optString("avatarUrl"),
            card?.optString("imageUrl"),
            json?.optString("avatarUrl"),
            json?.optString("photoUrl"),
            profile?.optString("image_url"),
            profile?.optString("imageUrl"),
            profile?.optString("photo_url"),
            profile?.optString("photoUrl"),
            profile?.optString("portrait_url")
        )
        val (avatarKind, avatar) = when {
            !photo.isNullOrBlank() -> AvatarKind.PHOTO to photo
            isCeo -> AvatarKind.CEO_BRAND to null
            else -> AvatarKind.SILHOUETTE to null
        }
        val phoneDisp = formatPhone(
            firstNonBlank(json?.optString("phoneE164"), card?.optString("phoneE164"), phone).orEmpty()
        )
        val brand = if (!handle.isNullOrBlank()) "$handle Showcase" else "VLUE Showcase"
        /* 앱 미리보기와 동일: 1행 = 회사 · 이름 (직함 제외), 2행 = 회사 / 번호 */
        val primary = when {
            !org.isNullOrBlank() && !displayName.isNullOrBlank() -> "$org · $displayName"
            !displayName.isNullOrBlank() -> displayName
            else -> phoneDisp.ifBlank { "번호 확인 중…" }
        }
        val secondary = when {
            !org.isNullOrBlank() && phoneDisp.isNotBlank() -> "$org / $phoneDisp"
            phoneDisp.isNotBlank() -> phoneDisp
            verified -> "VLUE 인증 · 쇼케이스"
            else -> "상대 번호 확인 중…"
        }
        /* jobTitle 은 펼침 쇼케이스 본문에만 사용 — 바에는 넣지 않음 */
        return Model(
            brandLabel = brand,
            primaryLine = primary,
            secondaryLine = secondary,
            verified = verified ||
                json?.optBoolean("is_verified", false) == true ||
                json?.optBoolean("verified", false) == true ||
                card?.optBoolean("verified", false) == true,
            avatarUrl = avatar,
            avatarKind = avatarKind
        )
    }

    fun create(
        context: Context,
        phone: String,
        verified: Boolean,
        outgoing: Boolean,
        cardJson: String?,
        onBarTap: (() -> Unit)? = null
    ): LinearLayout {
        val model = parseModel(phone, verified, cardJson)
        val density = context.resources.displayMetrics.density
        fun dp(v: Int) = (v * density + 0.5f).toInt()

        val root = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            tag = TAG_ROOT
            /* 7번 쇼케이스 바: 진한 네이비 + 얇은 테두리 + 큰 라운드 (통화화면/설정/▾ 없음) */
            background = roundedBg(
                fill = Color.parseColor("#F20B1220"),
                stroke = Color.parseColor("#66E2E8F0"),
                radiusDp = 22f,
                density = density
            )
            setPadding(dp(14), dp(10), dp(12), dp(12))
            elevation = dp(10).toFloat()
            clipToOutline = true
            outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
            isClickable = onBarTap != null
            isFocusable = onBarTap != null
            if (onBarTap != null) {
                setOnClickListener { onBarTap.invoke() }
            }
        }

        /* Row 1: live + brand only */
        val top = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        top.addView(
            TextView(context).apply {
                text = "▎▎▎"
                setTextColor(Color.parseColor("#00D2FF"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 9f)
                typeface = Typeface.DEFAULT_BOLD
                setPadding(0, 0, dp(6), 0)
                letterSpacing = -0.12f
            }
        )
        top.addView(
            TextView(context).apply {
                tag = TAG_BRAND
                text = if (outgoing) "VLUE 발신" else model.brandLabel
                setTextColor(Color.WHITE)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                typeface = Typeface.DEFAULT_BOLD
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
        )
        root.addView(top)

        val body = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(8), 0, 0)
        }

        val avatar = ImageView(context).apply {
            tag = TAG_AVATAR
            layoutParams = LinearLayout.LayoutParams(dp(42), dp(42)).apply {
                marginEnd = dp(10)
            }
            scaleType = ImageView.ScaleType.CENTER_CROP
            background = roundedBg(
                fill = Color.parseColor("#1E293B"),
                stroke = Color.parseColor("#44E2E8F0"),
                radiusDp = 12f,
                density = density
            )
            clipToOutline = true
            outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
            applyDefaultAvatar(this, model.avatarKind)
        }
        body.addView(avatar)
        loadAvatar(avatar, model.avatarKind, model.avatarUrl)

        val textCol = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        val nameRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        nameRow.addView(
            TextView(context).apply {
                tag = TAG_PRIMARY
                text = model.primaryLine
                setTextColor(Color.WHITE)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                typeface = Typeface.DEFAULT_BOLD
                maxLines = 1
                ellipsize = android.text.TextUtils.TruncateAt.END
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
        )
        nameRow.addView(
            TextView(context).apply {
                tag = TAG_VERIFIED
                text = "✓"
                setTextColor(Color.parseColor("#0F172A"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                setPadding(dp(5), dp(2), dp(5), dp(2))
                background = roundedBg(
                    fill = Color.parseColor("#E2E8F0"),
                    stroke = Color.TRANSPARENT,
                    radiusDp = 999f,
                    density = density
                )
                visibility = if (model.verified) View.VISIBLE else View.GONE
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { marginStart = dp(6) }
            }
        )
        textCol.addView(nameRow)
        textCol.addView(
            TextView(context).apply {
                tag = TAG_SECONDARY
                text = model.secondaryLine
                setTextColor(Color.parseColor("#94A3B8"))
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                maxLines = 1
                ellipsize = android.text.TextUtils.TruncateAt.END
                setPadding(0, dp(2), 0, 0)
            }
        )
        body.addView(textCol)
        /* ▾ / △ 삭제 — 바 전체 탭으로 Showcase 오픈 */
        root.addView(body)
        return root
    }

    fun bind(banner: View, phone: String, verified: Boolean, outgoing: Boolean, cardJson: String?) {
        val model = parseModel(phone, verified, cardJson)
        banner.findViewWithTag<TextView>(TAG_BRAND)?.text =
            if (outgoing) "VLUE 발신" else model.brandLabel
        banner.findViewWithTag<TextView>(TAG_PRIMARY)?.text = model.primaryLine
        banner.findViewWithTag<TextView>(TAG_SECONDARY)?.text = model.secondaryLine
        banner.findViewWithTag<TextView>(TAG_VERIFIED)?.visibility =
            if (model.verified) View.VISIBLE else View.GONE
        banner.findViewWithTag<ImageView>(TAG_AVATAR)?.let {
            loadAvatar(it, model.avatarKind, model.avatarUrl)
        }
    }

    private fun applyDefaultAvatar(view: ImageView, kind: AvatarKind) {
        when (kind) {
            AvatarKind.CEO_BRAND -> {
                view.scaleType = ImageView.ScaleType.FIT_CENTER
                view.setImageResource(R.drawable.ic_vlue_brand_mark)
                view.setPadding(0, 0, 0, 0)
            }
            AvatarKind.SILHOUETTE -> {
                view.scaleType = ImageView.ScaleType.CENTER_CROP
                view.setImageResource(R.drawable.ic_avatar_person_silhouette)
            }
            AvatarKind.PHOTO -> {
                view.scaleType = ImageView.ScaleType.CENTER_CROP
                view.setImageResource(R.drawable.ic_avatar_person_silhouette)
            }
        }
    }

    private fun loadAvatar(view: ImageView, kind: AvatarKind, url: String?) {
        applyDefaultAvatar(view, kind)
        if (kind != AvatarKind.PHOTO || url.isNullOrBlank()) return
        if (url.startsWith("content:") || url.startsWith("file:")) {
            try {
                view.setImageURI(android.net.Uri.parse(url))
            } catch (_: Exception) {
                applyDefaultAvatar(view, AvatarKind.SILHOUETTE)
            }
            return
        }
        if (!url.startsWith("http")) return
        val token = url
        view.setTag(TAG_AVATAR.hashCode(), token)
        io.execute {
            try {
                val conn = (URL(token).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 4000
                    readTimeout = 4000
                    instanceFollowRedirects = true
                }
                conn.inputStream.use { stream ->
                    val bmp = BitmapFactory.decodeStream(stream) ?: return@execute
                    main.post {
                        if (view.getTag(TAG_AVATAR.hashCode()) == token) {
                            view.scaleType = ImageView.ScaleType.CENTER_CROP
                            view.setImageBitmap(bmp)
                        }
                    }
                }
                conn.disconnect()
            } catch (_: Exception) {
                main.post { applyDefaultAvatar(view, AvatarKind.SILHOUETTE) }
            }
        }
    }

    private fun normalizeDigits(raw: String): String {
        val d = raw.filter { it.isDigit() }
        return when {
            d.startsWith("82") -> d
            d.startsWith("0") && d.length >= 10 -> "82" + d.drop(1)
            else -> d
        }
    }

    private fun roundedBg(fill: Int, stroke: Int, radiusDp: Float, density: Float): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(fill)
            cornerRadius = radiusDp * density
            if (stroke != Color.TRANSPARENT) {
                setStroke((1 * density + 0.5f).toInt().coerceAtLeast(1), stroke)
            }
        }
    }

    private fun formatPhone(raw: String): String {
        val digits = raw.filter { it.isDigit() }
        if (digits.length == 11 && digits.startsWith("010")) {
            return "${digits.substring(0, 3)}-${digits.substring(3, 7)}-${digits.substring(7)}"
        }
        if ((raw.startsWith("+82") || digits.startsWith("82")) && digits.length >= 10) {
            val local = "0" + digits.removePrefix("82")
            if (local.length == 11) {
                return "${local.substring(0, 3)}-${local.substring(3, 7)}-${local.substring(7)}"
            }
        }
        return raw.takeIf { it.isNotBlank() && it != "unknown" }.orEmpty()
    }

    private fun firstNonBlank(vararg values: String?): String? =
        values.firstOrNull { !it.isNullOrBlank() && it != "null" }
}
