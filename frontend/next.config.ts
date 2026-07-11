import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 멀티스테이지 빌드에서 node_modules 없이 실행 가능한 산출물 생성
  output: "standalone",
  // 로컬 네이티브 개발(Docker/nginx 없음)에서 /api를 backend로 프록시.
  // 운영(서버)에서는 nginx가 /api를 backend로 직접 라우팅하므로 이 rewrites에 도달하지 않음.
  async rewrites() {
    // Prefer BACKEND_URL; default 127.0.0.1 (not localhost) to avoid IPv6/hangs on Windows.
    const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  // frontend/ 가 앱 루트. 상위 빈 package-lock.json 이 있으면 Next 16 Turbopack이
  // monorepo root를 잘못 잡아 TCP listen 만 하고 HTTP 응답이 안 나오는 행이 재현됨.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
