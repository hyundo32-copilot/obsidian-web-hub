const API_BASE = "";
const API_USER = process.env.NEXT_PUBLIC_API_USER ?? "admin";
const API_PASS = process.env.NEXT_PUBLIC_API_PASS ?? "changeme";

function authHeader(): HeadersInit {
  const encoded = btoa(`${API_USER}:${API_PASS}`);
  return {
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeader(), ...init?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export interface NoteResult {
  path: string;
  title: string;
  snippet: string;
  score: number;
  tags: string[];
}

export interface QueryResponse {
  query_id: string;
  results: NoteResult[];
  synthesis: string | null;
}

export interface NoteDetail {
  path: string;
  content: string;
  frontmatter: Record<string, unknown>;
  backlinks: string[];
}

export interface IngestResponse {
  status: string;
  path: string;
}

export interface DelegateResponse {
  hermes_result?: string | null;
}

export function queryVault(query: string, limit = 10, mode = "wikisearch"): Promise<QueryResponse> {
  return apiFetch("/api/query", {
    method: "POST",
    body: JSON.stringify({ query, mode, limit }),
  });
}

export function getNote(path: string): Promise<NoteDetail> {
  return apiFetch(`/api/notes/${path}`);
}

export function ingestNote(
  targetPath: string,
  content: string,
  tags: string[],
  sourceQueryId?: string,
): Promise<IngestResponse> {
  return apiFetch("/api/ingest", {
    method: "POST",
    body: JSON.stringify({
      target_path: targetPath,
      content,
      tags,
      source_query_id: sourceQueryId,
    }),
  });
}

export interface GraphNode {
  id: string;
  title: string;
  folder: string;
}
export interface GraphEdge {
  source: string;
  target: string;
}
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function getGraph(): Promise<GraphData> {
  return apiFetch("/api/graph");
}

export function delegateToHermes(path: string): Promise<DelegateResponse> {
  return apiFetch("/api/ingest/delegate", {
    method: "POST",
    body: JSON.stringify({ path }),
  });
}

export interface RawIngestResponse {
  status: string;
  path: string;
  hermes_result?: string | null;
}

export function ingestRawClipboard(content: string, title?: string): Promise<RawIngestResponse> {
  return apiFetch("/api/ingest/raw", {
    method: "POST",
    body: JSON.stringify({ content, title }),
  });
}
