"use client";

// 맵 정보 탭 — description 편집(편집자+) + 오우닝 부서 표시/지정(owner) + 레벨/parent/템플릿 /
// Map details: description, owning dept, workflow level, parent, template flag (Phase B).

import { useEffect, useMemo, useState } from "react";
import { Building2, LockKeyhole, TriangleAlert } from "lucide-react";

import {
  getDirectory,
  getMap,
  listMaps,
  setOwningDepartment,
  updateMap,
  type DirectoryDept,
  type DirectoryUser,
  type MapSummary,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { buildKoreanDeptByPath, deriveDeptKoreanKeywords, formatDeptName } from "@/lib/korean-dept";
import type { Department } from "@/lib/mock/permissions-types";
import {
  WORKFLOW_LEVELS,
  levelOptionLabel,
  levelTip,
  type WorkflowLevel,
} from "@/lib/workflow-levels";
import { PrincipalPicker } from "@/components/permissions/principal-picker";
import type { PrincipalOption } from "@/components/permissions/principal-picker";

interface MapDetailsPanelProps {
  mapId: string;
  canEdit: boolean;
  /** 오우닝 부서 지정/변경은 owner(sysadmin 포함) 전용 */
  isOwner: boolean;
  onToast: (message: string) => void;
  /** 오우닝 부서 변경 후 부모 갱신(협업자 잠금 행 동기화) */
  onChanged?: () => void;
}

export function MapDetailsPanel({ mapId, canEdit, isOwner, onToast, onChanged }: MapDetailsPanelProps) {
  const { t, lang } = useI18n();
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 오우닝 부서 표시/지정 — description과 같은 effect에서 병렬 로드.
  const [owningDept, setOwningDept] = useState<string | null>(null);
  const [dirUsers, setDirUsers] = useState<DirectoryUser[]>([]);
  const [dirDepts, setDirDepts] = useState<DirectoryDept[]>([]);
  const [pickingOwning, setPickingOwning] = useState(false);

  // Structure + template
  const [workflowLevel, setWorkflowLevel] = useState<WorkflowLevel>(3);
  const [parentMapId, setParentMapId] = useState<number | "">("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [allMaps, setAllMaps] = useState<MapSummary[]>([]);
  const [structureSaving, setStructureSaving] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([getMap(Number(mapId)), getDirectory(), listMaps()])
      .then(([d, dir, maps]) => {
        if (active) {
          setDescription(d.description);
          setOwningDept(d.owning_department ?? null);
          setDirUsers(dir.users);
          setDirDepts(dir.departments);
          setWorkflowLevel((d.workflow_level ?? 3) as WorkflowLevel);
          setParentMapId(d.parent_map_id ?? "");
          setIsTemplate(Boolean(d.is_template));
          setAllMaps(maps);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      active = false;
    };
  }, [mapId]);

  const parentOptions = useMemo(
    () =>
      allMaps.filter(
        (m) => m.id !== Number(mapId) && (m.workflow_level ?? 3) < workflowLevel,
      ),
    [allMaps, mapId, workflowLevel],
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateMap(Number(mapId), { description });
      onToast(t("perm.details.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveStructure() {
    setStructureSaving(true);
    setError(null);
    try {
      await updateMap(Number(mapId), {
        workflow_level: workflowLevel,
        parent_map_id: parentMapId === "" ? null : parentMapId,
      });
      onToast(t("perm.details.structureSaved"));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStructureSaving(false);
    }
  }

  async function handleToggleTemplate() {
    setTemplateSaving(true);
    setError(null);
    try {
      const next = !isTemplate;
      await updateMap(Number(mapId), { is_template: next });
      setIsTemplate(next);
      onToast(t("perm.details.templateSaved"));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTemplateSaving(false);
    }
  }

  async function handlePickOwning(opt: PrincipalOption) {
    try {
      const updated = await setOwningDepartment(Number(mapId), opt.principalId);
      setOwningDept(updated.owning_department ?? opt.principalId);
      setPickingOwning(false);
      onToast(t("perm.owningDept.saved"));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // 피커용 부서 어댑터 — create-map-dialog.tsx:117-132와 동일한 변환(부서만 필요, users는 생략).
  const userById = new Map(dirUsers.map((u) => [u.id, u]));
  const pickerDepts: Department[] = dirDepts.map((d) => {
    const head = d.manager ? userById.get(d.manager) : undefined;
    const managerKeywords = [d.manager, head?.name, head?.korean_name].filter(Boolean).join(" ");
    return {
      id: d.id,
      code: "",
      name: d.name,
      orgLevels: [],
      parentId: null,
      rawDn: "",
      korean_name: d.korean_name,
      manager: managerKeywords,
    };
  });
  const koreanByPath = buildKoreanDeptByPath(dirDepts, dirUsers);

  return (
    <div data-id="settings-details" className="flex max-w-xl flex-col gap-3">
      <label className="text-caption text-ink-secondary">
        {t("perm.details.descriptionLabel")}
      </label>
      <textarea
        data-id="settings-description"
        className="min-h-[6rem] resize-y rounded-sm border border-hairline bg-surface px-3 py-2 text-body text-ink outline-none placeholder:text-ink-tertiary focus:border-accent disabled:opacity-60"
        placeholder={t("perm.details.descriptionPlaceholder")}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={!canEdit || saving}
      />
      {error && <p className="text-caption text-error">{error}</p>}
      {canEdit && (
        <div>
          <button
            type="button"
            data-id="settings-description-save"
            className="rounded-sm bg-accent px-3 py-1.5 text-caption text-on-accent hover:bg-accent-focus disabled:opacity-60"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {t("perm.details.save")}
          </button>
        </div>
      )}

      {/* Workflow level + parent map (Phase B polish) */}
      <div data-id="settings-structure" className="mt-2 flex flex-col gap-2 border-t border-hairline pt-3">
        <label className="text-caption text-ink-secondary">{t("perm.details.workflowLevel")}</label>
        <select
          data-id="settings-workflow-level"
          className="rounded-sm border border-hairline bg-surface px-3 py-2 text-body text-ink outline-none focus:border-accent disabled:opacity-60"
          value={workflowLevel}
          disabled={!canEdit || structureSaving}
          title={levelTip(workflowLevel, lang)}
          onChange={(e) => {
            const next = Number(e.target.value) as WorkflowLevel;
            setWorkflowLevel(next);
            // Clear parent if no longer valid
            if (parentMapId !== "") {
              const parent = allMaps.find((m) => m.id === parentMapId);
              if (!parent || (parent.workflow_level ?? 3) >= next) {
                setParentMapId("");
              }
            }
          }}
        >
          {WORKFLOW_LEVELS.map((row) => (
            <option key={row.level} value={row.level}>
              {levelOptionLabel(row.level, lang)}
            </option>
          ))}
        </select>
        <p className="text-fine text-ink-tertiary">{levelTip(workflowLevel, lang)}</p>

        <label className="text-caption text-ink-secondary">{t("perm.details.parentMap")}</label>
        <select
          data-id="settings-parent-map"
          className="rounded-sm border border-hairline bg-surface px-3 py-2 text-body text-ink outline-none focus:border-accent disabled:opacity-60"
          value={parentMapId === "" ? "" : String(parentMapId)}
          disabled={!canEdit || structureSaving}
          onChange={(e) =>
            setParentMapId(e.target.value === "" ? "" : Number(e.target.value))
          }
        >
          <option value="">{t("perm.details.parentNone")}</option>
          {parentOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {levelOptionLabel(m.workflow_level ?? 3, lang)} · {m.name}
            </option>
          ))}
        </select>
        {canEdit && (
          <div>
            <button
              type="button"
              data-id="settings-structure-save"
              className="rounded-sm border border-hairline px-3 py-1.5 text-caption text-ink hover:bg-surface-alt disabled:opacity-60"
              onClick={() => void handleSaveStructure()}
              disabled={structureSaving}
            >
              {t("perm.details.save")}
            </button>
          </div>
        )}
      </div>

      {/* Template flag — editor+ (same as PATCH) */}
      <div data-id="settings-template" className="flex flex-col gap-1.5 border-t border-hairline pt-3">
        <label className="text-caption text-ink-secondary">{t("perm.details.templateTitle")}</label>
        <p className="text-fine text-ink-tertiary">{t("perm.details.templateHint")}</p>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-sm border px-2 py-0.5 text-fine ${
              isTemplate
                ? "border-accent/30 bg-accent-tint text-accent"
                : "border-hairline text-ink-tertiary"
            }`}
          >
            {isTemplate ? t("home.templateBadge") : "—"}
          </span>
          {canEdit && (
            <button
              type="button"
              data-id="settings-template-toggle"
              className="rounded-sm border border-hairline px-2.5 py-1 text-caption text-ink hover:bg-surface-alt disabled:opacity-60"
              disabled={templateSaving}
              onClick={() => void handleToggleTemplate()}
            >
              {isTemplate ? t("perm.details.templateOff") : t("perm.details.templateOn")}
            </button>
          )}
        </div>
      </div>

      <div data-id="settings-owning-dept" className="flex flex-col gap-1.5 border-t border-hairline pt-3">
        <label className="text-caption text-ink-secondary">{t("perm.owningDept.title")}</label>
        {owningDept ? (
          <div className="flex items-center gap-2 rounded-sm border border-hairline px-3 py-2">
            <Building2 size={16} strokeWidth={1.5} className="shrink-0 text-ink-tertiary" />
            <span className="min-w-0 flex-1 truncate text-body text-ink">
              {formatDeptName(owningDept, lang, koreanByPath)}
              <span className="ml-1.5 text-fine text-ink-tertiary">{owningDept}</span>
            </span>
            <span
              title={t("perm.owningDept.lockedNote")}
              className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-hairline px-1.5 py-0.5 text-fine text-ink-tertiary"
            >
              <LockKeyhole size={12} strokeWidth={1.5} />
              {t("perm.owningDept.lockedEditor")}
            </span>
            {isOwner && (
              <button
                type="button"
                data-id="owning-dept-change"
                className="rounded-sm border border-hairline px-2 py-1 text-caption text-ink hover:bg-surface-alt"
                onClick={() => setPickingOwning((v) => !v)}
              >
                {t("perm.owningDept.changeBtn")}
              </button>
            )}
          </div>
        ) : (
          <div
            data-id="owning-dept-missing"
            className="flex items-center gap-2 rounded-sm border border-hairline bg-surface-alt px-3 py-2"
          >
            <TriangleAlert size={16} strokeWidth={1.5} className="shrink-0 text-error" />
            <span className="min-w-0 flex-1 text-caption text-ink-secondary">
              {t("perm.owningDept.missingNotice")}
            </span>
            {isOwner && (
              <button
                type="button"
                data-id="owning-dept-assign"
                className="rounded-sm bg-accent px-2.5 py-1 text-caption text-on-accent hover:bg-accent-focus"
                onClick={() => setPickingOwning((v) => !v)}
              >
                {t("perm.owningDept.assignBtn")}
              </button>
            )}
          </div>
        )}
        {pickingOwning && isOwner && (
          <PrincipalPicker
            users={[]}
            departments={pickerDepts}
            groups={[]}
            excludeIds={new Set(owningDept ? [owningDept] : [])}
            deptKoreanKeywords={deriveDeptKoreanKeywords(dirUsers)}
            onSelect={(opt) => void handlePickOwning(opt)}
          />
        )}
      </div>
    </div>
  );
}
