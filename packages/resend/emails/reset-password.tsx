import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components"

import { Layout } from "../src/components/layout"

type Props = {
  resetUrl: string
}

export default function ResetPasswordEmail({ resetUrl }: Props) {
  return (
    <Layout>
      <Heading className="font-sans text-3xl text-semibold text-center">
        Restablecimiento de contraseña
      </Heading>
      <Text>¡Hola!</Text>
      <Text>
        Hemos recibido una solicitud para restablecer tu contraseña de Wappiz.
      </Text>

      <Section className="text-center py-3">
        <Button
          href={resetUrl}
          className="bg-[#3aca60] text-[#001806] rounded-lg p-3 w-2/3 font-medium"
        >
          Restablecer contraseña
        </Button>
      </Section>

      <Text>Si ignora este mensaje, su contraseña no se modificará.</Text>
      <Text>Si no has solicitado restablecer tu contraseña, avísanos.</Text>

      <Hr />
      <Text className="text-xs">
        Si no aparece el botón de arriba, copia y pega este enlace en la barra
        de direcciones de tu navegador:
      </Text>
      <Link href={resetUrl} className="text-xs text-[#3aca60]">
        {resetUrl}
      </Link>
    </Layout>
  )
}
