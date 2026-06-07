import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDemoSessionCookie, DEMO_SESSION_COOKIE, isDemoAuthEnabled, upsertDemoUser } from "@/lib/auth-server";

const demoLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    if (!isDemoAuthEnabled()) {
      return NextResponse.json({ message: "Demo login tidak aktif" }, { status: 404 });
    }

    const body = demoLoginSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ message: "Email atau password tidak valid" }, { status: 400 });
    }

    const demoEmail = (process.env.DEMO_USER_EMAIL || "user@courtbook.test").toLowerCase();
    const demoPassword = process.env.DEMO_USER_PASSWORD || "password";
    const email = body.data.email.toLowerCase();

    if (email !== demoEmail || body.data.password !== demoPassword) {
      return NextResponse.json({ message: "Credential demo tidak cocok" }, { status: 401 });
    }

    const user = await upsertDemoUser(email);
    const response = NextResponse.json({ user });
    response.cookies.set(DEMO_SESSION_COOKIE, createDemoSessionCookie(email), {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });
    return response;
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Demo login gagal"
    }, { status: 500 });
  }
}
