import { Text } from "@react-email/components"

type Props = {
  signedBy: string
}

export function Signature({ signedBy }: Props) {
  return (
    <Text className="font-semibold">
      Saludos,
      <br />
      {signedBy}
    </Text>
  )
}
