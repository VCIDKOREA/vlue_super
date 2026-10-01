package kr.vlue.calloverlay.sms

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SmsRow(
    val message: SmsInboxMessage,
    val analyzing: Boolean = false,
    val result: SmsAnalysisResult? = null,
    val error: String? = null
)

class SmsAnalysisViewModel(app: Application) : AndroidViewModel(app) {
    private val repository = SmsAnalysisRepository(app)
    private val _rows = MutableStateFlow<List<SmsRow>>(emptyList())
    val rows: StateFlow<List<SmsRow>> = _rows.asStateFlow()
    private val _permissionRequired = MutableStateFlow(false)
    val permissionRequired: StateFlow<Boolean> = _permissionRequired.asStateFlow()

    fun load() {
        _permissionRequired.value = false
        val items = repository.loadInbox()
        val previous = _rows.value.associateBy { it.message.id }
        _rows.value = items.map { message ->
            previous[message.id]?.copy(message = message) ?: SmsRow(message)
        }
    }

    fun markPermissionRequired() {
        _permissionRequired.value = true
        _rows.value = emptyList()
    }

    fun analyze(messageId: Long) {
        val current = _rows.value.firstOrNull { it.message.id == messageId } ?: return
        if (current.analyzing) return
        _rows.update { list ->
            list.map { if (it.message.id == messageId) it.copy(analyzing = true, error = null) else it }
        }
        viewModelScope.launch {
            val outcome = runCatching { repository.analyze(current.message) }
            _rows.update { list ->
                list.map { row ->
                    if (row.message.id != messageId) row
                    else outcome.fold(
                        onSuccess = { row.copy(analyzing = false, result = it, error = null) },
                        onFailure = { row.copy(analyzing = false, error = it.message ?: "분석에 실패했습니다.") }
                    )
                }
            }
        }
    }
}
