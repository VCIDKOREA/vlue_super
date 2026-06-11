plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
}

fun gradleProp(key: String, fallback: String): String {
    val fromGradle = project.findProperty(key)?.toString()?.trim().orEmpty()
    if (fromGradle.isNotEmpty()) return fromGradle
    val localFile = rootProject.file("local.properties")
    if (localFile.exists()) {
        val props = java.util.Properties().apply { localFile.inputStream().use { load(it) } }
        val mapped = when (key) {
            "VLUE_API_BASE_URL" -> props.getProperty("vlue.api.base.url")
            "VLUE_WEB_BASE_URL" -> props.getProperty("vlue.web.base.url")
            else -> null
        }
        if (!mapped.isNullOrBlank()) return mapped.trim()
    }
    return fallback
}

val vlueApiBase = gradleProp("VLUE_API_BASE_URL", "https://api.vlue.kr")
val vlueWebBase = gradleProp("VLUE_WEB_BASE_URL", "https://www.vlue.kr")

android {
    namespace = "kr.vlue.calloverlay"
    compileSdk = 34

    defaultConfig {
        applicationId = "kr.vlue.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "API_BASE_URL", "\"$vlueApiBase\"")
        buildConfigField("String", "WEB_BASE_URL", "\"$vlueWebBase\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.webkit:webkit:1.10.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // ML Kit OCR (POS 빌지·일반 문서)
    implementation("com.google.mlkit:text-recognition-korean:16.0.1")
    // ML Kit Translation (온디바이스 무료 번역)
    implementation("com.google.mlkit:translate:17.0.3")

    // Room + SQLCipher AES-256
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")
    implementation("net.zetetic:android-database-sqlcipher:4.5.4")
    implementation("androidx.sqlite:sqlite:2.4.0")
}
