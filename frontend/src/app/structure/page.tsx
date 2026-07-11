"use client";

// Structure tree — Domain…Task hierarchy via parent_map_id (roadmap Phase A)

import { ChevronDown, ChevronRight, Network } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  getStructureTree,
  type StructureMapNode,
} from "@/lib/api";
import { levelBadge } from "@/lib/workflow-levels";
import { useI18n } from "@/lib/i18n";

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
        className="flex items-center gap-1 rounded-sm py-1 pr-2 hover:bg-surface-alt"
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

export default function StructurePage() {
  const { t, lang } = useI18n();
  const [roots, setRoots] = useState<StructureMapNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    void getStructureTree()
      .then((res) => setRoots(res.roots))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load structure"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Network size={20} strokeWidth={1.6} className="text-accent" />
        <h1 className="text-tagline text-ink">{t("nav.tab.structure")}</h1>
      </div>
      <p className="text-caption text-ink-secondary">
        {t("structure.intro")}
      </p>
      {loading && <p className="text-fine text-ink-tertiary">{t("structure.loading")}</p>}
      {error && (
        <p className="text-caption text-error" data-id="structure-error">
          {error}
        </p>
      )}
      {!loading && !error && roots.length === 0 && (
        <p className="rounded-sm border border-hairline bg-surface-alt p-4 text-caption text-ink-secondary">
          {t("structure.empty")}
        </p>
      )}
      {!loading && roots.length > 0 && (
        <ul
          data-id="structure-tree"
          className="rounded-md border border-hairline bg-surface py-2"
        >
          {roots.map((r) => (
            <TreeNode key={r.id} node={r} depth={0} lang={lang} />
          ))}
        </ul>
      )}
    </div>
  );
}
