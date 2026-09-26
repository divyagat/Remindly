import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
    });

    const response = NextResponse.json({
      user: { id: user._id.toString(), name: user.name, email: user.email },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
