import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Mic, MicOff, Send, CheckCircle2, Edit3, Volume2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function AIInventoryPage() {
  const { activeStore } = useAuth();
  const storeId = activeStore?.id || "";

  const [text, setText] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  // Voice recording state
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");

  // Check if browser supports Speech Recognition
  const speechSupported = typeof window !== "undefined" && 
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);

  const runAgent = async (inputType: string, payload: Record<string, unknown>) => {
    if (!storeId) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/agent/run", {
        input_type: inputType,
        payload,
        store_id: storeId,
      });
      setResult(data.output_payload as Record<string, unknown>);
    } catch {
      setResult({ message: "Agent run failed. Is the backend running?" });
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (endpoint: string, file: File) => {
    if (!storeId) return;
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const { data } = await api.post(`/agent/inventory/${endpoint}?store_id=${storeId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(data.output_payload as Record<string, unknown>);
    } catch {
      setResult({ message: "File upload failed." });
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    runAgent("text", { text });
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile("photo", file);
  };

  // --- Speech Recognition ---

  const startListening = useCallback(() => {
    if (!speechSupported) return;

    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN"; // Good for Indian English + Hindi mixed

    transcriptRef.current = "";
    setTranscript("");
    setInterimText("");
    setShowTranscript(true);
    setIsEditing(false);
    setResult(null);

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        transcriptRef.current = final.trim();
        setTranscript(final.trim());
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      console.error("[Speech] Error:", event.error);
      if (event.error === "not-allowed") {
        setTranscript("⚠️ Microphone access denied. Please allow microphone in browser settings.");
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [speechSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const handleTranscriptSubmit = () => {
    if (!transcript.trim()) return;
    setIsEditing(false);
    runAgent("text", { text: transcript });
  };

  const handleClearTranscript = () => {
    setTranscript("");
    setInterimText("");
    setShowTranscript(false);
    setIsEditing(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">AI Inventory</h1>
      <p className="mt-1 text-slate-500">Update stock via photo, voice, or text</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {/* Photo Upload */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Photo Inventory</h2>
            <p className="mt-1 text-sm text-slate-500">Upload a supplier invoice to <strong>add</strong> stock, or a daily sales sheet to <strong>decrease</strong> stock.</p>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-8 hover:border-brand-500 transition-colors">
              <Camera className="h-6 w-6 text-slate-400" />
              <span className="text-sm text-slate-500">Upload document photo</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            </label>
          </div>

          {/* Voice Inventory */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-brand-600" />
              Voice Inventory
            </h2>
            <p className="mt-1 text-sm text-slate-500">"Add 20 Samsung chargers" or "Sold 2 earphones"</p>

            {!speechSupported ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                ⚠️ Your browser doesn't support Speech Recognition. Please use Chrome or Edge.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {/* Record Button */}
                <button
                  type="button"
                  onClick={() => (listening ? stopListening() : startListening())}
                  disabled={loading}
                  className={`flex w-full items-center justify-center gap-3 rounded-xl px-5 py-4 text-sm font-semibold transition-all duration-300 disabled:opacity-50 ${
                    listening
                      ? "bg-red-50 text-red-700 border-2 border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                      : "bg-brand-50 text-brand-700 border-2 border-brand-200 hover:bg-brand-100 hover:border-brand-300"
                  }`}
                >
                  {listening ? (
                    <>
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                      </span>
                      <MicOff className="h-5 w-5" />
                      Listening... Click to Stop
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5" />
                      Start Speaking
                    </>
                  )}
                </button>

                {/* Live Transcript */}
                {showTranscript && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {listening ? "🎙️ Live Transcript" : "📝 Transcript"}
                      </h3>
                      <div className="flex items-center gap-1">
                        {!listening && transcript && (
                          <>
                            <button
                              type="button"
                              onClick={() => setIsEditing(!isEditing)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                            >
                              <Edit3 className="h-3 w-3 inline mr-1" />
                              {isEditing ? "Done" : "Edit"}
                            </button>
                            <button
                              type="button"
                              onClick={handleClearTranscript}
                              className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              Clear
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none resize-none"
                        rows={3}
                        autoFocus
                      />
                    ) : (
                      <div className="min-h-[3rem] text-sm text-slate-700 leading-relaxed">
                        {transcript && <span>{transcript}</span>}
                        {interimText && (
                          <span className="text-slate-400 italic"> {interimText}</span>
                        )}
                        {!transcript && !interimText && listening && (
                          <span className="text-slate-400 italic animate-pulse">Speak now...</span>
                        )}
                        {!transcript && !interimText && !listening && (
                          <span className="text-slate-400 italic">No speech detected. Try again.</span>
                        )}
                      </div>
                    )}

                    {/* Submit Transcript */}
                    {!listening && transcript && (
                      <button
                        type="button"
                        onClick={handleTranscriptSubmit}
                        disabled={loading || !storeId}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                      >
                        {loading ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Submit to AI Agent
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                <p className="text-xs text-slate-400">
                  Speech is transcribed live in your browser. You can edit the transcript before submitting.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Text Command + Results */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Text Command</h2>
            <form onSubmit={handleTextSubmit} className="mt-4 flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='e.g. "Sold 2 Boat earphones"'
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !storeId}
                className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Agent Response */}
          {loading && !result && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                <span className="text-sm font-medium text-brand-700">AI Agent is processing...</span>
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Agent Response
              </h3>
              <pre className="mt-3 overflow-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
