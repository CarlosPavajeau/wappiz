import { render } from "@react-email/components"
import { createElement } from "react"
import { Resend as Client } from "resend"

import WelcomeEmail from "../emails/welcome-email"

type Options = {
  apiKey: string
}

export class Resend {
  public readonly client: Client
  private readonly replyTo = "contact@cantte.com"

  constructor(ops: Options) {
    this.client = new Client(ops.apiKey)
  }

  public async sendWelcomeEmail(email: string) {
    const fiveMinutesFromNow = new Date(
      Date.now() + 5 * 60 * 1000
    ).toISOString()

    const html = await render(createElement(WelcomeEmail))

    try {
      const result = await this.client.emails.send({
        to: email,
        from: "Carlos de Wappiz <carlos@mail.cantte.com>",
        replyTo: this.replyTo,
        subject: "Bienvenido a Wappiz — esto es solo el comienzo",
        html,
        scheduledAt: fiveMinutesFromNow,
      })

      if (!result.error) {
        return
      }

      throw result.error
    } catch (error) {
      console.error(
        "Error occurred sending welcome email ",
        JSON.stringify(error)
      )
    }
  }
}
