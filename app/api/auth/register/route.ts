import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, createSessionToken } from "@/lib/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const user = await User.create({ name, email, password });

    const token = await createSessionToken({
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
    });

    const response = NextResponse.json(
      { user: { id: user._id.toString(), name: user.name, email: user.email } },
      { status: 201 },
    );

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
