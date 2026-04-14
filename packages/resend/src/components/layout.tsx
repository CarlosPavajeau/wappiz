import {
  Body,
  Container,
  Head,
  Html,
  Section,
  Tailwind,
  Text,
  Link,
} from "@react-email/components"
import type React from "react"

type Props = {
  children: React.ReactNode
}

export function Layout({ children }: Props) {
  return (
    <Html>
      <Tailwind>
        <Head />
        <Body className="bg-white font-sans text-zinc-800">
          <Container className="container mx-auto p-6">
            <Section className="mx-auto p-6 bg-gray-50">{children}</Section>
            <Section className="container mx-auto p-6 text-center font-semibold">
              <Text>
                Conecta con nosotros en redes sociales!
                <br />
                <Link href="https://www.instagram.com/cantte.co">
                  Instagram
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
