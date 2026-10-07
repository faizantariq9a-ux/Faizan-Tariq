package com.demo.dragontigerpredictor

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.roundToInt

enum class Side(val label: String, val symbol: String) {
    DRAGON("DRAGON", "🐉"),
    TIGER("TIGER", "🐯"),
    TIE("TIE", "⚖️")
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
                    "E" -> Side.TIE
                    else -> null
                }
            }
            .takeLast(100)
    }

    fun saveHistory(history: List<Side>) {
        val capped = history.takeLast(100)
        val serialized = capped.joinToString(",") {
            when (it) {
                Side.DRAGON -> "D"
                Side.TIGER -> "T"
                Side.TIE -> "E"
            }
        }
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
    val tieCount = history.count { it == Side.TIE }
    val dragonPct = if (totalRounds > 0) (dragonCount * 1000.0 / totalRounds).roundToInt() / 10.0 else 0.0
    val tigerPct = if (totalRounds > 0) (tigerCount * 1000.0 / totalRounds).roundToInt() / 10.0 else 0.0
    val tiePct = if (totalRounds > 0) (tieCount * 1000.0 / totalRounds).roundToInt() / 10.0 else 0.0

    // Calculate active streak
    val currentStreakSide = history.lastOrNull()
    var currentStreakCount = 0
    if (currentStreakSide != null) {
        for (i in history.indices.reversed()) {
            if (history[i] == currentStreakSide) currentStreakCount++ else break
        }
    }

    // Calculate Statistical Estimate after at least 5 recorded rounds
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
                rationale = "Derived from empirical frequency & transition patterns across ${history.size} recorded rounds."
            )
        }
    }

    fun recordRound(side: Side) {
        val updated = (history + side).takeLast(100)
        history = updated
        storage.saveHistory(updated)

        // Trigger 6-second analysis delay
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
        // Header
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

        // Total Rounds & Streak Summary Bar
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
                    if (currentStreakSide != null) "${currentStreakSide.symbol} ${currentStreakSide.label} ×$currentStreakCount" else "None",
                    color = if (currentStreakSide == Side.DRAGON) Color(0xFFF87171)
                    else if (currentStreakSide == Side.TIGER) Color(0xFFFBBF24)
                    else Color(0xFF94A3B8),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    fontFamily = FontFamily.Monospace
                )
            }
        }

        // Two Large Touch Buttons: DRAGON & TIGER
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // DRAGON Button
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(132.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(
                        Brush.verticalGradient(
                            listOf(Color(0xFF991B1B), Color(0xFF450A0A))
                        )
                    )
                    .border(1.5.dp, Color(0xFFEF4444), RoundedCornerShape(18.dp))
                    .clickable { recordRound(Side.DRAGON) }
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "🐉", fontSize = 36.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "DRAGON",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Tap to Record",
                        color = Color(0xFFFCA5A5),
                        fontSize = 11.sp
                    )
                }
            }

            // TIGER Button
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(132.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(
                        Brush.verticalGradient(
                            listOf(Color(0xFFB45309), Color(0xFF451A03))
                        )
                    )
                    .border(1.5.dp, Color(0xFFF59E0B), RoundedCornerShape(18.dp))
                    .clickable { recordRound(Side.TIGER) }
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "🐯", fontSize = 36.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "TIGER",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Tap to Record",
                        color = Color(0xFFFDE68A),
                        fontSize = 11.sp
                    )
                }
            }
        }

        // TIE Button
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(74.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(
                    Brush.horizontalGradient(
                        listOf(Color(0xFF065F46), Color(0xFF022C22))
                    )
                )
                .border(1.5.dp, Color(0xFF10B981), RoundedCornerShape(16.dp))
                .clickable { recordRound(Side.TIE) }
                .padding(horizontal = 20.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "⚖️ TIE",
                    color = Color.White,
                    fontSize = 19.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "$tieCount ($tiePct%) · Tap to Record",
                    color = Color(0xFFA7F3D0),
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace
                )
            }
        }

        // Virtual Analysis / Statistical Estimate Card (with 6-Second Delay)
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
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(CircleShape),
                        color = Color(0xFFF59E0B),
                        trackColor = Color(0xFF1E293B)
                    )
                    Text(
                        text = "Calculating empirical distribution (${String.format("%.1f", remainingSeconds)}s remaining)",
                        color = Color(0xFF94A3B8),
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                totalRounds < 5 -> {
                    Text(
                        text = "Record at least 5 rounds to unlock the Statistical Estimate (${5 - totalRounds} more needed).",
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
                            Text(
                                text = "Estimated Side",
                                color = Color(0xFF94A3B8),
                                fontSize = 12.sp
                            )
                            Text(
                                text = "${estimate.estimatedSide.symbol} ${estimate.estimatedSide.label}",
                                color = if (estimate.estimatedSide == Side.DRAGON) Color(0xFFF87171) else Color(0xFFFBBF24),
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "Historical Percentage",
                                color = Color(0xFF94A3B8),
                                fontSize = 12.sp
                            )
                            Text(
                                text = "${estimate.historicalPercentage}%",
                                color = Color(0xFFF8FAFC),
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                    Text(
                        text = "Rounds Analyzed: ${estimate.roundsAnalyzed} · ${estimate.rationale}",
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

        // Counts & Percentages Breakdown
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Color(0xFF131822))
                    .padding(14.dp)
            ) {
                Text("🐉 Dragon Stats", color = Color(0xFFF87171), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "$dragonCount ($dragonPct%)",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Color(0xFF131822))
                    .padding(14.dp)
            ) {
                Text("🐯 Tiger Stats", color = Color(0xFFFBBF24), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "$tigerCount ($tigerPct%)",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }
        }

        // Recent Results History: 🐉 🐯 🐉 🐉 🐯 ...
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(Color(0xFF131822))
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "RECENT RESULTS (LAST ${history.size} ROUNDS)",
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

        // Controls: Undo Last Result, Clear History, Reset Statistics
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = { undoLastResult() },
                enabled = history.isNotEmpty(),
                modifier = Modifier.weight(1f)
            ) {
                Text("Undo Last", fontSize = 12.sp)
            }
            OutlinedButton(
                onClick = { clearOrReset() },
                enabled = history.isNotEmpty(),
                modifier = Modifier.weight(1f)
            ) {
                Text("Clear History", fontSize = 12.sp)
            }
            OutlinedButton(
                onClick = { clearOrReset() },
                enabled = history.isNotEmpty(),
                modifier = Modifier.weight(1f)
            ) {
                Text("Reset Stats", fontSize = 12.sp)
            }
        }
    }
}
