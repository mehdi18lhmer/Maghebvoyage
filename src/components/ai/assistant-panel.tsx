"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Mic, MicOff, Send, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { RobotMood } from "@/components/ui/robot-assistant";
import type { AiFormStateApi } from "@/components/ai/use-ai-form-state";
import { missingRequiredFields, type AiFormData, type ScoredMatch } from "@/lib/ai-match";
import { TripSuggestionCard } from "@/components/ai/trip-suggestion-card";
import { BookingSummaryCard } from "@/components/ai/booking-summary-card";
import type { GroupTrip } from "@/lib/types";

/**
 * The AI planner's primary interface — the traveller talks or types, and this
 * fills the trip request for them.
 *
 * Two things happen through the same conversation:
 *  - factual questions get answered strictly from catalogue data,
 *  - anything said about the trip is extracted into the shared form, live.
 *
 * The two legally-blocking checkboxes (RGPD, CGU) are never touched here —
 * CDC §7 marks both "Bloquant" and consent must be a deliberate click. They
 * live in the récapitulatif panel instead.
 *
 * Grounding and extraction are both server-side (/api/ai/converse) — the
 * browser never holds an LLM key. `locale` is threaded into every AI request
 * so the model's own replies come back in the active language, not just the
 * UI chrome around them.
 */

// three.js is ~250KB+ gzipped. Lazy + client-only keeps it off the critical path.
const RobotAssistant = dynamic(
  () => import("@/components/ui/robot-assistant").then((m) => m.RobotAssistant),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-primary/40" />
      </div>
    ),
  }
);

interface Suggestions {
  trips: GroupTrip[];
  scored: ScoredMatch[];
  agencyNames: Record<string, string>;
  fallback: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  cited?: { title: string; slug: string }[];
  via?: "text" | "voice";
  filledFields?: string[];
  /** Rendered as a row of TripSuggestionCards under this message's text. */
  suggestions?: Suggestions;
  /** Rendered as a BookingSummaryCard — set once a suggestion has been picked. */
  bookingTrip?: { trip: GroupTrip; agencyName?: string };
}

type VoiceState = "off" | "connecting" | "live" | "unavailable";

/** Pulls a human-readable string out of whatever shape Vapi hands to `error`. */
function describeVapiError(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const nested = e.error ?? e.errorMsg ?? e.message ?? e.msg;
    if (typeof nested === "string") return nested;
    if (nested && typeof nested === "object") {
      const n = nested as Record<string, unknown>;
      if (typeof n.message === "string") return n.message;
    }
    try {
      return JSON.stringify(err).slice(0, 300);
    } catch {
      /* fall through */
    }
  }
  return "cause inconnue";
}

/** Vapi's own transcriber/voice language codes, per active site locale. */
const VOICE_LOCALE: Record<string, { transcriberLanguage: string; voiceId: string }> = {
  fr: { transcriberLanguage: "fr", voiceId: "Paige" },
  en: { transcriberLanguage: "en", voiceId: "Paige" },
  ar: { transcriberLanguage: "multi", voiceId: "Paige" },
};

export function AssistantPanel({ formState }: { formState: AiFormStateApi }) {
  const { form, missingRequired, applySlots, goToStep, update } = formState;
  const locale = useLocale();
  const t = useTranslations("Assistant");
  const tFields = useTranslations("Assistant.fields");

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [voice, setVoice] = useState<VoiceState>("off");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [justCompleted, setJustCompleted] = useState(false);
  /** True only while Vapi's TTS audio is actually playing — drives the robot's "speaking" mood. */
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  /** 0–1 microphone level, for the "can we actually hear you" meter. */
  const [micLevel, setMicLevel] = useState(0);
  const [micSilent, setMicSilent] = useState(false);
  /** "booking" once a suggestion card has been picked — see selectTrip(). */
  const [phase, setPhase] = useState<"planning" | "booking">("planning");

  const scrollRef = useRef<HTMLDivElement>(null);
  const vapiRef = useRef<{ stop: () => void; send: (m: unknown) => void } | null>(null);
  /** Suggestions fire once per session, the moment the form first becomes complete. */
  const suggestionsShownRef = useRef(false);
  /** Highest mic level seen this call — if it never rises, the mic is dead. */
  const micPeakRef = useRef(0);
  const micCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mutable mirrors of state, read inside Vapi callbacks so they always see the
  // latest values without re-subscribing (and dropping) listeners on every
  // change. The Vapi listeners are registered once per call and would otherwise
  // close over whatever `form`/`messages` were at that instant.
  const formRef = useRef<AiFormData>(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const localeRef = useRef(locale);
  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  // Real Vapi speech-start/speech-end events, not a timer — see the
  // "speaking" branch below. While voice is live but the assistant isn't
  // actively talking, the robot reads as idle/listening instead of a
  // constant "thinking" — the two now look different, which is the point.
  const mood: RobotMood = assistantSpeaking
    ? "speaking"
    : pending
      ? "thinking"
      : justCompleted
        ? "happy"
        : "idle";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, liveTranscript]);

  useEffect(
    () => () => {
      vapiRef.current?.stop();
      if (micCheckRef.current) clearTimeout(micCheckRef.current);
    },
    []
  );

  const converse = useCallback(async (message: string, history: Message[]) => {
    try {
      const res = await fetch("/api/ai/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
          form: formRef.current,
          locale: localeRef.current,
        }),
      });
      if (!res.ok) return null;
      return (await res.json()) as {
        reply: string;
        slots: Partial<AiFormData>;
        readyToSubmit: boolean;
        cited: { title: string; slug: string }[];
        grounded: boolean;
      };
    } catch {
      return null;
    }
  }, []);

  /**
   * The model's own `readyToSubmit` is computed from the form as it stood
   * *before* this turn's extraction, so it is always one turn behind. Recompute
   * completeness against the merged result instead of trusting it alone.
   */
  const isNowComplete = useCallback((slots: Partial<AiFormData>) => {
    return missingRequiredFields({ ...formRef.current, ...slots }).length === 0;
  }, []);

  /**
   * Phase 2 matching (CDC §C.2), run against real marketplace data — same
   * route the wizard's own "Voir mes suggestions" step calls. Suggestions are
   * pushed as their own chat message, with real trip images and match reasons,
   * per the user's explicit ask (not just a text list).
   */
  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: formRef.current, locale: localeRef.current }),
      });
      if (!res.ok) return null;
      return (await res.json()) as Suggestions & { trips: GroupTrip[] };
    } catch {
      return null;
    }
  }, []);

  const applyResult = useCallback(
    (slots: Partial<AiFormData>, readyToSubmit: boolean) => {
      const filled = Object.keys(slots);
      if (filled.length > 0) applySlots(slots);
      if ((readyToSubmit || isNowComplete(slots)) && !suggestionsShownRef.current) {
        goToStep(5);
        setJustCompleted(true);
        suggestionsShownRef.current = true;
        fetchSuggestions().then((result) => {
          if (!result || result.trips.length === 0) return;
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: result.fallback ? t("suggestionsFallback") : t("suggestionsMatched"),
              suggestions: result,
            },
          ]);
        });
      }
      return filled.map((k) => {
        try {
          return tFields(k);
        } catch {
          return k;
        }
      });
    },
    [applySlots, goToStep, isNowComplete, fetchSuggestions, t, tFields]
  );

  /**
   * Picking a suggestion pivots the conversation from "what trip do you want"
   * to "who's going" — the whole booking, including contact info and
   * confirmation, stays inside the chat until the redirect to Stripe's own
   * hosted page (the user's explicit choice over handing off to a page).
   */
  const selectTrip = useCallback(
    (trip: GroupTrip, agencyName: string | undefined) => {
      setPhase("booking");
      setMessages((prev) => [
        ...prev,
        { role: "user", content: t("chosenTrip", { title: trip.title }) },
        {
          role: "assistant",
          content:
            formRef.current.name.trim() && formRef.current.email.trim()
              ? t("readyToConfirm")
              : t("askContactInfo"),
          bookingTrip: { trip, agencyName },
        },
      ]);

      // Mid-call pivot for a live voice session: same call, new instructions —
      // no need to hang up and redial (Vapi's add-message control channel).
      if (voice === "live" && vapiRef.current) {
        const languageNote =
          localeRef.current === "en"
            ? "Continue speaking English."
            : localeRef.current === "ar"
              ? "استمر بالتحدث بالعربية."
              : "Continue de parler en français.";
        vapiRef.current.send({
          type: "add-message",
          message: {
            role: "system",
            content: `Le voyageur vient de choisir le voyage "${trip.title}" (${trip.destination}). Demande-lui maintenant son nom, son email et son téléphone si tu ne les as pas déjà, confirme le nombre de places, puis demande une confirmation avant paiement. IMPORTANT : ne demande JAMAIS le consentement RGPD ni les CGU à voix haute — ce sont des cases à cocher que la personne doit cliquer elle-même dans l'application. ${languageNote}`,
          },
          triggerResponseEnabled: true,
        });
      }
    },
    [voice, t]
  );

  const send = useCallback(
    async (text: string, via: "text" | "voice" = "text") => {
      const clean = text.trim();
      if (!clean || pending) return;

      setMessages((prev) => [...prev, { role: "user", content: clean, via }]);
      setDraft("");
      setPending(true);

      const result = await converse(clean, messages);

      if (!result) {
        setMessages((prev) => [...prev, { role: "assistant", content: t("genericError") }]);
        setPending(false);
        return;
      }

      const filledFields = applyResult(result.slots, result.readyToSubmit);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply, cited: result.cited, filledFields },
      ]);
      setPending(false);
    },
    [messages, pending, converse, applyResult, t]
  );

  async function toggleVoice() {
    if (voice === "live" || voice === "connecting") {
      vapiRef.current?.stop();
      vapiRef.current = null;
      setVoice("off");
      setLiveTranscript("");
      setMicLevel(0);
      setMicSilent(false);
      setAssistantSpeaking(false);
      if (micCheckRef.current) clearTimeout(micCheckRef.current);
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      setVoice("unavailable");
      setVoiceError(t("voiceKeyMissing"));
      return;
    }

    setVoice("connecting");
    setVoiceError(null);

    try {
      const [{ default: Vapi }, ctxRes] = await Promise.all([
        import("@vapi-ai/web"),
        fetch(`/api/ai/voice-context?locale=${locale}`),
      ]);
      const { prompt } = (await ctxRes.json()) as { prompt: string };

      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi as unknown as { stop: () => void; send: (m: unknown) => void };

      vapi.on("call-start", () => {
        console.info("[vapi] call-start");
        setVoice("live");
        micPeakRef.current = 0;
        setMicSilent(false);

        // Vapi accepts the config and happily speaks its opening line over TTS
        // without ever needing the microphone. If the mic is muted, pointed at
        // the wrong input, or silently denied, the assistant then waits forever
        // for speech that never arrives — which looks identical to "the AI is
        // broken". Watching the local level tells the two apart.
        if (micCheckRef.current) clearTimeout(micCheckRef.current);
        micCheckRef.current = setTimeout(() => {
          if (micPeakRef.current < 0.02) setMicSilent(true);
        }, 9000);
      });

      vapi.on("local-volume-level", (level: number) => {
        setMicLevel(level);
        if (level > micPeakRef.current) micPeakRef.current = level;
        if (level > 0.02) setMicSilent(false);
      });

      vapi.on("local-audio-level-observer-error", (e: unknown) => {
        console.error("[vapi] local-audio-level-observer-error", e);
        setMicSilent(true);
      });

      // The assistant's own speech, not the user's mic — this is what drives
      // the robot's "speaking" mood so the customer can see it's talking,
      // distinct from idle/listening. Real Vapi lifecycle events, not a timer.
      vapi.on("speech-start", () => {
        setAssistantSpeaking(true);
      });
      vapi.on("speech-end", () => {
        setAssistantSpeaking(false);
      });

      vapi.on("call-end", () => {
        console.info("[vapi] call-end");
        setVoice("off");
        setLiveTranscript("");
        setMicLevel(0);
        setMicSilent(false);
        setAssistantSpeaking(false);
        if (micCheckRef.current) clearTimeout(micCheckRef.current);
        vapiRef.current = null;
      });

      // The failure that matters most: the call connects and speaks its opening
      // line via TTS (which needs no model), then dies the moment the model or
      // transcriber is actually required. Surface it rather than sitting silent.
      vapi.on("call-start-failed", (e: unknown) => {
        console.error("[vapi] call-start-failed", e);
        setVoice("unavailable");
        setVoiceError(t("voiceStartFailed", { cause: describeVapiError(e) }));
      });

      vapi.on("error", (err: unknown) => {
        console.error("[vapi] error", err);
        setVoice("unavailable");
        setVoiceError(t("voiceError", { cause: describeVapiError(err) }));
      });

      vapi.on("message", (msg: Record<string, unknown>) => {
        // Logged unconditionally: if transcripts never arrive, the console shows
        // exactly which message types *did*, which is the fastest way to tell a
        // dead transcriber apart from a shape mismatch.
        console.debug("[vapi] message", msg?.type, msg);

        if (msg.type !== "transcript") return;
        const content = String(msg.transcript ?? "").trim();
        if (!content) return;
        const isUser = msg.role === "user";

        // Partials render as a live line so the user sees themselves being
        // heard immediately, instead of silence until the final arrives.
        if (msg.transcriptType === "partial") {
          if (isUser) setLiveTranscript(content);
          return;
        }
        if (msg.transcriptType !== "final") return;

        if (isUser) {
          setLiveTranscript("");
          setMessages((prev) => [...prev, { role: "user", content, via: "voice" }]);
          // Vapi's own model speaks the reply; we only mine the transcript for
          // form fields, so the two don't talk over each other. Real history is
          // passed so a spoken "non, plutôt sept jours" is understood as a
          // correction of the previous turn rather than an isolated fragment.
          converse(content, messagesRef.current).then((result) => {
            if (!result) return;
            const filled = applyResult(result.slots, result.readyToSubmit);
            if (filled.length > 0) {
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "", via: "voice", filledFields: filled },
              ]);
            }
          });
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content, via: "voice" }]);
        }
      });

      const voiceConfig = VOICE_LOCALE[locale] ?? VOICE_LOCALE.fr;
      await vapi.start({
        firstMessage:
          locale === "en"
            ? "Hi! Tell me about your trip: destination, dates, budget, and I'll take care of the rest."
            : locale === "ar"
              ? "مرحباً! أخبرني عن رحلتك: الوجهة، التواريخ، الميزانية، وسأتكفل بالباقي."
              : "Bonjour ! Parlez-moi de votre projet de voyage : destination, dates, budget, et je m'occupe du reste.",
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: prompt }],
        },
        voice: { provider: "vapi", voiceId: voiceConfig.voiceId },
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: voiceConfig.transcriberLanguage,
          // Numbers, dates and budgets get spoken a lot here; smart formatting
          // turns "sept cents euros" into something the extractor can parse.
          smartFormat: true,
        },
        // "Listen carefully": don't answer the instant the traveller pauses.
        // People hesitate mid-sentence when thinking about dates and budgets,
        // and the default endpointing treats that pause as "they're done".
        startSpeakingPlan: {
          waitSeconds: 1.2,
          smartEndpointingEnabled: true,
        },
        // And don't abandon its own sentence on a cough or a "hmm" — require a
        // real interruption before it stops talking.
        stopSpeakingPlan: {
          numWords: 3,
          voiceSeconds: 0.3,
          backoffSeconds: 1.5,
        },
        // A long planning conversation should not get cut off mid-flow.
        maxDurationSeconds: 1800,
        silenceTimeoutSeconds: 60,
      } as Parameters<typeof vapi.start>[0]);
    } catch (err) {
      console.error("[vapi:start]", err);
      setVoice("unavailable");
      setVoiceError(t("voiceStartError", { cause: describeVapiError(err) }));
    }
  }

  const showEmptyState = messages.length === 0 && !liveTranscript;
  const quickSuggestions = t.raw("quickSuggestions") as string[];

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <p className="font-heading text-base font-bold">{t("title")}</p>
        {phase === "booking" && voice !== "live" && (
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {t("bookingInProgress")}
          </span>
        )}
        {voice === "live" && (
          <span className="ml-auto flex items-center gap-2 text-xs font-medium text-success">
            {/* Live mic meter — proof the microphone is actually reaching Vapi. */}
            <span className="flex items-end gap-0.5" aria-hidden>
              {[0.06, 0.14, 0.26].map((threshold) => (
                <span
                  key={threshold}
                  className={cn(
                    "w-1 rounded-full transition-all",
                    micLevel > threshold ? "bg-success" : "bg-muted-foreground/25"
                  )}
                  style={{ height: micLevel > threshold ? 12 : 5 }}
                />
              ))}
            </span>
            {t("listening")}
          </span>
        )}
      </div>

      {micSilent && voice === "live" && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-muted px-3 py-2 text-xs text-warning">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>{t("micSilentWarning")}</span>
        </div>
      )}

      <div className="relative mt-2 h-72">
        <RobotAssistant mood={mood} className="h-full w-full" />
        {showEmptyState && (
          <p className="absolute right-0 bottom-0 max-w-[58%] rounded-2xl rounded-br-sm border bg-secondary/70 px-3.5 py-2.5 text-sm leading-snug text-muted-foreground backdrop-blur rtl:right-auto rtl:left-0 rtl:rounded-br-2xl rtl:rounded-bl-sm">
            {t("emptyStatePrompt")}
          </p>
        )}
      </div>

      {missingRequired.length === 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-success/30 bg-success-muted px-3 py-2 text-sm font-medium text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          {t("allReady")}
        </div>
      )}

      {(messages.length > 0 || liveTranscript) && (
        <div
          ref={scrollRef}
          className="mt-4 max-h-[22rem] min-h-32 space-y-3 overflow-y-auto pr-1"
        >
          {messages.map((m, i) =>
            m.content ? (
              <div
                key={i}
                className={cn(
                  "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-8 bg-primary text-primary-foreground rtl:mr-8 rtl:ml-0"
                    : "mr-3 bg-secondary text-foreground rtl:ml-3 rtl:mr-0"
                )}
              >
                {m.via === "voice" && (
                  <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase opacity-70">
                    <Mic className="size-2.5" />
                    {t("voiceTag")}
                  </span>
                )}
                <p className="whitespace-pre-wrap">{m.content}</p>

                {m.role === "assistant" && m.cited && m.cited.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.cited.slice(0, 2).map((c) => (
                      <Link
                        key={c.slug}
                        href={`/trip/${c.slug}`}
                        className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-primary hover:underline"
                      >
                        {c.title}
                      </Link>
                    ))}
                  </div>
                )}

                {m.filledFields && m.filledFields.length > 0 && (
                  <p className="mt-1.5 text-[11px] opacity-70">
                    ✓ {t("savedFields", { fields: m.filledFields.join(", ") })}
                  </p>
                )}

                {m.suggestions && (
                  <div className="mt-2.5 -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                    {m.suggestions.trips.map((trip) => {
                      const s = m.suggestions?.scored.find((sc) => sc.tripId === trip.id);
                      return (
                        <TripSuggestionCard
                          key={trip.id}
                          trip={trip}
                          agencyName={m.suggestions?.agencyNames[trip.agencyId]}
                          reasons={s?.reasons}
                          matchPercent={s?.matchPercent}
                          onSelect={() => selectTrip(trip, m.suggestions?.agencyNames[trip.agencyId])}
                        />
                      );
                    })}
                  </div>
                )}

                {m.bookingTrip && (
                  <BookingSummaryCard
                    trip={m.bookingTrip.trip}
                    agencyName={m.bookingTrip.agencyName}
                    form={form}
                    update={update}
                  />
                )}
              </div>
            ) : (
              m.filledFields &&
              m.filledFields.length > 0 && (
                <p key={i} className="mr-3 text-[11px] text-muted-foreground rtl:ml-3 rtl:mr-0">
                  ✓ {t("savedFields", { fields: m.filledFields.join(", ") })}
                </p>
              )
            )
          )}

          {liveTranscript && (
            <div className="ml-8 rounded-xl bg-primary/60 px-3.5 py-2.5 text-sm text-primary-foreground italic rtl:mr-8 rtl:ml-0">
              {liveTranscript}…
            </div>
          )}

          {pending && (
            <div className="mr-3 flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-2.5 text-sm text-muted-foreground rtl:ml-3 rtl:mr-0">
              <Loader2 className="size-3.5 animate-spin" />
              {t("thinking")}
            </div>
          )}
        </div>
      )}

      {showEmptyState && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {quickSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="mt-4 flex items-center gap-2"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("inputPlaceholder")}
          aria-label={t("inputLabel")}
          disabled={pending}
        />
        <Button type="submit" size="icon" disabled={pending || !draft.trim()} aria-label={t("send")}>
          <Send className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={voice === "live" ? "destructive" : "outline"}
          onClick={toggleVoice}
          disabled={voice === "connecting"}
          aria-label={voice === "live" ? t("stopMic") : t("talkToAssistant")}
          title={voice === "live" ? t("stopMic") : t("talkToAssistant")}
        >
          {voice === "connecting" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : voice === "live" ? (
            <MicOff className="size-4" />
          ) : (
            <Mic className="size-4" />
          )}
        </Button>
      </form>

      {voiceError && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span className="break-words">{voiceError}</span>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{t("footerNote")}</p>
    </Card>
  );
}

/** Local wrapper so the panel's chrome stays in one place. */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col rounded-2xl border bg-card p-6 shadow-tinted-sm">
      {children}
    </section>
  );
}
