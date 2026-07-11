"use client";

// Structure tree + architecture ontology O1–O3 (gaps, concepts, relations)

import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Factory,
  GitBranch,
  Link2,
  Network,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  createArchitectureRelation,
  createConcept,
  deleteArchitectureRelation,
  getStructureGaps,
  getStructureTree,
  listArchitectureRelations,
  listConcepts,
  type ArchitectureConcept,
  type ArchitectureRelation,
  type StructureGapIssue,
  type StructureIndustryGroup,
  type StructureMapNode,
} from "@/lib/api";
import { levelBadge } from "@/lib/workflow-levels";
import { useI18n } from "@/lib/i18n";

type Tab = "tree" | "gaps" | "concepts" | "links";

const RELATION_TYPES = [
  "contains",
  "realizes",
  "calls",
  "variant_of",
  "uses",
  "owned_by",
] as const;

function TreeNode({
  node,
  depth,
  lang,
}: {
  node: StructureMapNode;
  depth: number;
  lang: "en" | "ko";
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const badge = levelBadge(node.workflow_level, lang);

  return (
    <li className="select-none">
      <div
        className="flex items-center gap-1 rounded-sm py-1 pr-2 hover:bg-surface-pearl"
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="rounded p-0.5 text-ink-tertiary hover:bg-surface"
            aria-label={lang === "ko" ? (open ? "접기" : "펼치기") : open ? "Collapse" : "Expand"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <ChevronDown size={14} strokeWidth={1.5} />
            ) : (
              <ChevronRight size={14} strokeWidth={1.5} />
            )}
          </button>
        ) : (
          <span className="inline-block w-[18px]" />
        )}
        <span
          className="shrink-0 rounded-sm border border-hairline bg-surface-alt px-1.5 py-0.5 text-fine text-ink-secondary"
          title={badge}
        >
          {badge}
        </span>
        <Link
          href={`/maps/${node.id}`}
          className="min-w-0 truncate text-caption font-medium text-ink hover:text-accent hover:underline"
        >
          {node.name}
        </Link>
      </div>
      {hasChildren && open && (
        <ul>
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} lang={lang} />
          ))}
        </ul>
      )}
    </li>
  );
}

function IndustrySection({
  group,
  lang,
  defaultOpen,
}: {
  group: StructureIndustryGroup;
  lang: "en" | "ko";
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const mapCount = countMaps(group.roots);

  return (
    <section
      data-id="structure-industry"
      className="overflow-hidden rounded-lg border border-hairline bg-surface"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-surface-pearl"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown size={16} strokeWidth={1.5} className="shrink-0 text-accent" />
        ) : (
          <ChevronRight size={16} strokeWidth={1.5} className="shrink-0 text-ink-tertiary" />
        )}
        <Factory size={16} strokeWidth={1.5} className="shrink-0 text-accent" />
        <span className="min-w-0 flex-1 truncate text-body-strong tracking-tight text-ink">
          {group.name}
        </span>
        <span className="shrink-0 rounded-full bg-accent-tint px-2 py-0.5 text-fine text-accent">
          {mapCount} maps
        </span>
      </button>
      {open && (
        <ul className="border-t border-divider py-2">
          {group.roots.map((r) => (
            <TreeNode key={r.id} node={r} depth={0} lang={lang} />
          ))}
        </ul>
      )}
    </section>
  );
}

function countMaps(nodes: StructureMapNode[]): number {
  let n = 0;
  const walk = (list: StructureMapNode[]) => {
    for (const x of list) {
      n += 1;
      walk(x.children);
    }
  };
  walk(nodes);
  return n;
}

function severityClass(sev: string): string {
  if (sev === "error") return "border-error/40 bg-error/5 text-error";
  if (sev === "warn") return "border-notice-border bg-notice text-ink";
  return "border-hairline bg-surface-alt text-ink-secondary";
}

export default function StructurePage() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<Tab>("tree");
  const [industries, setIndustries] = useState<StructureIndustryGroup[]>([]);
  const [roots, setRoots] = useState<StructureMapNode[]>([]);
  const [gaps, setGaps] = useState<StructureGapIssue[]>([]);
  const [gapMeta, setGapMeta] = useState({ map_count: 0, issue_count: 0 });
  const [concepts, setConcepts] = useState<ArchitectureConcept[]>([]);
  const [relations, setRelations] = useState<ArchitectureRelation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [conceptName, setConceptName] = useState("");
  const [relType, setRelType] = useState<string>("realizes");
  const [relSource, setRelSource] = useState("");
  const [relTarget, setRelTarget] = useState("");
  const [relNote, setRelNote] = useState("");
  const [busy, setBusy] = useState(false);

  const loadTree = useCallback(() => {
    setLoading(true);
    setError(null);
    void getStructureTree()
      .then((res) => {
        setRoots(res.roots);
        setIndustries(res.industries?.length ? res.industries : []);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load structure"),
      )
      .finally(() => setLoading(false));
  }, []);

  const loadGaps = useCallback(() => {
    setLoading(true);
    setError(null);
    void getStructureGaps()
      .then((res) => {
        setGaps(res.issues);
        setGapMeta({ map_count: res.map_count, issue_count: res.issue_count });
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load gaps"),
      )
      .finally(() => setLoading(false));
  }, []);

  const loadConcepts = useCallback(() => {
    setLoading(true);
    setError(null);
    void listConcepts()
      .then(setConcepts)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load concepts"),
      )
      .finally(() => setLoading(false));
  }, []);

  const loadLinks = useCallback(() => {
    setLoading(true);
    setError(null);
    void listArchitectureRelations()
      .then(setRelations)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load relations"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "tree") loadTree();
    else if (tab === "gaps") loadGaps();
    else if (tab === "concepts") loadConcepts();
    else loadLinks();
  }, [tab, loadTree, loadGaps, loadConcepts, loadLinks]);

  const onCreateConcept = async () => {
    const name = conceptName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await createConcept({ name });
      setConceptName("");
      loadConcepts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "create failed");
    } finally {
      setBusy(false);
    }
  };

  const onCreateRelation = async () => {
    const s = Number(relSource);
    const tMap = Number(relTarget);
    if (!Number.isFinite(s) || !Number.isFinite(tMap) || busy) return;
    setBusy(true);
    try {
      await createArchitectureRelation({
        relation_type: relType,
        source_map_id: s,
        target_map_id: tMap,
        note: relNote.trim(),
      });
      setRelSource("");
      setRelTarget("");
      setRelNote("");
      loadLinks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "create failed");
    } finally {
      setBusy(false);
    }
  };

  const useIndustrySections = industries.length > 0;

  const tabs: { id: Tab; label: string; icon: typeof Network }[] = [
    { id: "tree", label: t("structure.tab.tree"), icon: Network },
    { id: "gaps", label: t("structure.tab.gaps"), icon: AlertTriangle },
    { id: "concepts", label: t("structure.tab.concepts"), icon: Tags },
    { id: "links", label: t("structure.tab.links"), icon: Link2 },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <GitBranch size={20} strokeWidth={1.6} className="text-accent" />
        <h1 className="text-tagline tracking-tight text-ink">{t("nav.tab.structure")}</h1>
      </div>
      <p className="text-caption text-ink-secondary">{t("structure.intro")}</p>

      <div
        data-id="structure-tabs"
        className="flex flex-wrap gap-1 border-b border-hairline pb-2"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            data-id={`structure-tab-${id}`}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-fine font-medium ${
              tab === id
                ? "border-accent bg-accent-tint text-accent"
                : "border-hairline text-ink-secondary hover:bg-surface-alt"
            }`}
          >
            <Icon size={14} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-fine text-ink-tertiary">{t("structure.loading")}</p>}
      {error && (
        <p className="text-caption text-error" data-id="structure-error">
          {error}
        </p>
      )}

      {tab === "tree" && !loading && !error && roots.length === 0 && (
        <p className="rounded-lg border border-hairline bg-surface-alt p-4 text-caption text-ink-secondary">
          {t("structure.empty")}
        </p>
      )}
      {tab === "tree" && !loading && useIndustrySections && (
        <div data-id="structure-industries" className="flex flex-col gap-3">
          {industries.map((g, i) => (
            <IndustrySection
              key={g.name}
              group={g}
              lang={lang}
              defaultOpen={
                g.name.includes("Memory Semiconductor") ||
                g.name.includes("메모리") ||
                i === 0
              }
            />
          ))}
        </div>
      )}
      {tab === "tree" && !loading && !useIndustrySections && roots.length > 0 && (
        <ul
          data-id="structure-tree"
          className="rounded-lg border border-hairline bg-surface py-2"
        >
          {roots.map((r) => (
            <TreeNode key={r.id} node={r} depth={0} lang={lang} />
          ))}
        </ul>
      )}

      {tab === "gaps" && !loading && (
        <div data-id="structure-gaps" className="flex flex-col gap-2">
          <p className="text-fine text-ink-tertiary">
            {t("structure.gaps.count", {
              n: gapMeta.issue_count,
              m: gapMeta.map_count,
            })}
          </p>
          {gaps.length === 0 ? (
            <p className="rounded-lg border border-hairline bg-surface-alt p-4 text-caption text-ink-secondary">
              {t("structure.gaps.empty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {gaps.map((g, i) => (
                <li
                  key={`${g.kind}-${g.map_id}-${i}`}
                  className={`rounded-md border px-3 py-2 text-caption ${severityClass(g.severity)}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-sm bg-surface/80 px-1.5 py-0.5 text-fine font-semibold uppercase">
                      {g.severity}
                    </span>
                    <span className="text-fine font-medium">{g.kind}</span>
                    {g.map_id != null ? (
                      <Link
                        href={`/maps/${g.map_id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {g.map_name}
                      </Link>
                    ) : (
                      <span className="font-medium">{g.map_name}</span>
                    )}
                    {g.related_map_id != null && (
                      <span className="text-fine opacity-80">
                        {t("structure.gaps.related")}:{" "}
                        <Link
                          href={`/maps/${g.related_map_id}`}
                          className="hover:underline"
                        >
                          {g.related_map_name ?? g.related_map_id}
                        </Link>
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-fine opacity-90">{g.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "concepts" && !loading && (
        <div data-id="structure-concepts" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-fine">
              <span className="text-ink-secondary">{t("structure.concepts.name")}</span>
              <input
                data-id="structure-concept-name"
                className="rounded-md border border-hairline px-2 py-1.5 text-caption"
                value={conceptName}
                onChange={(e) => setConceptName(e.target.value)}
              />
            </label>
            <button
              type="button"
              data-id="structure-concept-create"
              disabled={busy || !conceptName.trim()}
              onClick={() => void onCreateConcept()}
              className="rounded-full bg-accent px-3 py-1.5 text-fine font-semibold text-on-accent hover:bg-accent-focus disabled:opacity-50"
            >
              {t("structure.concepts.create")}
            </button>
          </div>
          {concepts.length === 0 ? (
            <p className="rounded-lg border border-hairline bg-surface-alt p-4 text-caption text-ink-secondary">
              {t("structure.concepts.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-hairline rounded-lg border border-hairline bg-surface">
              {concepts.map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-3 py-2 text-caption">
                  <Tags size={14} className="shrink-0 text-accent" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1 font-medium text-ink">{c.name}</span>
                  {c.workflow_level != null && (
                    <span className="text-fine text-ink-tertiary">L{c.workflow_level}</span>
                  )}
                  <span className="text-fine text-ink-secondary">
                    {t("structure.concepts.maps", { n: c.map_count })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "links" && !loading && (
        <div data-id="structure-links" className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-fine">
              <span className="text-ink-secondary">{t("structure.links.type")}</span>
              <select
                data-id="structure-rel-type"
                className="rounded-md border border-hairline px-2 py-1.5 text-caption"
                value={relType}
                onChange={(e) => setRelType(e.target.value)}
              >
                {RELATION_TYPES.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-fine">
              <span className="text-ink-secondary">{t("structure.links.note")}</span>
              <input
                className="rounded-md border border-hairline px-2 py-1.5 text-caption"
                value={relNote}
                onChange={(e) => setRelNote(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-fine">
              <span className="text-ink-secondary">{t("structure.links.source")}</span>
              <input
                data-id="structure-rel-source"
                className="rounded-md border border-hairline px-2 py-1.5 text-caption"
                value={relSource}
                onChange={(e) => setRelSource(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className="flex flex-col gap-1 text-fine">
              <span className="text-ink-secondary">{t("structure.links.target")}</span>
              <input
                data-id="structure-rel-target"
                className="rounded-md border border-hairline px-2 py-1.5 text-caption"
                value={relTarget}
                onChange={(e) => setRelTarget(e.target.value)}
                inputMode="numeric"
              />
            </label>
          </div>
          <button
            type="button"
            data-id="structure-rel-create"
            disabled={busy || !relSource.trim() || !relTarget.trim()}
            onClick={() => void onCreateRelation()}
            className="self-start rounded-full bg-accent px-3 py-1.5 text-fine font-semibold text-on-accent hover:bg-accent-focus disabled:opacity-50"
          >
            {t("structure.links.create")}
          </button>
          {relations.length === 0 ? (
            <p className="rounded-lg border border-hairline bg-surface-alt p-4 text-caption text-ink-secondary">
              {t("structure.links.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-hairline rounded-lg border border-hairline bg-surface">
              {relations.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-2 px-3 py-2 text-caption"
                >
                  <span className="rounded-sm bg-accent-tint px-1.5 py-0.5 text-fine font-semibold text-accent">
                    {r.relation_type}
                  </span>
                  <span className="text-ink">
                    {r.source_map_id != null ? (
                      <Link href={`/maps/${r.source_map_id}`} className="text-accent hover:underline">
                        map:{r.source_map_id}
                      </Link>
                    ) : (
                      `concept:${r.source_concept_id}`
                    )}
                    {" → "}
                    {r.target_map_id != null ? (
                      <Link href={`/maps/${r.target_map_id}`} className="text-accent hover:underline">
                        map:{r.target_map_id}
                      </Link>
                    ) : (
                      `concept:${r.target_concept_id}`
                    )}
                  </span>
                  {r.note && <span className="text-fine text-ink-tertiary">{r.note}</span>}
                  <button
                    type="button"
                    className="ml-auto text-fine text-error hover:underline"
                    onClick={() =>
                      void deleteArchitectureRelation(r.id)
                        .then(loadLinks)
                        .catch((err: unknown) =>
                          setError(err instanceof Error ? err.message : "delete failed"),
                        )
                    }
                  >
                    {t("structure.links.delete")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
