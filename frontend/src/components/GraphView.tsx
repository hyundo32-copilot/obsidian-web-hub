"use client";

import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Loader2 } from "lucide-react";
import { getGraph, GraphData } from "@/lib/api";

interface SimNode {
  id: string; title: string; folder: string; deg: number; iso: boolean;
  x: number; y: number; vx: number; vy: number; fx: number; fy: number;
}
interface SimEdge { source: SimNode; target: SimNode }
interface Transform { x: number; y: number; scale: number }
interface Props { onNodeClick: (path: string) => void; onClose: () => void }

// 물리 상수 — 791노드/3399엣지 실데이터로 연결성분 전용 오프라인 스윕하여 확정.
// 고립(링크 없는) 노드는 물리에서 분리해 코어 둘레 링으로 배치하므로
// 반발력/스프링/중력은 연결 노드에만 적용된다(과거 235엣지 기준값은 14배 밀도에서 붕괴).
const REPULSION   = 4000;
const SPRING_LEN  = 180;
const SPRING_K    = 0.02;
const DAMPING     = 0.90;
const CENTER_G    = 0.08;
const NODE_R      = 4;
const MIN_D2      = 100;    // 반발력 거리² 하한 (10px) — 근접 노드의 무한대 힘 차단
const MAX_V       = 40;     // 프레임당 최대 이동 속도 — 폭발 방지 안전장치
const ALPHA_DECAY = 0.99;   // 쿨링 계수 — 알파→0 으로 시뮬레이션 수렴 보장
const ALPHA_MIN   = 0.002;  // 이 이하면 시뮬레이션 정지
const RING_FACTOR = 1.12;   // 고립 노드 링 반경 = 연결 코어 90퍼센타일 반경 × 이 값
const FIT_PCT     = 0.97;   // fitView 기준 퍼센타일(극단 꼬리 노드가 화면을 축소시키지 않게)
const WARMUP      = 45;     // 진입 시 무음 사전 반복 횟수(초기 폭발적 재배치 숨김)
const CAM_LERP    = 0.14;   // 카메라 스무딩 계수(fitView 타깃으로 점진 이동 → 촐랑댐 제거)

// 차수 기반 노드 반경 — Obsidian처럼 허브가 크게 보이도록
function nodeRadius(deg: number) {
  return NODE_R + Math.min(9, Math.sqrt(deg) * 1.1);
}

const FOLDER_COLORS: [string, string][] = [
  ["wiki","#8b5cf6"],["raw","#f59e0b"],["inbox","#10b981"],
  ["daily","#3b82f6"],["sources","#ec4899"],
];
function nodeColor(folder: string, dimmed: boolean, dark: boolean) {
  if (dimmed) return dark ? "rgba(148,163,184,0.15)" : "rgba(100,116,139,0.10)";
  for (const [k, v] of FOLDER_COLORS) if (folder.toLowerCase().includes(k)) return v;
  return dark ? "#94a3b8" : "#64748b";
}

export default function GraphView({ onNodeClick, onClose }: Props) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef  = useRef<SimNode[]>([]);
  const connNodesRef = useRef<SimNode[]>([]);  // 물리 대상(링크 있는 노드)
  const isoNodesRef  = useRef<SimNode[]>([]);  // 링 배치 대상(링크 없는 노드)
  const edgesRef  = useRef<SimEdge[]>([]);
  const txRef     = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const fitTargetRef = useRef<Transform | null>(null);  // 카메라 스무딩 타깃
  const snapRef   = useRef(true);    // 다음 fit은 즉시 스냅(첫 진입/리셋)
  const rafRef    = useRef(0);
  const alphaRef  = useRef(1);       // 쿨링 알파 (1→0)
  const autoFitRef = useRef(true);   // 사용자가 조작하기 전까지 자동 맞춤
  const hovRef    = useRef<SimNode | null>(null);
  const connRef   = useRef<Set<string>>(new Set());
  const panRef    = useRef<{ x: number; y: number } | null>(null);
  const wasMoved  = useRef(false);

  const [loading, setLoading] = useState(true);
  const [errMsg,  setErrMsg]  = useState<string | null>(null);
  const [hovTitle, setHovTitle] = useState<string | null>(null);
  const [counts,  setCounts]  = useState({ n: 0, e: 0 });

  // ── 그리기 ──────────────────────────────────────────────────────────────
  function draw() {
    const c = canvasRef.current;
    if (!c || c.width === 0 || c.height === 0) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dark = document.documentElement.classList.contains("dark");
    const { x: dx, y: dy, scale } = txRef.current;
    const W = c.width, H = c.height;
    const hovNode = hovRef.current;
    const connSet = connRef.current;

    ctx.clearRect(0, 0, W, H);

    ctx.lineWidth   = 0.8;
    ctx.strokeStyle = dark ? "rgba(148,163,184,0.22)" : "rgba(100,116,139,0.18)";
    for (const e of edgesRef.current) {
      ctx.beginPath();
      ctx.moveTo(e.source.x * scale + dx, e.source.y * scale + dy);
      ctx.lineTo(e.target.x * scale + dx, e.target.y * scale + dy);
      ctx.stroke();
    }

    for (const n of nodesRef.current) {
      const sx = n.x * scale + dx;
      const sy = n.y * scale + dy;
      if (sx < -20 || sy < -20 || sx > W + 20 || sy > H + 20) continue;
      const isHov  = n === hovNode;
      const isConn = connSet.has(n.id);
      const dimmed = !!hovNode && !isHov && !isConn;
      const base   = nodeRadius(n.deg);
      const r      = isHov ? base * 1.8 : base;

      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor(n.folder, dimmed, dark);
      ctx.fill();

      if (isHov || (isConn && scale > 0.6) || (n.deg >= 12 && scale > 0.5) || scale > 1.8) {
        ctx.font      = "10px sans-serif";
        ctx.fillStyle = dark ? "#e2e8f0" : "#1e293b";
        ctx.textAlign = "center";
        ctx.fillText(n.title.slice(0, 22), sx, sy - r - 3);
      }
    }
  }

  // ── 물리 ────────────────────────────────────────────────────────────────
  // 좌표는 월드 공간(뷰포트 무관). 연결 노드에만 반발/스프링/중력 적용.
  // 고립 노드는 simulate 후 placeIsolated()로 코어 둘레 링에 배치.
  function simulate() {
    const nodes = connNodesRef.current;
    const alpha = alphaRef.current;
    const N = nodes.length;

    // 힘 누적 초기화 + 중력 + 반발력 (연결 노드끼리만, O(연결²))
    for (let i = 0; i < N; i++) {
      const n = nodes[i];
      let fx = -n.x * CENTER_G;
      let fy = -n.y * CENTER_G;
      for (let j = 0; j < N; j++) {
        if (j === i) continue;
        const m = nodes[j];
        let ddx = n.x - m.x, ddy = n.y - m.y;
        let d2  = ddx * ddx + ddy * ddy;
        if (d2 < 0.01) {                       // 완전 겹침 → 무작위 분리
          ddx = Math.random() - 0.5;
          ddy = Math.random() - 0.5;
          d2  = 0.01;
        }
        const inv = REPULSION / (d2 < MIN_D2 ? MIN_D2 : d2);
        fx += ddx * inv;
        fy += ddy * inv;
      }
      n.fx = fx; n.fy = fy;
    }

    // 스프링(엣지) 인력 — 양끝에 대칭 적용
    for (const e of edgesRef.current) {
      const s = e.source, t = e.target;
      const ddx = t.x - s.x, ddy = t.y - s.y;
      const d   = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      const fxs = ddx * SPRING_K * (d - SPRING_LEN);
      const fys = ddy * SPRING_K * (d - SPRING_LEN);
      s.fx += fxs; s.fy += fys;
      t.fx -= fxs; t.fy -= fys;
    }

    // 적분 — 관성(이전 속도) 유지 + 힘에 알파(쿨링)를 곱해 점진 정지
    for (let i = 0; i < N; i++) {
      const n = nodes[i];
      let vx = (n.vx + n.fx * alpha) * DAMPING;
      let vy = (n.vy + n.fy * alpha) * DAMPING;
      if (vx >  MAX_V) vx =  MAX_V; else if (vx < -MAX_V) vx = -MAX_V;
      if (vy >  MAX_V) vy =  MAX_V; else if (vy < -MAX_V) vy = -MAX_V;
      n.vx = vx; n.vy = vy;
      n.x += vx; n.y += vy;
    }
    alphaRef.current = alpha * ALPHA_DECAY;
  }

  // 고립 노드를 연결 코어 둘레 링에 균등 배치 (Obsidian 외곽 점 모양)
  function placeIsolated() {
    const conn = connNodesRef.current;
    const iso  = isoNodesRef.current;
    if (iso.length === 0) return;
    let cx = 0, cy = 0;
    if (conn.length) {
      for (const n of conn) { cx += n.x; cy += n.y; }
      cx /= conn.length; cy /= conn.length;
    }
    // 연결 코어의 90퍼센타일 반경
    let radius = 200;
    if (conn.length) {
      const rs = conn.map(n => Math.hypot(n.x - cx, n.y - cy)).sort((a, b) => a - b);
      radius = rs[Math.min(rs.length - 1, Math.floor(rs.length * 0.9))] * RING_FACTOR;
    }
    const ang0 = -Math.PI / 2;  // 12시 방향부터
    for (let i = 0; i < iso.length; i++) {
      const a = ang0 + (i / iso.length) * Math.PI * 2;
      iso[i].x = cx + Math.cos(a) * radius;
      iso[i].y = cy + Math.sin(a) * radius;
    }
  }

  // 줌/팬 타깃 계산 — median 중심 + 퍼센타일 반경 원형 맞춤(소수의 극단 꼬리 노드가
  // 화면을 과도하게 축소시키지 않도록). 실제 적용은 applyCamera에서 스무딩.
  function fitView() {
    const c = canvasRef.current;
    const nodes = nodesRef.current;
    if (!c || nodes.length === 0) return;
    // 중심: 좌표 중앙값(꼬리에 강건)
    const xs = nodes.map(n => n.x).sort((a, b) => a - b);
    const ys = nodes.map(n => n.y).sort((a, b) => a - b);
    const cx = xs[xs.length >> 1];
    const cy = ys[ys.length >> 1];
    // 반경: 중심으로부터 거리의 FIT_PCT 퍼센타일
    const rs = nodes.map(n => Math.hypot(n.x - cx, n.y - cy)).sort((a, b) => a - b);
    const fitR = Math.max(rs[Math.min(rs.length - 1, Math.floor(rs.length * FIT_PCT))], 1);
    const margin = 0.92;  // 반경이 화면 반치수의 이 비율을 채움
    const scale = Math.max(0.05, Math.min(2,
      (Math.min(c.width, c.height) / 2 * margin) / fitR));
    fitTargetRef.current = {
      scale,
      x: c.width  / 2 - cx * scale,
      y: c.height / 2 - cy * scale,
    };
  }

  // 카메라를 타깃으로 스무딩 이동(첫 진입/리셋은 즉시 스냅) → 안정화 중 줌 요동 제거
  function applyCamera() {
    const target = fitTargetRef.current;
    if (!target) return;
    if (snapRef.current) {
      txRef.current = { ...target };
      snapRef.current = false;
      return;
    }
    const t = txRef.current;
    t.x     += (target.x     - t.x)     * CAM_LERP;
    t.y     += (target.y     - t.y)     * CAM_LERP;
    t.scale += (target.scale - t.scale) * CAM_LERP;
  }

  // ── 초기화 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let running = true;

    // 리사이즈 핸들러 — 유효 크기일 때만 캔버스 리셋
    function onResize() {
      const wrap = wrapRef.current;
      const c    = canvasRef.current;
      if (!wrap || !c) return;
      const w = wrap.offsetWidth, h = wrap.offsetHeight;
      if (w > 0 && h > 0) { c.width = w; c.height = h; }
    }
    window.addEventListener("resize", onResize);

    // 컨테이너 크기가 유효해질 때까지 RAF로 재시도 후 시작
    function waitAndStart() {
      const wrap = wrapRef.current;
      const c    = canvasRef.current;
      if (!running || !wrap || !c) return;

      const w = wrap.offsetWidth;
      const h = wrap.offsetHeight;

      if (w === 0 || h === 0) {
        requestAnimationFrame(waitAndStart);
        return;
      }

      // 캔버스 해상도를 컨테이너 크기로 설정
      c.width  = w;
      c.height = h;

      // 그래프 데이터 로드 → 노드 초기화 → 애니메이션 루프
      getGraph()
        .then((data: GraphData) => {
          if (!running) return;

          // 차수 계산 → 연결/고립 분리
          const degMap = new Map<string, number>();
          for (const e of data.edges) {
            degMap.set(e.source, (degMap.get(e.source) ?? 0) + 1);
            degMap.set(e.target, (degMap.get(e.target) ?? 0) + 1);
          }

          // 월드 좌표는 원점(0,0) 중심. 초기엔 원점 주변에 무작위 분산.
          const spread = 1500;
          const nodeMap = new Map<string, SimNode>();
          for (const n of data.nodes) {
            const deg = degMap.get(n.id) ?? 0;
            nodeMap.set(n.id, {
              ...n, deg, iso: deg === 0,
              x: (Math.random() - 0.5) * spread,
              y: (Math.random() - 0.5) * spread,
              vx: 0, vy: 0, fx: 0, fy: 0,
            });
          }
          nodesRef.current = Array.from(nodeMap.values());
          connNodesRef.current = nodesRef.current.filter(n => !n.iso);
          isoNodesRef.current  = nodesRef.current.filter(n => n.iso);
          edgesRef.current = data.edges
            .map(e => ({ source: nodeMap.get(e.source)!, target: nodeMap.get(e.target)! }))
            .filter(e => e.source && e.target);

          alphaRef.current  = 1;
          autoFitRef.current = true;
          snapRef.current    = true;

          // 워밍업 — 초기 폭발적 재배치를 화면에 보이지 않게 미리 진행
          for (let i = 0; i < WARMUP && alphaRef.current > ALPHA_MIN; i++) simulate();
          placeIsolated();

          setCounts({ n: nodesRef.current.length, e: edgesRef.current.length });
          setLoading(false);

          if (!running) return;

          function loop() {
            if (!running) return;
            const cv = canvasRef.current;
            if (cv && cv.width > 0) {
              if (alphaRef.current > ALPHA_MIN) { simulate(); placeIsolated(); }
              if (autoFitRef.current) { fitView(); applyCamera(); }  // 타깃 계산 + 스무딩
              draw();
            }
            rafRef.current = requestAnimationFrame(loop);
          }
          rafRef.current = requestAnimationFrame(loop);
        })
        .catch(() => {
          if (running) setErrMsg("그래프를 불러올 수 없습니다.");
        });
    }

    requestAnimationFrame(waitAndStart);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 줌/리셋 ────────────────────────────────────────────────────────────
  function zoomBy(factor: number) {
    const c = canvasRef.current;
    if (!c) return;
    autoFitRef.current = false;   // 수동 줌 → 자동 맞춤 해제
    const cx = c.width / 2, cy = c.height / 2;
    const t = txRef.current;
    t.x = cx + (t.x - cx) * factor;
    t.y = cy + (t.y - cy) * factor;
    t.scale = Math.max(0.05, Math.min(6, t.scale * factor));
  }

  // 레이아웃 재계산 + 화면 맞춤 복원
  function resetView() {
    const spread = 1500;
    for (const n of connNodesRef.current) {
      n.x = (Math.random() - 0.5) * spread;
      n.y = (Math.random() - 0.5) * spread;
      n.vx = 0; n.vy = 0; n.fx = 0; n.fy = 0;
    }
    alphaRef.current   = 1;
    autoFitRef.current = true;
    snapRef.current    = true;
    for (let i = 0; i < WARMUP && alphaRef.current > ALPHA_MIN; i++) simulate();
    placeIsolated();
  }

  // ── 포인터 ──────────────────────────────────────────────────────────────
  function toWorld(ex: number, ey: number) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const { x, y, scale } = txRef.current;
    return { wx: (ex - r.left - x) / scale, wy: (ey - r.top - y) / scale };
  }

  function nodeAt(ex: number, ey: number) {
    const { wx, wy } = toWorld(ex, ey);
    // 화면상 최소 14px의 클릭 허용 반경 보장 (줌아웃 시에도 노드 선택 가능)
    const scale = txRef.current.scale || 1;
    let best: SimNode | null = null;
    let bestD = Math.max(NODE_R * 2, 14 / scale);
    for (const n of nodesRef.current) {
      const d = Math.hypot(n.x - wx, n.y - wy);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  function onPointerDown(e: React.PointerEvent) {
    wasMoved.current = false;
    panRef.current   = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (panRef.current) {
      const dx = e.clientX - panRef.current.x;
      const dy = e.clientY - panRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) { wasMoved.current = true; autoFitRef.current = false; }
      txRef.current.x += dx;
      txRef.current.y += dy;
      panRef.current = { x: e.clientX, y: e.clientY };
    }
    const n = nodeAt(e.clientX, e.clientY);
    hovRef.current  = n;
    connRef.current = n
      ? new Set(edgesRef.current
          .filter(e => e.source.id === n.id || e.target.id === n.id)
          .flatMap(e => [e.source.id, e.target.id]))
      : new Set();
    setHovTitle(n?.title ?? null);
    if (canvasRef.current) canvasRef.current.style.cursor = n ? "pointer" : "grab";
  }

  function onPointerUp(e: React.PointerEvent) {
    const moved = wasMoved.current;
    panRef.current   = null;
    wasMoved.current = false;
    if (!moved) {
      const n = nodeAt(e.clientX, e.clientY);
      if (n) onNodeClick(n.id);
    }
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    autoFitRef.current = false;   // 수동 줌 → 자동 맞춤 해제
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const factor = e.deltaY > 0 ? 0.88 : 1.136;
    const t = txRef.current;
    t.x = mx + (t.x - mx) * factor;
    t.y = my + (t.y - my) * factor;
    t.scale = Math.max(0.05, Math.min(6, t.scale * factor));
  }

  // ── 렌더 ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-100 dark:bg-slate-950">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm shrink-0">그래프 뷰</span>
          {!loading && (
            <span className="text-xs text-slate-400 shrink-0">{counts.n}개 노트 · {counts.e}개 링크</span>
          )}
          {hovTitle && (
            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full px-2.5 py-0.5 truncate max-w-[200px]">
              {hovTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => zoomBy(1.35)} aria-label="확대"   className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><ZoomIn   size={16}/></button>
          <button onClick={() => zoomBy(0.74)} aria-label="축소"   className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><ZoomOut  size={16}/></button>
          <button onClick={resetView}          aria-label="초기화" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><RotateCcw size={16}/></button>
          <button onClick={onClose}            aria-label="닫기"   className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><X size={18}/></button>
        </div>
      </div>

      {/* 캔버스 영역 */}
      <div ref={wrapRef} className="relative flex-1 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <Loader2 size={28} className="animate-spin text-slate-400"/>
            <p className="text-sm text-slate-400">볼트 스캔 중…</p>
          </div>
        )}
        {errMsg && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500">{errMsg}</div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ cursor: "grab", touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => { hovRef.current = null; connRef.current = new Set(); setHovTitle(null); }}
          onWheel={onWheel}
        />
      </div>

      {/* 범례 */}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5 pointer-events-none">
        {FOLDER_COLORS.map(([k, v]) => (
          <span key={k} className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 bg-white/85 dark:bg-slate-800/85 rounded-full px-2 py-0.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: v }}/>{k}
          </span>
        ))}
      </div>
      <div className="absolute bottom-4 right-4 text-xs text-slate-400 dark:text-slate-500 hidden sm:block pointer-events-none">
        드래그 이동 · 스크롤 확대 · 노드 클릭으로 노트 열기
      </div>
    </div>
  );
}
