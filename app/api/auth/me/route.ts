import { NextResponse } from "next/server";
import { getCurrentUser, isFirstUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    // If user is logged in, by definition it's not the first user
    if (user) {
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        isFirstUser: false,
      });
    }

    // Only check isFirstUser when NOT logged in (for login page UI)
    const firstUser = await isFirstUser();
    return NextResponse.json({ user: null, isFirstUser: firstUser });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
