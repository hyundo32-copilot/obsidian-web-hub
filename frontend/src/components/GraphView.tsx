"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { getGraph } from "@/lib/api";

// ── 상수 ─────────────────────────────────────────────────────────────────────
const FOLDER_COLORS = [
  "#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981",
  "#06b6d4","#f97316","#6366f1","#14b8a6","#e879f9",
];
// 첫 렌더 전 미리 돌릴 틱 수 — 초기 폭발적 재배치를 숨김
const WARMUP = 150;

function nodeRadius(lc: number) {
  return Math.max(5, Math.min(20, 5 + Math.sqrt(lc) * 2.5));
}

// ── 타입 ─────────────────────────────────────────────────────────────────────
interface GNode extends d3.SimulationNodeDatum {
  id: string; title: string; folder: string;
  link_count: number; radius: number; color: string;
}
type GLink = d3.SimulationLinkDatum<GNode>;
interface Transform { x: number; y: number; k: number }

interface Props { onNodeClick: (path: string) => void; onClose: () => void }

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function GraphView({ onNodeClick, onClose }: Props) {
  const wrapRef      = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const simRef       = useRef<d3.Simulation<GNode, GLink> | null>(null);
  const nodesRef     = useRef<GNode[]>([]);
  const linksRef     = useRef<GLink[]>([]);
  const txRef        = useRef<Transform>({ x: 0, y: 0, k: 1 });
  const hovRef       = useRef<GNode | null>(null);
  const dragNodeRef  = useRef<GNode | null>(null);
  const panRef       = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const downPosRef   = useRef<{ x: number; y: number } | null>(null);
  const rafRef       = useRef(0);
  const masterRef    = useRef<{ allNodes: GNode[]; allLinks: GLink[] } | null>(null);
  const searchRef    = useRef("");

  const [loading,     setLoading]     = useState(true);
  const [errMsg,      setErrMsg]      = useState<string | null>(null);
  const [counts,      setCounts]      = useState({ n: 0, e: 0 });
  const [search,      setSearch]      = useState("");
  const [showOrphans, setShowOrphans] = useState(true);
  const [folderMap,   setFolderMap]   = useState<[string, string][]>([]);
  const [hovTitle,    setHovTitle]    = useState<string | null>(null);

  // ── 좌표 변환 ────────────────────────────────────────────────────────────
  function toWorld(ex: number, ey: number) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const { x, y, k } = txRef.current;
    return { wx: (ex - r.left - x) / k, wy: (ey - r.top - y) / k };
  }

  function hitTest(ex: number, ey: number): GNode | null {
    const { wx, wy } = toWorld(ex, ey);
    const k = txRef.current.k;
    let best: GNode | null = null;
    let bestD = Math.max(14 / k, 8);
    for (const n of nodesRef.current) {
      const d = Math.hypot((n.x ?? 0) - wx, (n.y ?? 0) - wy);
      if (d < n.radius + bestD) { bestD = d; best = n; }
    }
    return best;
  }

  // ── 그리기 ───────────────────────────────────────────────────────────────
  function draw() {
    const c = canvasRef.current;
    if (!c || c.width === 0 || c.height === 0) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const { x: tx, y: ty, k } = txRef.current;
    const hov   = hovRef.current;
    const q     = searchRef.current.toLowerCase();
    const nodes = nodesRef.current;
    const links = linksRef.current;

    // 연결 노드 집합 (호버 시 하이라이트용)
    const adjSet = new Set<string>();
    if (hov) {
      for (const l of links) {
        const sid = (l.source as GNode).id, tid = (l.target as GNode).id;
        if (sid === hov.id || tid === hov.id) { adjSet.add(sid); adjSet.add(tid); }
      }
    }

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(k, k);

    // ─ 엣지 ─
    for (const l of links) {
      const s = l.source as GNode, t = l.target as GNode;
      const sx = s.x ?? 0, sy = s.y ?? 0, ex = t.x ?? 0, ey = t.y ?? 0;
      const adj = !hov || adjSet.has(s.id);
      ctx.globalAlpha = hov ? (adj ? 0.8 : 0.05) : 0.4;
      ctx.strokeStyle = "#aaaaaa";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    // ─ 노드 ─
    for (const n of nodes) {
      const nx = n.x ?? 0, ny = n.y ?? 0;
      const isHov    = n === hov;
      const isAdj    = hov ? adjSet.has(n.id) : false;
      const dimHov   = !!(hov && !isHov && !isAdj);
      const matchQ   = !q || n.title.toLowerCase().includes(q) || n.folder.toLowerCase().includes(q);
      const dimQ     = !matchQ;
      const dim      = dimHov || dimQ;
      const baseAlpha = dim ? 0.1 : 1;
      const r = isHov ? n.radius * 1.15 : n.radius;

      // 글로우 (허브 & 호버)
      ctx.shadowBlur = 0;
      if (!dim && (isHov || n.link_count >= 6)) {
        ctx.shadowColor = n.color;
        ctx.shadowBlur  = isHov ? 16 : 7;
      }

      // 외부 원
      ctx.globalAlpha = baseAlpha;
      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      ctx.fillStyle   = n.color + "22";
      ctx.fill();
      ctx.strokeStyle = n.color;
      ctx.lineWidth   = isHov ? 2 : 1.5;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // 내부 점
      ctx.beginPath();
      ctx.arc(nx, ny, Math.max(2, r * 0.3), 0, Math.PI * 2);
      ctx.fillStyle   = n.color;
      ctx.globalAlpha = dim ? 0.1 : 0.85;
      ctx.fill();

      // 라벨 (호버·인접·허브·줌인 시)
      if (!dim && (isHov || isAdj || (n.link_count >= 8 && k > 0.45) || k > 1.6)) {
        const fs = Math.max(9, 11 / k);
        ctx.font        = `${fs}px system-ui, sans-serif`;
        ctx.textAlign   = "center";
        ctx.globalAlpha = 1;
        const lx = nx, ly = ny - r - 4;
        ctx.strokeStyle = "#0a0f1a";
        ctx.lineWidth   = 3 / k;
        ctx.strokeText(n.title.slice(0, 26), lx, ly);
        ctx.fillStyle   = "#e8edf5";
        ctx.fillText(n.title.slice(0, 26), lx, ly);
      }
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
    ctx.restore();
  }

  // ── 시뮬레이션 & RAF 루프 ─────────────────────────────────────────────────
  function setupSim(nodes: GNode[], links: GLink[]) {
    if (simRef.current) simRef.current.stop();
    cancelAnimationFrame(rafRef.current);

    const c = canvasRef.current!;
    const w = c.width || 800, h = c.height || 600;

    // x/y가 없는 노드만 초기 위치 설정 (필터 토글 시 기존 위치 유지)
    for (const n of nodes) {
      if (n.x === undefined) { n.x = (Math.random() - 0.5) * 1200 + w / 2; }
      if (n.y === undefined) { n.y = (Math.random() - 0.5) * 1200 + h / 2; }
    }

    nodesRef.current = nodes;
    linksRef.current = links;

    const sim = d3.forceSimulation<GNode>(nodes)
      .force("link",
        d3.forceLink<GNode, GLink>(links)
          .id(d => d.id).distance(90).strength(0.5))
      .force("charge",
        d3.forceManyBody<GNode>().strength(-300).distanceMax(300).theta(0.9))
      .force("center",
        d3.forceCenter(w / 2, h / 2).strength(0.04))
      .force("collide",
        d3.forceCollide<GNode>().radius(d => d.radius + 10))
      .alphaDecay(0.025)
      .velocityDecay(0.4);

    // Warmup — 화면에 보이지 않게 미리 수렴
    for (let i = 0; i < WARMUP; i++) sim.tick();

    simRef.current = sim;

    // RAF loop
    function loop() {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  // ── 초기 데이터 로드 ──────────────────────────────────────────────────────
  useEffect(() => {
    const colorMap = new Map<string, string>();
    let ci = 0;
    function color(folder: string) {
      const k = folder || "(root)";
      if (!colorMap.has(k)) { colorMap.set(k, FOLDER_COLORS[ci % FOLDER_COLORS.length]); ci++; }
      return colorMap.get(k)!;
    }

    function waitAndLoad() {
      const wrap = wrapRef.current;
      const c    = canvasRef.current;
      if (!wrap || !c) return;
      const w = wrap.offsetWidth, h = wrap.offsetHeight;
      if (w === 0 || h === 0) { requestAnimationFrame(waitAndLoad); return; }
      c.width = w; c.height = h;

      getGraph()
        .then(data => {
          const degMap = new Map<string, number>();
          for (const e of data.edges) {
            degMap.set(e.source, (degMap.get(e.source) ?? 0) + 1);
            degMap.set(e.target, (degMap.get(e.target) ?? 0) + 1);
          }
          const allNodes: GNode[] = data.nodes.map(n => {
            const lc = degMap.get(n.id) ?? 0;
            return { id: n.id, title: n.title, folder: n.folder,
                     link_count: lc, radius: nodeRadius(lc), color: color(n.folder) };
          });
          const nodeById = new Map(allNodes.map(n => [n.id, n]));
          const allLinks: GLink[] = data.edges
            .map(e => ({ source: nodeById.get(e.source)!, target: nodeById.get(e.target)! }))
            .filter(l => l.source && l.target);

          masterRef.current = { allNodes, allLinks };
          setFolderMap(Array.from(colorMap.entries()));
          setCounts({ n: allNodes.length, e: allLinks.length });
          setLoading(false);
          setupSim(allNodes, allLinks);
        })
        .catch(err => setErrMsg(err.message));
    }
    requestAnimationFrame(waitAndLoad);

    const onResize = () => {
      const wrap = wrapRef.current, c = canvasRef.current;
      if (!wrap || !c) return;
      const w = wrap.offsetWidth, h = wrap.offsetHeight;
      if (w > 0 && h > 0) { c.width = w; c.height = h; }
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      simRef.current?.stop();
      window.removeEventListener("resize", onResize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 고립 노드 필터 ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!masterRef.current || loading) return;
    const { allNodes, allLinks } = masterRef.current;
    let nodes = allNodes, links = allLinks;
    if (!showOrphans) {
      const connected = new Set<string>();
      allLinks.forEach(l => {
        connected.add((l.source as GNode).id);
        connected.add((l.target as GNode).id);
      });
      nodes = nodes.filter(n => connected.has(n.id));
      const ns = new Set(nodes.map(n => n.id));
      links = links.filter(l =>
        ns.has((l.source as GNode).id) && ns.has((l.target as GNode).id));
    }
    setupSim(nodes, links);
  }, [showOrphans, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 검색 ─────────────────────────────────────────────────────────────────
  function onSearchChange(q: string) {
    setSearch(q);
    searchRef.current = q;
  }

  // ── 포인터 이벤트 ─────────────────────────────────────────────────────────
  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    downPosRef.current = { x: e.clientX, y: e.clientY };
    const n = hitTest(e.clientX, e.clientY);
    if (n) {
      dragNodeRef.current = n;
      n.fx = n.x ?? 0; n.fy = n.y ?? 0;
      simRef.current?.alphaTarget(0.3).restart();
    } else {
      panRef.current = { x: e.clientX, y: e.clientY,
                         tx: txRef.current.x, ty: txRef.current.y };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const dn = dragNodeRef.current;
    if (dn) {
      const { wx, wy } = toWorld(e.clientX, e.clientY);
      dn.fx = wx; dn.fy = wy;
    } else if (panRef.current) {
      txRef.current.x = panRef.current.tx + (e.clientX - panRef.current.x);
      txRef.current.y = panRef.current.ty + (e.clientY - panRef.current.y);
    }
    const n = hitTest(e.clientX, e.clientY);
    hovRef.current = n;
    setHovTitle(n?.title ?? null);
    if (canvasRef.current)
      canvasRef.current.style.cursor = (n || dragNodeRef.current) ? "pointer" : "grab";
  }

  function onPointerUp(e: React.PointerEvent) {
    const dn  = dragNodeRef.current;
    const dp  = downPosRef.current;
    const moved = dp && Math.hypot(e.clientX - dp.x, e.clientY - dp.y) > 6;

    if (dn) {
      dn.fx = null; dn.fy = null;
      simRef.current?.alphaTarget(0);
      if (!moved) onNodeClick(dn.id);
      dragNodeRef.current = null;
    }
    panRef.current  = null;
    downPosRef.current = null;
  }

  function onPointerLeave() {
    hovRef.current = null;
    setHovTitle(null);
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const factor = e.deltaY > 0 ? 0.88 : 1.136;
    const t = txRef.current;
    t.x = mx + (t.x - mx) * factor;
    t.y = my + (t.y - my) * factor;
    t.k = Math.max(0.05, Math.min(6, t.k * factor));
  }

  // ── 줌/리셋 버튼 ──────────────────────────────────────────────────────────
  function zoomBy(factor: number) {
    const c = canvasRef.current;
    if (!c) return;
    const cx = c.width / 2, cy = c.height / 2;
    const t = txRef.current;
    t.x = cx + (t.x - cx) * factor;
    t.y = cy + (t.y - cy) * factor;
    t.k = Math.max(0.05, Math.min(6, t.k * factor));
  }

  function resetView() {
    txRef.current = { x: 0, y: 0, k: 1 };
    if (simRef.current) simRef.current.alpha(0.5).restart();
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "#0a0f1a" }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0"
           style={{ background: "rgba(17,24,39,0.9)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold text-slate-100 text-sm shrink-0">그래프 뷰</span>
          {!loading && (
            <span className="text-xs text-slate-400 shrink-0">{counts.n}개 노트 · {counts.e}개 링크</span>
          )}
          {hovTitle && (
            <span className="text-xs bg-slate-700 text-slate-200 rounded-full px-2.5 py-0.5 truncate max-w-[200px]">
              {hovTitle}
            </span>
          )}
        </div>

        {/* 검색 */}
        <div className="relative mx-4 flex-1 max-w-xs hidden sm:block">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          <input
            type="text" value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="노트 이름, 폴더 검색…"
            className="w-full pl-6 pr-3 py-1.5 rounded-lg text-xs outline-none
                       bg-slate-800 border border-slate-600 text-slate-200
                       focus:border-indigo-500 placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => zoomBy(1.3)}  aria-label="확대"   className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"><ZoomIn   size={16}/></button>
          <button onClick={() => zoomBy(0.77)} aria-label="축소"   className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"><ZoomOut  size={16}/></button>
          <button onClick={resetView}          aria-label="초기화" className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"><RotateCcw size={16}/></button>
          <button onClick={onClose}            aria-label="닫기"   className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"><X size={18}/></button>
        </div>
      </div>

      {/* 그래프 */}
      <div ref={wrapRef} className="relative flex-1 overflow-hidden">
        {loading && !errMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <div className="w-10 h-10 rounded-full animate-spin"
                 style={{ border: "3px solid #2a3a5c", borderTopColor: "#6366f1" }}/>
            <p className="text-sm text-slate-400">볼트 스캔 중…</p>
          </div>
        )}
        {errMsg && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-red-400">{errMsg}</div>
        )}

        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ cursor: "grab", touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
          onWheel={onWheel}
        />

        {/* 필터 패널 */}
        {!loading && (
          <div className="absolute top-4 left-4 rounded-xl text-xs z-10"
               style={{ background: "rgba(17,24,39,0.92)", border: "1px solid #2a3a5c" }}>
            <div className="px-4 py-2.5 font-bold text-slate-400 uppercase tracking-widest text-[10px] border-b border-slate-700">
              필터
            </div>
            <label className="flex items-center gap-2 px-4 py-2.5 cursor-pointer text-slate-300 hover:text-white">
              <input type="checkbox" checked={showOrphans}
                     onChange={e => setShowOrphans(e.target.checked)}
                     className="accent-indigo-500 w-3.5 h-3.5"/>
              고립 노드 표시
            </label>
          </div>
        )}

        {/* 범례 */}
        {!loading && folderMap.length > 0 && (
          <div className="absolute bottom-4 left-4 rounded-xl p-3.5 text-xs z-10"
               style={{ background: "rgba(17,24,39,0.92)", border: "1px solid #2a3a5c" }}>
            <div className="uppercase tracking-widest text-[9px] text-slate-500 mb-2 font-bold">폴더</div>
            <div className="flex flex-col gap-1.5">
              {folderMap.map(([folder, color]) => (
                <div key={folder} className="flex items-center gap-2 text-slate-400">
                  <span className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: color + "33", border: `2px solid ${color}` }}/>
                  <span>{folder || "(root)"}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-700 text-[9px] text-slate-600">
              드래그 이동 · 스크롤 확대 · 클릭으로 노트 열기
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
