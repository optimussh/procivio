"use client";

// Public interview form (P3) — token link, no map editor access required.

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getPublicInterview, submitInterviewResponse } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function PublicInterviewPage() {
  const { t } = useI18n();
  const params = useParams();
  const token = String(params?.token ?? "");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<{ id: string; prompt: string }[]>([]);
  const [status, setStatus] = useState("open");
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    void getPublicInterview(token)
      .then((c) => {
        setTitle(c.title);
        setQuestions(c.questions ?? []);
        setStatus(c.status);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t("interview.loadError")),
      )
      .finally(() => setLoading(false));
  }, [token, t]);

  const onSubmit = async () => {
    setError(null);
    try {
      await submitInterviewResponse(token, {
        respondent_name: name,
        answers,
      });
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("interview.submitError"));
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg p-8 text-caption text-ink-tertiary">
        {t("interview.loading")}
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <h1 className="text-tagline tracking-tight text-ink">{t("interview.thanks")}</h1>
        <p className="mt-2 text-caption text-ink-secondary">{t("interview.thanksBody")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
      <h1 className="text-tagline tracking-tight text-ink">{title || t("interview.title")}</h1>
      {status !== "open" && (
        <p className="rounded-md border border-notice-border bg-notice px-3 py-2 text-caption">
          {t("interview.closed")}
        </p>
      )}
      {error && <p className="text-caption text-error">{error}</p>}
      <label className="flex flex-col gap-1 text-caption">
        <span className="text-ink-secondary">{t("interview.yourName")}</span>
        <input
          data-id="interview-name"
          className="rounded-md border border-hairline px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={status !== "open"}
        />
      </label>
      {questions.map((q) => (
        <label key={q.id} className="flex flex-col gap-1 text-caption">
          <span className="font-medium text-ink">{q.prompt}</span>
          <textarea
            data-id={`interview-q-${q.id}`}
            rows={3}
            className="rounded-md border border-hairline px-3 py-2"
            value={answers[q.id] ?? ""}
            onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
            disabled={status !== "open"}
          />
        </label>
      ))}
      <button
        type="button"
        data-id="interview-submit"
        disabled={status !== "open"}
        onClick={() => void onSubmit()}
        className="rounded-full bg-accent px-4 py-2 text-caption font-semibold text-on-accent hover:bg-accent-focus disabled:opacity-50"
      >
        {t("interview.submit")}
      </button>
    </div>
  );
}
