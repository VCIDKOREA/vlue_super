# VLUE Android — keep WebView bridges / Room entities
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
