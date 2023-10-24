import { ModalContainer } from "../ModalContainer"
import { Button } from ".."
import { languages } from "@/constant/languages"
import Image from "next/image"

interface NameModalProps {
  label: string
}

export function ChangeLanguageModal({ label }: NameModalProps) {
  return (
    <ModalContainer className="w-full max-w-[450px] py-4" modalQuery="ChangeLanguage">
      {/* ANY CONTENT (to keep consistent keep {label})*/}
      <div className="flex flex-col gap-y-2">
        <h1 className="flex justify-center text-2xl">{label}</h1>
        <ul className="flex flex-col gap-y-2 items-center">
          {languages.map(language => (
            <Button className="flex flex-row gap-x-2" variant="link" href={language.url} key={language.id}>
              {language.label}
              <Image src={language.imageUrl} alt={language.label} width={20} height={10} />
            </Button>
          ))}
        </ul>
      </div>
    </ModalContainer>
  )
}
