import { NextResponse } from "next/server";
import { isFirstUser } from "@/lib/auth";

// Public endpoint to check if this is the first user setup
export async function GET() {
  try {
    const firstUser = await isFirstUser();
    return NextResponse.json({ isFirstUser: firstUser });
  } catch (error) {
    console.error("Check first user error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
