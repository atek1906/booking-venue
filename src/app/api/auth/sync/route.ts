import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Login diperlukan" }, { status: 401 });
  }
}
