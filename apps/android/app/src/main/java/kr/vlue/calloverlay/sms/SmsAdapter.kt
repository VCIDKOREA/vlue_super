package kr.vlue.calloverlay.sms

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.text.method.LinkMovementMethod
import android.text.util.Linkify
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import kr.vlue.calloverlay.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class SmsAdapter(
    private val onAnalyze: (Long) -> Unit,
    private val onBlockedTap: () -> Unit
) : RecyclerView.Adapter<SmsAdapter.Holder>() {

    private val rows = ArrayList<SmsRow>()
    private val timeFormat = SimpleDateFormat("M월 d일 a h:mm", Locale.KOREA)

    fun submit(next: List<SmsRow>) {
        rows.clear()
        rows.addAll(next)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_sms_message, parent, false)
        return Holder(view)
    }

    override fun getItemCount(): Int = rows.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        holder.bind(rows[position])
    }

    inner class Holder(view: View) : RecyclerView.ViewHolder(view) {
        private val sender: TextView = view.findViewById(R.id.smsSender)
        private val bubble: View = view.findViewById(R.id.smsBubble)
        private val body: TextView = view.findViewById(R.id.smsBody)
        private val shield: View = view.findViewById(R.id.smsLinkShield)
        private val analyze: TextView = view.findViewById(R.id.smsAnalyze)
        private val analyzing: View = view.findViewById(R.id.smsAnalyzing)
        private val badge: TextView = view.findViewById(R.id.smsBadge)
        private val summary: TextView = view.findViewById(R.id.smsSummary)

        fun bind(row: SmsRow) {
            val message = row.message
            val whenLabel = if (message.dateMs > 0L) timeFormat.format(Date(message.dateMs)) else ""
            val who = message.address.ifBlank { "번호 없음" }
            sender.text = if (whenLabel.isBlank()) who else "$who · $whenLabel"
            body.text = message.body
            body.setTextColor(Color.parseColor("#0F172A"))
            body.textSize = 15f
            body.autoLinkMask = 0
            body.movementMethod = null

            val status = row.result?.status
            val blocked = status == "DANGER" || status == "SUSPICIOUS"
            val safe = status == "SAFE"
            paintBubble(if (blocked) "#1FF44336" else if (safe) "#1F4CAF50" else "#FFFFFF", blocked)

            if (safe) {
                Linkify.addLinks(body, Linkify.WEB_URLS)
                body.movementMethod = LinkMovementMethod.getInstance()
                shield.visibility = View.GONE
                shield.setOnClickListener(null)
            } else if (blocked) {
                shield.visibility = View.VISIBLE
                shield.setOnClickListener { onBlockedTap() }
                body.setOnClickListener { onBlockedTap() }
            } else {
                shield.visibility = View.GONE
                shield.setOnClickListener(null)
                body.setOnClickListener(null)
            }

            analyzing.visibility = if (row.analyzing) View.VISIBLE else View.GONE
            analyze.isEnabled = !row.analyzing
            analyze.alpha = if (row.analyzing) 0.45f else 1f
            analyze.setOnClickListener { onAnalyze(message.id) }

            when {
                blocked -> showBadge("🔒 위험: 스미싱 링크 터치 차단됨", "#B91C1C", "#FEF2F2")
                safe -> showBadge("🟢 안전한 메시지", "#166534", "#F0FDF4")
                else -> {
                    badge.visibility = View.GONE
                }
            }
            val detail = row.error ?: row.result?.summary
            if (detail.isNullOrBlank()) {
                summary.visibility = View.GONE
            } else {
                summary.visibility = View.VISIBLE
                summary.text = detail
            }
        }

        private fun paintBubble(fill: String, blocked: Boolean) {
            val shape = GradientDrawable().apply {
                cornerRadius = 16f * bubble.resources.displayMetrics.density
                setColor(Color.parseColor(fill))
                setStroke(
                    (1f * bubble.resources.displayMetrics.density).toInt().coerceAtLeast(1),
                    Color.parseColor(if (blocked) "#F44336" else if (fill == "#1F4CAF50") "#4CAF50" else "#E2E8F0")
                )
            }
            bubble.background = shape
        }

        private fun showBadge(label: String, color: String, background: String) {
            badge.visibility = View.VISIBLE
            badge.text = label
            badge.setTextColor(Color.parseColor(color))
            val shape = GradientDrawable().apply {
                cornerRadius = 12f * badge.resources.displayMetrics.density
                setColor(Color.parseColor(background))
            }
            badge.background = shape
        }
    }
}
