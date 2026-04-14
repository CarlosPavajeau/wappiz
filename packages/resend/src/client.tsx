import { render } from "@react-email/components"
import { Resend as Client } from "resend"

import PasswordResetEmail from "../emails/password-reset"
import ResetPasswordEmail from "../emails/reset-password"
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

    const html = await render(<WelcomeEmail />)

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

  public async sendResetPasswordEmail(email: string, url: string) {
    const html = await render(<ResetPasswordEmail resetUrl={url} />)

    try {
      const result = await this.client.emails.send({
        to: email,
        from: "Soporte de Wappiz <support@mail.cantte.com>",
        replyTo: this.replyTo,
        subject: "Recuperación de contraseña",
        html,
      })

      if (!result.error) {
        return
      }

      throw result.error
    } catch (error) {
      console.error(
        "Error occurred sending reset password email ",
        JSON.stringify(error)
      )
    }
  }

  public async sendPasswordResetEmail(email: string) {
    const html = await render(<PasswordResetEmail />)

    try {
      const result = await this.client.emails.send({
        to: email,
        from: "Soporte de Wappiz <support@mail.cantte.com>",
        replyTo: this.replyTo,
        subject: "Tu contraseña ha sido restablecida",
        html,
      })

      if (!result.error) {
        return
      }

      throw result.error
    } catch (error) {
      console.error(
        "Error occurred sending password reset email ",
        JSON.stringify(error)
      )
    }
  }
}
