export interface AndroidSourceFile {
  path: string;
  language: 'kotlin' | 'xml' | 'gradle' | 'properties';
  description: string;
  content: string;
}

export const ANDROID_PROJECT_FILES: AndroidSourceFile[] = [
  {
    path: 'app/src/main/java/com/demo/dragontigerpredictor/MainActivity.kt',
    language: 'kotlin',
    description:
      'Main Jetpack Compose activity implementing Dragon vs Tiger recording, 100-round local SharedPreferences storage, 6-second coroutine delay, and Statistical Estimate calculation.',
    content: `package com.demo.dragontigerpredictor

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

enum class Side(val label: String, val symbol: String) {
    DRAGON("DRAGON", "🐉"),
    TIGER("TIGER", "🐯")
}

data class StatisticalEstimate(
    val estimatedSide: Side,
    val historicalPercentage: Double,
    val roundsAnalyzed: Int,
    val rationale: String
)

class LocalHistoryStorage(context: Context) {
    private val prefs = context.getSharedPreferences("dragon_tiger_demo_prefs", Context.MODE_PRIVATE)

    fun loadHistory(): List<Side> {
        val raw = prefs.getString("round_history", "") ?: ""
        if (raw.isBlank()) return emptyList()
        return raw.split(",")
            .mapNotNull { token ->
                when (token) {
                    "D" -> Side.DRAGON
                    "T" -> Side.TIGER
                    else -> null
                }
            }
            .takeLast(100)
    }

    fun saveHistory(history: List<Side>) {
        val capped = history.takeLast(100)
        val serialized = capped.joinToString(",") { if (it == Side.DRAGON) "D" else "T" }
        prefs.edit().putString("round_history", serialized).apply()
    }
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    background = Color(0xFF0B0E14),
                    surface = Color(0xFF131822),
                    primary = Color(0xFFDC2626),
                    secondary = Color(0xFFF59E0B)
                )
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF0B0E14)
                ) {
                    DragonTigerPredictorScreen()
                }
            }
        }
    }
}

@Composable
fun DragonTigerPredictorScreen() {
    val context = LocalContext.current
    val storage = remember { LocalHistoryStorage(context) }
    val coroutineScope = rememberCoroutineScope()

    var history by remember { mutableStateOf(storage.loadHistory()) }
    var isAnalyzing by remember { mutableStateOf(false) }
    var remainingSeconds by remember { mutableStateOf(0.0f) }
    var analysisJob by remember { mutableStateOf<Job?>(null) }

    val totalRounds = history.size
    val dragonCount = history.count { it == Side.DRAGON }
    val tigerCount = history.count { it == Side.TIGER }
    val dragonPct = if (totalRounds > 0) (dragonCount * 1000.0 / totalRounds).roundToInt() / 10.0 else 0.0
    val tigerPct = if (totalRounds > 0) (tigerCount * 1000.0 / totalRounds).roundToInt() / 10.0 else 0.0

    val currentStreakSide = history.lastOrNull()
    var currentStreakCount = 0
    if (currentStreakSide != null) {
        for (i in history.indices.reversed()) {
            if (history[i] == currentStreakSide) currentStreakCount++ else break
        }
    }

    val estimate: StatisticalEstimate? = remember(history) {
        if (history.size < 5) null
        else {
            val last = history.last()
            var followD = 0
            var followT = 0
            for (i in 0 until history.size - 1) {
                if (history[i] == last) {
                    if (history[i + 1] == Side.DRAGON) followD++ else followT++
                }
            }
            val transTotal = followD + followT
            val dRatio = dragonCount.toDouble() / history.size
            val tRatio = tigerCount.toDouble() / history.size
            val transDRatio = if (transTotal > 0) followD.toDouble() / transTotal else dRatio
            val transTRatio = if (transTotal > 0) followT.toDouble() / transTotal else tRatio

            val scoreD = dRatio * 0.7 + transDRatio * 0.3
            val scoreT = tRatio * 0.7 + transTRatio * 0.3
            val chosen = if (scoreD >= scoreT) Side.DRAGON else Side.TIGER
            val chosenPct = if (chosen == Side.DRAGON) dragonPct else tigerPct

            StatisticalEstimate(
                estimatedSide = chosen,
                historicalPercentage = chosenPct,
                roundsAnalyzed = history.size,
                rationale = "Derived from empirical frequency & transition patterns across \${history.size} recorded rounds."
            )
        }
    }

    fun recordRound(side: Side) {
        val updated = (history + side).takeLast(100)
        history = updated
        storage.saveHistory(updated)

        analysisJob?.cancel()
        analysisJob = coroutineScope.launch {
            isAnalyzing = true
            val steps = 60
            for (step in steps downTo 1) {
                remainingSeconds = step / 10f
                delay(100L)
            }
            remainingSeconds = 0f
            isAnalyzing = false
        }
    }

    fun undoLastResult() {
        if (history.isEmpty()) return
        analysisJob?.cancel()
        isAnalyzing = false
        val updated = history.dropLast(1)
        history = updated
        storage.saveHistory(updated)
    }

    fun clearOrReset() {
        analysisJob?.cancel()
        isAnalyzing = false
        history = emptyList()
        storage.saveHistory(emptyList())
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Dragon vs Tiger Predictor",
                color = Color(0xFFF8FAFC),
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Virtual-Coin Statistical Demo · Local 100-Round Cap",
                color = Color(0xFF94A3B8),
                fontSize = 12.sp
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(Color(0xFF131822))
                .border(1.dp, Color(0x1AFFFFFF), RoundedCornerShape(14.dp))
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("TOTAL ROUNDS RECORDED", color = Color(0xFF94A3B8), fontSize = 11.sp)
                Text(
                    "$totalRounds / 100",
                    color = Color(0xFFF8FAFC),
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("CURRENT STREAK", color = Color(0xFF94A3B8), fontSize = 11.sp)
                Text(
                    if (currentStreakSide != null) "\${currentStreakSide.symbol} \${currentStreakSide.label} ×$currentStreakCount" else "None",
                    color = if (currentStreakSide == Side.DRAGON) Color(0xFFF87171)
                    else if (currentStreakSide == Side.TIGER) Color(0xFFFBBF24)
                    else Color(0xFF94A3B8),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = FontFamily.Monospace
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(132.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(Brush.verticalGradient(listOf(Color(0xFF991B1B), Color(0xFF450A0A))))
                    .border(1.5.dp, Color(0xFFEF4444), RoundedCornerShape(18.dp))
                    .clickable { recordRound(Side.DRAGON) }
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "🐉", fontSize = 36.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("DRAGON", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Text("Tap to Record", color = Color(0xFFFCA5A5), fontSize = 11.sp)
                }
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(132.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(Brush.verticalGradient(listOf(Color(0xFFB45309), Color(0xFF451A03))))
                    .border(1.5.dp, Color(0xFFF59E0B), RoundedCornerShape(18.dp))
                    .clickable { recordRound(Side.TIGER) }
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "🐯", fontSize = 36.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("TIGER", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Text("Tap to Record", color = Color(0xFFFDE68A), fontSize = 11.sp)
                }
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(Color(0xFF131822))
                .border(1.dp, Color(0x22FFFFFF), RoundedCornerShape(16.dp))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "STATISTICAL ESTIMATE",
                color = Color(0xFF94A3B8),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )

            when {
                isAnalyzing -> {
                    Text(
                        text = "Analyzing recent results...",
                        color = Color(0xFFFBBF24),
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    LinearProgressIndicator(
                        progress = { (6.0f - remainingSeconds) / 6.0f },
                        modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
                        color = Color(0xFFF59E0B),
                        trackColor = Color(0xFF1E293B)
                    )
                    Text(
                        text = "Calculating empirical distribution (\${String.format("%.1f", remainingSeconds)}s remaining)",
                        color = Color(0xFF94A3B8),
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
                totalRounds < 5 -> {
                    Text(
                        text = "Record at least 5 rounds to unlock the Statistical Estimate (\${5 - totalRounds} more needed).",
                        color = Color(0xFFCBD5E1),
                        fontSize = 14.sp
                    )
                }
                estimate != null -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Estimated Side", color = Color(0xFF94A3B8), fontSize = 12.sp)
                            Text(
                                text = "\${estimate.estimatedSide.symbol} \${estimate.estimatedSide.label}",
                                color = if (estimate.estimatedSide == Side.DRAGON) Color(0xFFF87171) else Color(0xFFFBBF24),
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("Historical Percentage", color = Color(0xFF94A3B8), fontSize = 12.sp)
                            Text(
                                text = "\${estimate.historicalPercentage}%",
                                color = Color(0xFFF8FAFC),
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                    Text(
                        text = "Rounds Analyzed: \${estimate.roundsAnalyzed} · \${estimate.rationale}",
                        color = Color(0xFF94A3B8),
                        fontSize = 12.sp
                    )
                    Text(
                        text = "Note: Statistical Estimate reflects historical sample frequencies only and is never a guaranteed outcome.",
                        color = Color(0xFF64748B),
                        fontSize = 11.sp
                    )
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Column(
                modifier = Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(Color(0xFF131822)).padding(14.dp)
            ) {
                Text("🐉 Dragon Stats", color = Color(0xFFF87171), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(4.dp))
                Text("$dragonCount ($dragonPct%)", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
            }
            Column(
                modifier = Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(Color(0xFF131822)).padding(14.dp)
            ) {
                Text("🐯 Tiger Stats", color = Color(0xFFFBBF24), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(4.dp))
                Text("$tigerCount ($tigerPct%)", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
            }
        }

        Column(
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Color(0xFF131822)).padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "RECENT RESULTS (LAST \${history.size} ROUNDS)",
                color = Color(0xFF94A3B8),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            if (history.isEmpty()) {
                Text("No rounds recorded yet.", color = Color(0xFF64748B), fontSize = 13.sp)
            } else {
                Text(
                    text = history.takeLast(30).joinToString(" ") { it.symbol },
                    fontSize = 20.sp,
                    lineHeight = 28.sp
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(onClick = { undoLastResult() }, enabled = history.isNotEmpty(), modifier = Modifier.weight(1f)) {
                Text("Undo Last", fontSize = 12.sp)
            }
            OutlinedButton(onClick = { clearOrReset() }, enabled = history.isNotEmpty(), modifier = Modifier.weight(1f)) {
                Text("Clear History", fontSize = 12.sp)
            }
            OutlinedButton(onClick = { clearOrReset() }, enabled = history.isNotEmpty(), modifier = Modifier.weight(1f)) {
                Text("Reset Stats", fontSize = 12.sp)
            }
        }
    }
}`,
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    description:
      'Android application manifest with portrait orientation lock and zero external permissions (100% local offline operation).',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- No internet or external app permissions required: 100% offline local demo -->
    <application
        android:allowBackup="true"
        android:label="Dragon Tiger Predictor Demo"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.DeviceDefault.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`,
  },
  {
    path: 'app/build.gradle.kts',
    language: 'gradle',
    description:
      'App module Gradle configuration for Kotlin 1.9.24, SDK 34, and Jetpack Compose Material 3.',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.demo.dragontigerpredictor"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.demo.dragontigerpredictor"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.06.00")
    implementation(composeBom)

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.3")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
}`,
  },
  {
    path: 'build.gradle.kts',
    language: 'gradle',
    description: 'Root project Gradle plugins setup.',
    content: `plugins {
    id("com.android.application") version "8.5.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.24" apply false
}`,
  },
  {
    path: 'settings.gradle.kts',
    language: 'gradle',
    description: 'Gradle repository resolution and root project name.',
    content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "DragonTigerPredictorDemo"
include(":app")`,
  },
];

/**
 * Pure TypeScript standard ZIP archive creator (Store method 0 with CRC-32)
 * Allows instant, offline browser download of the full buildable Android Studio project.
 */
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function createAndroidProjectZipBlob(): Blob {
  const encoder = new TextEncoder();
  const files = ANDROID_PROJECT_FILES.map((f) => ({
    nameBytes: encoder.encode(`DragonTigerPredictorDemo/${f.path}`),
    dataBytes: encoder.encode(f.content),
  }));

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const crc = crc32(file.dataBytes);
    const size = file.dataBytes.length;
    const nameLen = file.nameBytes.length;

    // Local file header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + nameLen);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // Signature
    lv.setUint16(4, 20, true); // Version needed
    lv.setUint16(6, 0, true); // Flags
    lv.setUint16(8, 0, true); // Compression (0 = Store)
    lv.setUint16(10, 0, true); // Mod time
    lv.setUint16(12, 0, true); // Mod date
    lv.setUint32(14, crc, true); // CRC-32
    lv.setUint32(18, size, true); // Compressed size
    lv.setUint32(22, size, true); // Uncompressed size
    lv.setUint16(26, nameLen, true); // Filename length
    lv.setUint16(28, 0, true); // Extra length
    localHeader.set(file.nameBytes, 30);

    localParts.push(localHeader, file.dataBytes);

    // Central directory header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameLen);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // Signature
    cv.setUint16(4, 20, true); // Version made by
    cv.setUint16(6, 20, true); // Version needed
    cv.setUint16(8, 0, true); // Flags
    cv.setUint16(10, 0, true); // Compression
    cv.setUint16(12, 0, true); // Mod time
    cv.setUint16(14, 0, true); // Mod date
    cv.setUint32(16, crc, true); // CRC-32
    cv.setUint32(20, size, true); // Compressed size
    cv.setUint32(24, size, true); // Uncompressed size
    cv.setUint16(28, nameLen, true); // Filename length
    cv.setUint16(30, 0, true); // Extra length
    cv.setUint16(32, 0, true); // Comment length
    cv.setUint16(34, 0, true); // Disk number
    cv.setUint16(36, 0, true); // Internal attrs
    cv.setUint32(38, 0, true); // External attrs
    cv.setUint32(42, offset, true); // Local header offset
    centralHeader.set(file.nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + size;
  }

  const centralSize = centralParts.reduce((acc, arr) => acc + arr.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // EOCD signature
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const blobParts = [...localParts, ...centralParts, eocd] as unknown as BlobPart[];
  return new Blob(blobParts, {
    type: 'application/zip',
  });
}
