import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
    id("com.google.gms.google-services")
}

fun gradleProp(key: String, fallback: String): String {
    val fromGradle = project.findProperty(key)?.toString()?.trim().orEmpty()
    if (fromGradle.isNotEmpty()) return fromGradle
    val localFile = rootProject.file("local.properties")
    if (localFile.exists()) {
        val props = Properties().apply {
            localFile.inputStream().use { stream -> load(stream) }
        }
        val mapped = when (key) {
            "VLUE_API_BASE_URL" -> props.getProperty("vlue.api.base.url")
            "VLUE_WEB_BASE_URL" -> props.getProperty("vlue.web.base.url")
            else -> null
        }
        val value = mapped?.trim().orEmpty()
        if (value.isNotEmpty()) return value
    }
    return fallback
}

val vlueApiBase = gradleProp("VLUE_API_BASE_URL", "https://api.vlue.kr")
val vlueWebBase = gradleProp("VLUE_WEB_BASE_URL", "https://www.vlue.kr")

/** 릴리즈 서명 — keystore.properties 있으면 실키, 없으면 debug 키로 서명(스토어 제출 전 교체) */
val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) {
        keystorePropsFile.inputStream().use { stream -> load(stream) }
    }
}
val storeFilePath = keystoreProps.getProperty("storeFile").orEmpty().trim()
val hasReleaseKeystore =
    keystorePropsFile.exists() &&
        storeFilePath.isNotEmpty() &&
        rootProject.file(storeFilePath).exists()

android {
    namespace = "kr.vlue.calloverlay"
    compileSdk = 34

    defaultConfig {
        applicationId = "kr.vlue.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 21
        versionName = "1.0.0-rc23"
        buildConfigField("String", "API_BASE_URL", "\"$vlueApiBase\"")
        buildConfigField("String", "WEB_BASE_URL", "\"$vlueWebBase\"")
    }

    signingConfigs {
        create("release") {
            if (hasReleaseKeystore) {
                storeFile = rootProject.file(storeFilePath)
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        getByName("debug") {
            isMinifyEnabled = false
        }
        getByName("release") {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = if (hasReleaseKeystore) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
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

    implementation("com.google.mlkit:text-recognition-korean:16.0.1")
    implementation("com.google.mlkit:translate:17.0.3")

    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")
    implementation("net.zetetic:android-database-sqlcipher:4.5.4")
    implementation("androidx.sqlite:sqlite:2.4.0")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-messaging-ktx")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
