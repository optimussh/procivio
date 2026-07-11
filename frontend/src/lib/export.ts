// 캔버스 PNG/PDF 내보내기 — React Flow 공식 권장 방식(html-to-image) (spec §7 Phase B).
// html-to-image는 HTML 요소의 computed style은 인라인하지만 SVG 하위 요소는 DOM 그대로 복제한다 —
// 스타일시트/CSS 변수 의존 엣지 stroke가 클론에서 소실되므로, 캡처 직전 엣지·화살촉에
// 인라인 스타일(검은 실선)을 직접 심고 캡처 후 원복한다. 색상은 출력물이라 raw hex 허용(design.md §1).

import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";
import { toPng } from "html-to-image";

const PADDING_PX = 50; // 노드 경계 바깥 여백
const MIN_SIZE_PX = 400;
const MAX_SIZE_PX = 4096; // 브라우저 캔버스 크기 한계 보호
const PIXEL_RATIO = 2; // 2배 해상도 — 노드 테두리·텍스트 선명도
const EDGE_STROKE = "#000000"; // 출력 엣지 — 검은 실선
const EDGE_STROKE_WIDTH = "1.5";

interface Frame {
  width: number;
  height: number;
  x: number;
  y: number;
  zoom: number;
}

export interface PdfExportMeta {
  title: string;
  versionLabel?: string;
  workflowLevel?: number;
  levelLabel?: string;
  description?: string;
  exportedAt?: string;
  appName?: string;
}

// 엣지·화살촉 인라인 보정 — 되돌리기 클로저 반환. 히트박스(edge-interaction)는 투명 유지.
function applyEdgeFixups(viewport: HTMLElement): () => void {
  const undos: Array<() => void> = [];
  const setImportant = (el: Element, prop: string, value: string) => {
    const style = (el as SVGElement).style;
    const prev = style.getPropertyValue(prop);
    const prevPriority = style.getPropertyPriority(prop);
    style.setProperty(prop, value, "important");
    undos.push(() => {
      if (prev) style.setProperty(prop, prev, prevPriority);
      else style.removeProperty(prop);
    });
  };
  for (const path of viewport.querySelectorAll(".react-flow__edge-path")) {
    setImportant(path, "stroke", EDGE_STROKE);
    setImportant(path, "stroke-width", EDGE_STROKE_WIDTH);
    setImportant(path, "stroke-dasharray", "none"); // animated 점선도 출력에선 실선
  }
  for (const hit of viewport.querySelectorAll(".react-flow__edge-interaction")) {
    setImportant(hit, "stroke", "none"); // 히트박스는 지금처럼 안 보이게
  }
  for (const head of viewport.querySelectorAll(".react-flow__arrowhead *")) {
    // marker 색은 var() 참조 — 클론에서 해석 불가라 엣지와 같은 검정으로 고정
    setImportant(head, "stroke", EDGE_STROKE);
    setImportant(head, "fill", EDGE_STROKE);
  }
  return () => {
    for (const undo of undos) undo();
  };
}

function computeFrame(nodes: Node[]): Frame | null {
  if (nodes.length === 0) return null;
  const bounds = getNodesBounds(nodes);
  const width = Math.min(
    Math.max(Math.ceil(bounds.width) + PADDING_PX * 2, MIN_SIZE_PX),
    MAX_SIZE_PX,
  );
  const height = Math.min(
    Math.max(Math.ceil(bounds.height) + PADDING_PX * 2, MIN_SIZE_PX),
    MAX_SIZE_PX,
  );
  const transform = getViewportForBounds(bounds, width, height, 0.2, 2, 0.1);
  return {
    width,
    height,
    x: transform.x,
    y: transform.y,
    zoom: transform.zoom,
  };
}

// 보정을 심은 채 캡처 — finally로 반드시 원복. data URL 반환.
async function captureViewportPng(
  viewport: HTMLElement,
  frame: Frame,
  backgroundColor: string,
): Promise<string> {
  const undoFixups = applyEdgeFixups(viewport);
  try {
    return await toPng(viewport, {
      backgroundColor,
      pixelRatio: PIXEL_RATIO,
      width: frame.width,
      height: frame.height,
      style: {
        width: `${frame.width}px`,
        height: `${frame.height}px`,
        transform: `translate(${frame.x}px, ${frame.y}px) scale(${frame.zoom})`,
      },
    });
  } finally {
    undoFixups();
  }
}

function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

/** 전체 노드 bounds 기준으로 현재 캔버스를 PNG 파일로 저장한다. */
export async function exportCanvasPng(
  nodes: Node[],
  fileName: string,
): Promise<void> {
  const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
  const frame = computeFrame(nodes);
  if (!viewport || !frame) {
    return;
  }
  const dataUrl = await captureViewportPng(viewport, frame, "#ffffff");
  downloadDataUrl(dataUrl, fileName);
}

/** 고정 프레임(비교 화면 등) PNG 저장 — 호출측 캔버스의 viewport를 지정 크기로 맞춰 캡처. */
export async function exportFramedPng(
  nodes: Node[],
  fileName: string,
  options: { width: number; height: number; minZoom: number; backgroundColor: string },
): Promise<void> {
  const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewport || nodes.length === 0) {
    return;
  }
  const { width, height, minZoom, backgroundColor } = options;
  const transform = getViewportForBounds(getNodesBounds(nodes), width, height, minZoom, 2, 0.1);
  const dataUrl = await captureViewportPng(
    viewport,
    { width, height, x: transform.x, y: transform.y, zoom: transform.zoom },
    backgroundColor,
  );
  downloadDataUrl(dataUrl, fileName);
}

/**
 * PDF 내보내기 — 표지(메타) + 맵 이미지 페이지.
 * jspdf 동적 import. 노드 없으면 표지만 저장.
 */
export async function exportCanvasPdf(
  nodes: Node[],
  fileName: string,
  meta: PdfExportMeta,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const appName = meta.appName ?? "Procivio";
  const exportedAt =
    meta.exportedAt ??
    new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  // ── Cover page ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text(appName, margin, margin);

  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  const titleLines = doc.splitTextToSize(meta.title || "Process Map", pageW - margin * 2);
  doc.text(titleLines, margin, margin + 36);

  let y = margin + 36 + titleLines.length * 26 + 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);

  const rows: Array<[string, string]> = [
    ["Version", meta.versionLabel || "—"],
    [
      "Level",
      meta.levelLabel ||
        (meta.workflowLevel != null ? `L${meta.workflowLevel}` : "—"),
    ],
    ["Exported", exportedAt],
  ];
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), margin + 80, y);
    y += 18;
  }

  if (meta.description?.trim()) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Description", margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(meta.description.trim(), pageW - margin * 2);
    doc.text(descLines, margin, y);
  }

  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text(`${appName} · Process knowledge map`, margin, pageH - 24);

  // ── Map page ──
  const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
  const frame = computeFrame(nodes);
  if (viewport && frame) {
    const dataUrl = await captureViewportPng(viewport, frame, "#ffffff");
    doc.addPage();
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2 - 24;
    const scale = Math.min(maxW / frame.width, maxH / frame.height, 1);
    const imgW = frame.width * scale;
    const imgH = frame.height * scale;
    const ox = margin + (maxW - imgW) / 2;
    const oy = margin + 12 + (maxH - imgH) / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(meta.title || "Map", margin, margin);
    doc.addImage(dataUrl, "PNG", ox, oy, imgW, imgH);
  }

  const safeName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  doc.save(safeName);
}
