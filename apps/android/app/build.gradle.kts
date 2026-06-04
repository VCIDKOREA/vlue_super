plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
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
}
