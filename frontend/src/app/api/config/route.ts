import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Next.js 개발/운영 환경에서 루트 디렉토리(process.cwd()) 기준 ../config/settings.json을 찾습니다.
    const configPath = path.resolve(process.cwd(), "../config/settings.json");
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(fileContent);
      return NextResponse.json({
        site_title: config.site_title || "옵시디언 웹 허브",
      });
    }
  } catch (error) {
    console.error("Failed to read settings.json in API route:", error);
  }
  
  // 파일이 없거나 에러 발생 시 기본값 반환
  return NextResponse.json({ site_title: "옵시디언 웹 허브" });
}
