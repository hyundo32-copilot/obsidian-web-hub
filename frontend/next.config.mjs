/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/query",
        destination: "http://127.0.0.1:8000/api/query",
      },
      {
        source: "/api/notes/:path*",
        destination: "http://127.0.0.1:8000/api/notes/:path*",
      },
      {
        source: "/api/ingest/:path*",
        destination: "http://127.0.0.1:8000/api/ingest/:path*",
      },
      {
        source: "/api/share",
        destination: "http://127.0.0.1:8000/api/share",
      },
      {
        source: "/api/graph",
        destination: "http://127.0.0.1:8000/api/graph",
      },
    ];
  },
};

export default nextConfig;
