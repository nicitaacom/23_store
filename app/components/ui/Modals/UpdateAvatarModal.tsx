"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { BiImageAdd, BiLinkExternal, BiRefresh, BiUpload } from "react-icons/bi"
import ImageUploading, { ImageListType } from "react-images-uploading"
import { twMerge } from "tailwind-merge"

import { showToastWarningFn } from "./AdminPanel/functions/showToastWarningFn"
import { Button } from "../Button"
import { Input } from "../Inputs"
import { ModalContainer } from "./ModalContainers"
import { delCookie, setCookie } from "@/utils/helpersCSR"
import { getUserAvatarUrl, sanitizeAvatarUrl } from "@/utils/user"
import { uploadImageFn } from "@/functions/uploadImageFn"
import { useI18n } from "@/locales/client"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"
import { useUpdateAvatarModal } from "@/store/ui/useUpdateAvatarModal"
import useUser from "@/store/user/useUser"
import { AccountSDK } from "@/sdk/AccountSDK/AccountSDK"

const accountSDK = new AccountSDK()

// http://localhost:6006/?path=/story/ui-overlays-application-modals-ctrlkmodal--search
export function UpdateAvatarModal() {
  const router = useRouter()
  const t = useI18n()
  const toast = useToast()
  const { user, setClientAvatarUrl } = useUser()
  const updateAvatarModal = useUpdateAvatarModal()
  const { isLoading, setIsLoading } = useLoading()
  const [avatarUrl, setAvatarUrl] = useState("")
  const [images, setImages] = useState<ImageListType>([])
  const [isPreviewBroken, setIsPreviewBroken] = useState(false)
  const [prevOpenState, setPrevOpenState] = useState({
    isOpen: updateAvatarModal.isOpen,
    avatarUrl: updateAvatarModal.avatarUrl,
  })

  if (updateAvatarModal.isOpen !== prevOpenState.isOpen || updateAvatarModal.avatarUrl !== prevOpenState.avatarUrl) {
    setPrevOpenState({ isOpen: updateAvatarModal.isOpen, avatarUrl: updateAvatarModal.avatarUrl })
    if (updateAvatarModal.isOpen) {
      setAvatarUrl(updateAvatarModal.avatarUrl)
      setImages([])
      setIsPreviewBroken(false)
    }
  }

  const providerAvatarUrl = getUserAvatarUrl(user)
  const localPreviewUrl = images[0]?.data_url || ""
  const previewAvatarUrl = localPreviewUrl || sanitizeAvatarUrl(avatarUrl) || providerAvatarUrl || "/placeholder.jpg"
  const safePreviewAvatarUrl = isPreviewBroken ? "/placeholder.jpg" : previewAvatarUrl

  async function handleImageChange(imageList: ImageListType) {
    setImages(imageList)
    setIsPreviewBroken(false)

    const imageFile = imageList[0]?.file
    if (!imageFile || !user?.id) return

    try {
      setIsLoading(true)

      const fileExtension = imageFile.name.split(".").pop()?.toLowerCase() || "png"
      const avatarFile = new File([imageFile], `avatar.${fileExtension}`, { type: imageFile.type })

      const response = await uploadImageFn({
        t,
        imageFile: avatarFile,
        bucket: "23_avatar-images",
        folder: user.id,
        upsert: true,
      })

      if (typeof response === "string") {
        throw new Error(response)
      }

      setAvatarUrl(response.publicUrl)
    } catch (error) {
      toast.show("error", t("modal.avatar.upload_failed"), error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  async function submitAvatar(nextAvatarUrl: string) {
    try {
      setIsLoading(true)

      const response = await accountSDK.updateAvatarUrl(nextAvatarUrl)

      const resolvedUrl = response.resolvedAvatarUrl ?? ""
      if (resolvedUrl) setCookie("avatarUrl", resolvedUrl)
      else delCookie("avatarUrl")
      setClientAvatarUrl(resolvedUrl)

      updateAvatarModal.closeModal()
      toast.show("success", t("modal.avatar.updated_title"), t("modal.avatar.updated_body"))
      router.refresh()
    } catch (error) {
      toast.show("error", t("modal.avatar.update_failed"), error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ModalContainer
      className="relative w-[92vw] max-w-[520px] overflow-hidden border-none bg-transparent p-0 shadow-none"
      classnameContainer="z-[1001]"
      isOpen={updateAvatarModal.isOpen}
      onClose={updateAvatarModal.closeModal}>
      <div className="rounded-lg border border-border-color/35 bg-foreground/95 shadow-compact">
        <div className="border-b border-border-color/30 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-4 py-4">
          <div className="flex items-center gap-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-border-color/35 bg-background">
              <BiImageAdd className="text-title" size={20} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold text-title">Update avatar</h2>
              <p className="text-sm text-subTitle">Set a custom avatar URL or fall back to your provider avatar.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex flex-col items-center gap-3 rounded border border-border-color/30 bg-background/70 px-4 py-4 shadow-none">
            <Image
              className="h-20 w-20 rounded object-cover shadow-compact"
              alt="avatar preview"
              src={safePreviewAvatarUrl}
              width={512}
              height={512}
              onError={() => setIsPreviewBroken(true)}
            />
            <div className="flex flex-col items-center gap-y-1">
              <p className="text-sm font-medium text-title">Live preview</p>
              <p className="text-center text-xs text-subTitle">
                Leave the field empty to use your provider avatar automatically.
              </p>
            </div>
          </div>

          <ImageUploading
            multiple={false}
            value={images}
            onChange={handleImageChange}
            maxNumber={1}
            dataURLKey="data_url"
            onError={(errors, files) => {
              void showToastWarningFn(t, errors, { maxNumber: 1 }, files)
            }}>
            {({ imageList, onImageUpload, onImageUpdate, onImageRemove, isDragging, dragProps }) => (
              <div className="flex w-full flex-col items-center justify-center gap-3">
                {!imageList.length ? (
                  <Button
                    className={twMerge(
                      "image-upload min-h-[156px] w-full rounded border border-dashed px-4 py-6 text-base",
                      isDragging
                        ? "border-brand bg-brand/10 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
                        : "border-border-color bg-background/30",
                    )}
                    variant="ghost"
                    onClick={onImageUpload}
                    disabled={isLoading}
                    {...dragProps}>
                    <div className="pointer-events-none flex flex-col items-center text-center">
                      <BiUpload className="mb-3 text-title" size={28} />
                      <h1 className="text-lg font-semibold text-title">
                        {isDragging ? "Drop avatar here" : "Click or drop avatar here"}
                      </h1>
                      <p className="mt-2 text-sm text-subTitle">Use drag and drop just like in AdminPanel.</p>
                    </div>
                  </Button>
                ) : null}
                {imageList.map((image, index) => (
                  <div
                    className="flex w-full flex-col gap-3 overflow-hidden rounded border border-border-color/30 bg-background/70 p-3 shadow-none"
                    key={index}>
                    <Image
                      className="aspect-square w-full max-h-[260px] rounded object-cover"
                      src={image.data_url}
                      width={512}
                      height={512}
                      alt="avatar upload"
                    />
                    <div className="flex flex-row items-center justify-end gap-2">
                      <Button size="sm" variant="secondary-outline" onClick={() => onImageUpdate(index)} disabled={isLoading}>
                        Update
                      </Button>
                      <Button
                        size="sm"
                        variant="danger-outline"
                        onClick={() => {
                          onImageRemove(index)
                          setAvatarUrl(updateAvatarModal.avatarUrl || "")
                          setIsPreviewBroken(false)
                        }}
                        disabled={isLoading}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ImageUploading>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-title">Avatar URL</p>
            <Input
              type="url"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              startIcon={<BiLinkExternal size={18} />}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 mobile:grid-cols-2">
            <Button
              variant="secondary-outline"
              fullWidth
              loading={isLoading}
              leftIcon={<BiRefresh size={18} />}
              onClick={() => submitAvatar("")}>
              Use provider avatar
            </Button>
            <Button fullWidth loading={isLoading} onClick={() => submitAvatar(avatarUrl)}>
              Save avatar
            </Button>
          </div>
        </div>
      </div>
    </ModalContainer>
  )
}
