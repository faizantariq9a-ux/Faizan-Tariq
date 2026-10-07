import React, { useState } from 'react';
import { Check, Copy, Download, FileCode, Smartphone } from 'lucide-react';
import {
  ANDROID_PROJECT_FILES,
  createAndroidProjectZipBlob,
} from '../data/androidKotlinProject';

export const AndroidSourceViewer: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeFile = ANDROID_PROJECT_FILES[selectedIdx];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback copy if clipboard blocked
    }
  };

  const handleDownloadZip = () => {
    const blob = createAndroidProjectZipBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DragonTigerPredictorDemo-Android.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-2xl bg-[#131822] border border-white/[0.08] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-[#F59E0B]" />
              <h2 className="text-lg font-semibold text-[#F8FAFC]">
                Native Android Kotlin Project (Jetpack Compose APK)
              </h2>
            </div>
            <p className="text-sm text-[#94A3B8] max-w-2xl">
              Complete, self-contained Android Studio project written in Kotlin with Jetpack
              Compose Material 3. Uses local <code className="text-[#F8FAFC] font-mono">SharedPreferences</code>{' '}
              for 100-round persistence, Kotlin Coroutines for the 6-second analysis delay, and
              requires zero internet or external permissions.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadZip}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#0B0E14] font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Android Project (.zip)</span>
          </button>
        </div>

        {/* 3-Step APK Build Instructions */}
        <div className="mt-6 pt-5 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#94A3B8]">
          <div>
            <span className="font-semibold text-[#F8FAFC]">01. Extract & Open</span>
            <p className="mt-1">
              Unzip <span className="font-mono text-[#CBD5E1]">DragonTigerPredictorDemo-Android.zip</span>{' '}
              or open the <span className="font-mono text-[#CBD5E1]">/android</span> folder in Android Studio Ladybug or newer.
            </p>
          </div>
          <div>
            <span className="font-semibold text-[#F8FAFC]">02. Sync Gradle (JDK 17)</span>
            <p className="mt-1">
              Android Gradle Plugin 8.5.2 and Kotlin 1.9.24 configure Compose Material 3 automatically with SDK 34.
            </p>
          </div>
          <div>
            <span className="font-semibold text-[#F8FAFC]">03. Build APK</span>
            <p className="mt-1">
              Run <span className="font-mono text-[#F59E0B]">./gradlew assembleDebug</span> or select{' '}
              <span className="text-[#CBD5E1]">Build → Build Bundle(s) / APK(s) → Build APK(s)</span>.
            </p>
          </div>
        </div>
      </section>

      {/* Source File Explorer */}
      <section className="rounded-2xl bg-[#131822] border border-white/[0.08] overflow-hidden">
        {/* File selector bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#0B0E14] border-b border-white/[0.08]">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {ANDROID_PROJECT_FILES.map((file, idx) => (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  selectedIdx === idx
                    ? 'bg-[#1E293B] text-[#F8FAFC] border border-white/[0.12]'
                    : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>{file.path.split('/').pop()}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-[#F8FAFC] flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="text-[#10B981]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy File</span>
              </>
            )}
          </button>
        </div>

        {/* File path & description */}
        <div className="px-5 py-3 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#94A3B8]">
          <span className="font-mono text-[#CBD5E1]">{activeFile.path}</span>
          <span>{activeFile.description}</span>
        </div>

        {/* Code view */}
        <pre className="p-5 text-xs font-mono leading-relaxed text-[#E2E8F0] overflow-x-auto max-h-[540px] bg-[#0B0E14]/60">
          <code>{activeFile.content}</code>
        </pre>
      </section>
    </div>
  );
};
