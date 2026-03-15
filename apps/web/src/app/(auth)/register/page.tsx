import type { Metadata } from "next"

import { RegisterForm } from "./_components/register-form"

export const metadata: Metadata = {
  title: "Crear cuenta — wappiz",
}

export default function RegisterPage() {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <RegisterForm />
    </div>
  )
}
