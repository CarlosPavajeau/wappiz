import * as Sentry from "@sentry/tanstackstart-react"

Sentry.init({
  dsn: "https://50a1ab369669e9a78b9d7647a820377c@o4503956764950528.ingest.us.sentry.io/4511237383585792",

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,

  tracesSampleRate: 0.25,
  enableLogs: true,
})
