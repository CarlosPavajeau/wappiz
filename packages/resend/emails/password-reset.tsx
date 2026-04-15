import { Heading, Text } from "@react-email/components"

import { Layout } from "../src/components/layout"

export default function PasswordResetEmail() {
  return (
    <Layout>
      <Heading className="text-semibold text-center font-sans text-3xl">
        Tu contraseña ha sido restablecida
      </Heading>

      <Text>¡Hola!</Text>
      <Text>Tu contraseña ha sido restablecida correctamente.</Text>

      <Text>Si no has solicitado restablecer tu contraseña, avísanos.</Text>
    </Layout>
  )
}
