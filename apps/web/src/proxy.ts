import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function isJwtExpired(token: string): boolean {
  try {
    const [, payload] = token.split(".")
    const decoded = JSON.parse(atob(payload)) as { exp?: number }
    return typeof decoded.exp !== "number" || decoded.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value
  const refreshToken = request.cookies.get("refreshToken")?.value

  if (accessToken && !isJwtExpired(accessToken)) {
    return NextResponse.next()
  }

  if (!refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      body: JSON.stringify({ refreshToken }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })

    if (!response.ok) {
      throw new Error("Refresh failed")
    }

    const tokens = (await response.json()) as {
      accessToken: string
      refreshToken: string
    }

    const nextResponse = NextResponse.next()
    nextResponse.cookies.set("accessToken", tokens.accessToken, {
      sameSite: "lax",
      secure: true,
    })
    nextResponse.cookies.set("refreshToken", tokens.refreshToken, {
      sameSite: "lax",
      secure: true,
    })

    return nextResponse
  } catch {
    const loginUrl = new URL("/login", request.url)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete("accessToken")
    response.cookies.delete("refreshToken")
    return response
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
}
