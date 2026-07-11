"use client";

// Template gallery — pick a template map and instantiate a new private map.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, LayoutTemplate } from "lucide-react";

import {
  createFromTemplate,
  getDirectory,
  listTemplates,
  type DirectoryDept,
  type MapSummary,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { levelBadge } from "@/lib/workflow-levels";
import { ModalBackdrop } from "@/components/modal-backdrop";

interface Props {
  onClose: () => void;
  onCreated?: () => void;
}

export function TemplatePickerModal({ onClose, onCreated }: Props) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [templates, setTemplates] = useState<MapSummary[]>([]);
  const [depts, setDepts] = useState<DirectoryDept[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [owningDept, setOwningDept] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([listTemplates(), getDirectory()])
      .then(([tpls, dir]) => {
        if (!active) return;
        setTemplates(tpls);
        setDepts(dir.departments);
        if (tpls.length > 0) {
          setSelectedId(tpls[0].id);
          setName(`${tpls[0].name} (copy)`);
        }
        if (dir.departments.length > 0) {
          setOwningDept(dir.departments[0].id);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleCreate() {
    if (selectedId == null || !name.trim() || !owningDept) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createFromTemplate(selectedId, {
        name: name.trim(),
        owning_department: owningDept,
        visibility: "private",
      });
      onCreated?.();
      onClose();
      router.push(`/maps/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <ModalBackdrop
      className="fixed inset-0 z-[1200] flex items-center justify-center backdrop-blur-sm"
      style={{ background: "color-mix(in srgb, var(--color-ink) 20%, transparent)" }}
      onClose={onClose}
    >
      <div
        data-id="template-picker"
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-md border border-hairline bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h2 className="text-body-strong text-ink">{t("home.templatePickerTitle")}</h2>
          <button
            type="button"
            aria-label={t("common.cancel")}
            className="rounded-sm p-1 text-ink-tertiary hover:bg-surface-alt hover:text-ink"
            onClick={onClose}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {loading ? (
            <p className="text-caption text-ink-tertiary">{t("common.loading")}</p>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-caption text-ink-tertiary">
              <LayoutTemplate size={28} strokeWidth={1.5} className="text-ink-tertiary" />
              {t("home.templatePickerEmpty")}
            </div>
          ) : (
            <>
              <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-sm border border-hairline p-1">
                {templates.map((tpl) => {
                  const active = selectedId === tpl.id;
                  return (
                    <li key={tpl.id}>
                      <button
                        type="button"
                        data-id={`template-option-${tpl.id}`}
                        className={`flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-caption ${
                          active
                            ? "bg-accent-tint text-accent"
                            : "text-ink hover:bg-surface-alt"
                        }`}
                        onClick={() => {
                          setSelectedId(tpl.id);
                          setName(`${tpl.name} (copy)`);
                        }}
                      >
                        <LayoutTemplate size={14} strokeWidth={1.5} className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{tpl.name}</span>
                        <span className="shrink-0 text-fine text-ink-tertiary">
                          {levelBadge(tpl.workflow_level ?? 3, lang)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <label className="flex flex-col gap-1">
                <span className="text-caption text-ink-secondary">{t("home.templateNameLabel")}</span>
                <input
                  data-id="template-new-name"
                  className="rounded-sm border border-hairline bg-surface px-3 py-2 text-body text-ink outline-none focus:border-accent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-caption text-ink-secondary">{t("perm.owningDept.title")}</span>
                <select
                  data-id="template-owning-dept"
                  className="rounded-sm border border-hairline bg-surface px-3 py-2 text-body text-ink outline-none focus:border-accent"
                  value={owningDept}
                  onChange={(e) => setOwningDept(e.target.value)}
                >
                  {depts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.korean_name ? `${d.name} (${d.korean_name})` : d.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {error && <p className="text-caption text-error">{error}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-hairline px-4 py-3">
          <button
            type="button"
            className="rounded-sm border border-hairline px-3 py-1.5 text-caption text-ink hover:bg-surface-alt"
            onClick={onClose}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            data-id="template-create-btn"
            disabled={
              saving ||
              loading ||
              templates.length === 0 ||
              selectedId == null ||
              !name.trim() ||
              !owningDept
            }
            className="rounded-sm bg-accent px-3 py-1.5 text-caption text-on-accent hover:bg-accent-focus disabled:opacity-50"
            onClick={() => void handleCreate()}
          >
            {t("home.templateCreate")}
          </button>
        </footer>
      </div>
    </ModalBackdrop>,
    document.body,
  );
}
