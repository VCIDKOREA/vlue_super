# VLUE Android — keep WebView bridges / Room entities / BuildConfig
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class kr.vlue.calloverlay.BuildConfig { *; }
-keepclassmembers class kr.vlue.calloverlay.LetteringJavascriptBridge { *; }
-keepclassmembers class kr.vlue.calloverlay.family.VlueFamilyBridge { *; }
-dontwarn net.sqlcipher.**
-keep class net.sqlcipher.** { *; }
