import { Calendar01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

const ChatBubble = ({
  side,
  text,
  time,
}: {
  side: "left" | "right"
  text: string
  time: string
}) => {
  const isRight = side === "right"
  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-xl px-3 py-1.5 shadow-sm ${
          isRight
            ? "rounded-tr-sm bg-[#DCF8C6] dark:bg-[#025C4C]"
            : "rounded-tl-sm bg-white dark:bg-[#1F2C34]"
        } text-xs text-foreground`}
      >
        <p>{text}</p>
        <p
          className={`mt-0.5 text-[10px] text-[#667781] dark:text-[#8696A0] ${isRight ? "text-right" : ""}`}
        >
          {time}
        </p>
      </div>
    </div>
  )
}

export function ChatMockup() {
  return (
    <div aria-hidden="true" className="relative flex items-center justify-center">
      <div className="relative w-75 overflow-hidden rounded-xl border-4 border-foreground/10 bg-background shadow-2xl">
        <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]">
            <HugeiconsIcon
              icon={Calendar01Icon}
              size={16}
              strokeWidth={1.5}
              className="text-white"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-white">wappiz</p>
            <p className="text-xs text-[#25D366]">online</p>
          </div>
        </div>

        <section
          aria-label="Ejemplo de conversación de WhatsApp para agendar una cita"
          className="min-h-80 space-y-2 bg-[#ECE5DD] p-3 dark:bg-[#0D1418]"
        >
          <ChatBubble
            side="left"
            text="¡Hola! Quiero sacar cita para un corte 💇"
            time="10:24"
          />
          <ChatBubble
            side="right"
            text="¡Hola! Elegí un horario disponible:"
            time="10:24"
          />
          <div className="flex max-w-[72%] flex-col gap-1.5">
            {["Hoy, 15:00", "Mañana, 10:00", "Jue, 14:30"].map((slot) => (
              <div
                key={slot}
                className="rounded-full border border-[#25D366]/30 bg-white px-3 py-1.5 text-left text-xs text-[#0B8DDD] shadow-sm dark:bg-[#1F2C34]"
              >
                {slot}
              </div>
            ))}
          </div>
          <ChatBubble side="left" text="Hoy, 15:00" time="10:25" />
          <ChatBubble
            side="right"
            text="✅ ¡Cita confirmada! Te esperamos hoy a las 15:00."
            time="10:25"
          />
        </section>
      </div>

    </div>
  )
}
