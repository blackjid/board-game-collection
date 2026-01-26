import { NextResponse } from "next/server";
import { getCurrentUser, isFirstUser } from "@/lib/auth";

export async function GET() {
  try {
    const [user, firstUser] = await Promise.all([
      getCurrentUser(),
      isFirstUser(),
    ]);

    if (!user) {
      return NextResponse.json({ user: null, isFirstUser: firstUser });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      isFirstUser: firstUser,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
