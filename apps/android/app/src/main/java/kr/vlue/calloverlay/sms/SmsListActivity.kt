package kr.vlue.calloverlay.sms

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kr.vlue.calloverlay.R

class SmsListActivity : AppCompatActivity() {
    private val viewModel by lazy { ViewModelProvider(this)[SmsAnalysisViewModel::class.java] }
    private val uiScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val requestSms = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) viewModel.load() else viewModel.markPermissionRequired()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_sms_list)
        findViewById<View>(R.id.smsBack).setOnClickListener { finish() }

        val empty = findViewById<TextView>(R.id.smsEmpty)
        val list = findViewById<RecyclerView>(R.id.smsList)
        val adapter = SmsAdapter(
            onAnalyze = { viewModel.analyze(it) },
            onBlockedTap = { showBlockedDialog() }
        )
        list.layoutManager = LinearLayoutManager(this)
        list.adapter = adapter

        uiScope.launch {
            viewModel.rows.collect { rows ->
                adapter.submit(rows)
                val showEmpty = rows.isEmpty()
                empty.visibility = if (showEmpty) View.VISIBLE else View.GONE
                list.visibility = if (showEmpty) View.GONE else View.VISIBLE
            }
        }
        uiScope.launch {
            viewModel.permissionRequired.collect { required ->
                if (required) empty.text = "문자 목록을 보려면 문자 읽기 권한을 허용해 주세요."
            }
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED) {
            viewModel.load()
        } else {
            requestSms.launch(Manifest.permission.READ_SMS)
        }
    }

    override fun onDestroy() {
        uiScope.cancel()
        super.onDestroy()
    }

    private fun showBlockedDialog() {
        AlertDialog.Builder(this)
            .setMessage("🚨 AI 분석 결과 스미싱 위험 문자로 판정되어 링크 접근이 차단되었습니다.")
            .setPositiveButton("확인", null)
            .show()
    }

    companion object {
        fun start(context: Context) {
            context.startActivity(Intent(context, SmsListActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }
}
