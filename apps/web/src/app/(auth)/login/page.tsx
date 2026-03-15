import type { Metadata } from "next"

import { LoginForm } from "./_components/login-form"

export const metadata: Metadata = {
  title: "Iniciar sesión — wappiz",
}

export default function LoginPage() {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <LoginForm />
    </div>
  )
}
