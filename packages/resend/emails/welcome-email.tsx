import { Text, Heading, Section, Button, Hr } from "@react-email/components"

import { Layout } from "../src/components/layout"
import { Signature } from "../src/components/signature"

export default function WelcomeEmail() {
  return (
    <Layout>
      <Heading className="text-center font-sans text-3xl font-semibold">
        Bienvenido a Wappiz!
      </Heading>
      <Text>¡Hola!</Text>
      <Text>Soy Carlos, la persona que construyó Wappiz.</Text>
      <Text>
        Me alegra mucho que estés aquí. Sé que tu tiempo vale, así que voy al
        grano: creé Wappiz porque vi de cerca cómo los dueños de barberías,
        salones y consultorios perdían citas todos los días por algo que no
        debería ser tan complicado.
      </Text>

      <Section>
        <Text className="font-semibold">En los próximos minutos puedes:</Text>
        <ul className="pb-4 text-sm">
          <li className="pt-4">Agregar tus servicios y horarios</li>
          <li className="pt-4">Obtener tu número de WhatsApp</li>
          <li className="pt-4">Recibir tu primera cita automática</li>
        </ul>
      </Section>

      <Section className="py-3 text-center">
        <Button
          href="https://wappiz.cantte.com/dashboard"
          className="w-2/3 rounded-lg bg-[#3aca60] p-3 font-medium text-[#001806]"
        >
          Ir al panel de control
        </Button>
      </Section>

      <Hr />
      <Text>Bienvenido al equipo.</Text>

      <Signature signedBy="Carlos" />
      <Text className="text-xs">
        P.S. - Si en algún momento tenés una duda, una sugerencia, o simplemente
        querés contarme cómo te está yendo, respondé este email. Lo leo
        personalmente.
      </Text>
    </Layout>
  )
}
