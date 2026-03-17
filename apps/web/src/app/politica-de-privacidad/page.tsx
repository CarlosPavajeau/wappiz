import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  description:
    "Conocé cómo wappiz recopila, usa y protege tu información personal.",
  title: "Política de privacidad — wappiz",
}

const LAST_UPDATED = "17 de marzo de 2026"

const Section = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <section className="space-y-3">
    <h2 className="text-base font-semibold tracking-tight">{title}</h2>
    {children}
  </section>
)

export default function PrivacyPage() {
  return (
    <main className="row-span-2 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {/* Header */}
        <div className="mb-10 space-y-2">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Volver al inicio
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Política de privacidad
          </h1>
          <p className="text-sm text-muted-foreground">
            Última actualización: {LAST_UPDATED}
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-foreground/90">
          <Section title="1. Información general">
            <p>
              wappiz (&quot;nosotros&quot;, &quot;nuestro&quot; o &quot;la
              plataforma&quot;) es un servicio de gestión de turnos que permite
              a negocios recibir reservas a través de WhatsApp. Esta Política de
              privacidad describe cómo recopilamos, usamos, almacenamos y
              protegemos la información personal de quienes usan nuestra
              plataforma.
            </p>
            <p>
              Al registrarte y usar wappiz, aceptás los términos descritos en
              este documento. Si no estás de acuerdo con alguna parte, te
              pedimos que no utilices el servicio.
            </p>
          </Section>

          <Section title="2. Información que recopilamos">
            <p>Recopilamos los siguientes tipos de información:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Datos de cuenta:</strong> nombre del negocio, dirección
                de correo electrónico y contraseña (almacenada de forma
                cifrada).
              </li>
              <li>
                <strong>Datos de configuración:</strong> información sobre
                recursos, servicios, horarios y excepciones que vos mismo
                ingresás en la plataforma.
              </li>
              <li>
                <strong>Datos de uso:</strong> registros de acceso, páginas
                visitadas, acciones realizadas y datos técnicos del dispositivo
                (navegador, sistema operativo, dirección IP).
              </li>
              <li>
                <strong>Datos de clientes finales:</strong> en la medida en que
                tu negocio gestione turnos, los datos de contacto de tus
                clientes (nombre y número de WhatsApp) pueden ser procesados a
                través de nuestra plataforma.
              </li>
            </ul>
          </Section>

          <Section title="3. Cómo usamos tu información">
            <p>Utilizamos la información recopilada para:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Proveer, operar y mejorar el servicio.</li>
              <li>
                Gestionar tu cuenta y autenticar tu identidad de forma segura.
              </li>
              <li>
                Enviarte comunicaciones relacionadas con el servicio
                (confirmaciones, alertas de seguridad, actualizaciones).
              </li>
              <li>
                Analizar el uso de la plataforma para mejorar la experiencia.
              </li>
              <li>Cumplir con obligaciones legales y regulatorias.</li>
            </ul>
            <p className="mt-3">
              No vendemos ni alquilamos tu información personal a terceros.
            </p>
          </Section>

          <Section title="4. Integración con WhatsApp">
            <p>
              wappiz se integra con la API de WhatsApp Business para enviar y
              recibir mensajes en nombre de tu negocio. Al usar esta función:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                Los mensajes enviados y recibidos pasan por la infraestructura
                de Meta Platforms, Inc., sujeta a sus propias{" "}
                <a
                  href="https://www.whatsapp.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  políticas de privacidad
                </a>
                .
              </li>
              <li>
                Sos responsable de obtener el consentimiento de tus clientes
                para recibir mensajes a través de WhatsApp.
              </li>
              <li>
                wappiz no almacena el contenido de las conversaciones más allá
                de lo necesario para el funcionamiento del servicio.
              </li>
            </ul>
          </Section>

          <Section title="5. Almacenamiento y seguridad">
            <p>
              Tus datos se almacenan en servidores seguros. Implementamos
              medidas técnicas y organizativas para proteger la información
              contra accesos no autorizados, pérdida o alteración, incluyendo:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Cifrado de contraseñas mediante algoritmos modernos.</li>
              <li>Transmisión de datos a través de conexiones HTTPS/TLS.</li>
              <li>Acceso restringido a los datos según roles y permisos.</li>
            </ul>
            <p className="mt-3">
              Ningún sistema es 100 % seguro. En caso de una brecha de seguridad
              que afecte tus datos, te notificaremos dentro de los plazos
              razonables y exigidos por la normativa aplicable.
            </p>
          </Section>

          <Section title="6. Retención de datos">
            <p>
              Conservamos tu información mientras mantengas una cuenta activa en
              wappiz. Si eliminás tu cuenta, procederemos a borrar o anonimizar
              tus datos personales en un plazo de 30 días, salvo que la ley
              exija conservarlos por un período mayor.
            </p>
          </Section>

          <Section title="7. Tus derechos">
            <p>Tenés derecho a:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong>Acceder</strong> a los datos personales que tenemos
                sobre vos.
              </li>
              <li>
                <strong>Rectificar</strong> información incorrecta o
                desactualizada.
              </li>
              <li>
                <strong>Eliminar</strong> tu cuenta y los datos asociados.
              </li>
              <li>
                <strong>Oponerte</strong> al procesamiento de tus datos para
                fines de análisis o marketing.
              </li>
              <li>
                <strong>Portabilidad:</strong> solicitar una copia de tus datos
                en formato legible.
              </li>
            </ul>
            <p className="mt-3">
              Para ejercer cualquiera de estos derechos, comunicate con nosotros
              a través del correo indicado en la sección de contacto.
            </p>
          </Section>

          <Section title="8. Cookies y tecnologías de seguimiento">
            <p>
              Usamos cookies y tecnologías similares para mantener tu sesión
              iniciada y mejorar la experiencia de uso. No utilizamos cookies de
              publicidad de terceros. Podés configurar tu navegador para
              rechazar cookies, aunque esto puede afectar el funcionamiento de
              algunas partes del servicio.
            </p>
          </Section>

          <Section title="9. Cambios a esta política">
            <p>
              Podemos actualizar esta Política de privacidad periódicamente.
              Cuando realicemos cambios significativos, te lo notificaremos por
              correo electrónico o mediante un aviso destacado en la plataforma
              antes de que los cambios entren en vigencia.
            </p>
          </Section>

          <Section title="10. Contacto">
            <p>
              Si tenés preguntas, inquietudes o solicitudes relacionadas con tu
              privacidad, podés contactarnos en:
            </p>
            <p className="mt-3 font-medium">
              <a
                href="mailto:wappiz@cantte.com"
                className="underline underline-offset-4 hover:text-foreground"
              >
                wappiz@cantte.com
              </a>
            </p>
          </Section>
        </div>

        <div className="mt-12 border-t border-border/40 pt-6 text-sm text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  )
}
