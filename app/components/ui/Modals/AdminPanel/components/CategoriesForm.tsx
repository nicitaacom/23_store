"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FiPlus } from "react-icons/fi"
import { CiEdit } from "react-icons/ci"
import { MdOutlineDelete } from "react-icons/md"
import { twMerge } from "tailwind-merge"

import { TCategory } from "@/ts/categories/TCategory"
import { categoriesSDK } from "@/sdk/CategoriesSDK/CategoriesSDK"
import { isValidCategoryName } from "@/utils/categoryValidation"
import { useCategories } from "@/store/categories/useCategories"
import { useI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function CategoriesForm() {
  const t = useI18n()
  const toast = useToast()
  const { categories, hydrate, addCategory, updateCategory, removeCategory } = useCategories()

  const [isFetching, setIsFetching] = useState(categories.length === 0)
  const [prevCategoriesLength, setPrevCategoriesLength] = useState(categories.length)
  const [addNameValue, setAddNameValue] = useState("")
  const [addParentId, setAddParentId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteCount, setDeleteCount] = useState<number | null>(null)
  const [isSubmittingCategoryChange, setIsSubmittingCategoryChange] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  const parentCategories = categories.filter(category => category.parent_id === null)

  const childrenOf = useCallback(
    (parentId: string) => categories.filter(category => category.parent_id === parentId),
    [categories],
  )

  if (categories.length !== prevCategoriesLength) {
    setPrevCategoriesLength(categories.length)
    if (categories.length > 0) setIsFetching(false)
  }

  useEffect(() => {
    if (categories.length > 0) return
    categoriesSDK.selectDBCategories().then(result => {
      if ("categories" in result) hydrate(result.categories)
      setIsFetching(false)
    })
  }, [categories.length, hydrate])

  const handleAdd = async () => {
    if (!isValidCategoryName(addNameValue)) {
      toast.show("error", t("category.add"), "Name must be 2–255 valid characters.")
      return
    }
    setIsAdding(true)
    const response = await categoriesSDK.insertDBCategory({ name: addNameValue.trim(), parent_id: addParentId })
    setIsAdding(false)
    if ("error" in response) {
      toast.show("error", t("category.add"), response.error)
      return
    }
    addCategory(response.category)
    setAddNameValue("")
    setAddParentId(null)
    toast.show("success", t("category.add"), response.category.name)
  }

  const startEdit = (cat: TCategory) => {
    setEditingId(cat.id)
    setEditNameValue(cat.name)
    setDeletingId(null)
  }

  const saveEdit = async (id: string) => {
    if (!isValidCategoryName(editNameValue)) {
      toast.show("error", t("category.edit_category"), "Name must be 2–255 valid characters.")
      return
    }
    setIsSubmittingCategoryChange(true)
    const response = await categoriesSDK.updateDBCategory({ id, name: editNameValue.trim() })
    setIsSubmittingCategoryChange(false)
    if ("error" in response) {
      toast.show("error", t("category.edit_category"), response.error)
      return
    }
    updateCategory(id, response.category)
    setEditingId(null)
  }

  const startDelete = async (id: string) => {
    setDeletingId(id)
    setDeleteCount(null)
    setEditingId(null)
    const selectDBCategoryCountResp = await categoriesSDK.selectDBCategoryCount(id)
    if ("count" in selectDBCategoryCountResp) setDeleteCount(selectDBCategoryCountResp.count)
  }

  const confirmDelete = async (id: string) => {
    setIsSubmittingCategoryChange(true)
    const response = await categoriesSDK.deleteDBCategory({ id })
    setIsSubmittingCategoryChange(false)
    if ("error" in response) {
      toast.show("error", "", response.error)
      return
    }
    removeCategory(id)
    setDeletingId(null)
    setDeleteCount(null)
  }

  if (isFetching) return <p className="text-sm text-subTitle">Loading...</p>

  return (
    <div className="space-y-4">
      {/* Add new category */}
      <div className="rounded border border-border-color/30 bg-background/60 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-subTitle/70">{t("category.add")}</p>
        <div className="flex flex-col gap-2">
          <input
            className="rounded border border-border-color/50 bg-background/60 px-3 py-1.5 text-sm text-title placeholder:text-subTitle/50 focus:border-border-color focus:outline-none"
            ref={addInputRef}
            placeholder={t("category.name_placeholder")}
            value={addNameValue}
            onChange={e => setAddNameValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            maxLength={255}
          />
          <div className="flex items-center gap-2">
            <select
              className="flex-1 rounded border border-border-color/50 bg-background/60 px-3 py-1.5 text-sm text-title focus:border-border-color focus:outline-none"
              value={addParentId ?? ""}
              onChange={e => setAddParentId(e.target.value || null)}>
              <option value="">Root category (no parent)</option>
              {parentCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              className={twMerge(
                "flex items-center gap-1 rounded border border-success/40 bg-success/10 px-3 py-1.5 text-sm text-success transition-colors duration-150 hover:bg-success/20",
                isAdding && "animate-pulse opacity-60 pointer-events-none",
              )}
              type="button"
              onClick={handleAdd}
              disabled={isAdding}>
              <FiPlus size={14} />
              {isAdding ? "Adding..." : t("category.add")}
            </button>
          </div>
        </div>
      </div>

      {/* Category list */}
      <div className="space-y-2">
        {parentCategories.map(parent => (
          <div className="rounded border border-border-color/20 bg-background/40" key={parent.id}>
            <CategoryRow
              category={parent}
              isEditing={editingId === parent.id}
              editName={editNameValue}
              isDeleting={deletingId === parent.id}
              deleteCount={deletingId === parent.id ? deleteCount : null}
              isSubmittingCategoryChange={isSubmittingCategoryChange}
              onEdit={() => startEdit(parent)}
              onEditNameChange={setEditNameValue}
              onSave={() => saveEdit(parent.id)}
              onCancelEdit={() => setEditingId(null)}
              onDelete={() => startDelete(parent.id)}
              onConfirmDelete={() => confirmDelete(parent.id)}
              onCancelDelete={() => setDeletingId(null)}
              isParent
            />
            {childrenOf(parent.id).map(child => (
              <div className="border-t border-border-color/10 pl-4" key={child.id}>
                <CategoryRow
                  category={child}
                  isEditing={editingId === child.id}
                  editName={editNameValue}
                  isDeleting={deletingId === child.id}
                  deleteCount={deletingId === child.id ? deleteCount : null}
                  isSubmittingCategoryChange={isSubmittingCategoryChange}
                  onEdit={() => startEdit(child)}
                  onEditNameChange={setEditNameValue}
                  onSave={() => saveEdit(child.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => startDelete(child.id)}
                  onConfirmDelete={() => confirmDelete(child.id)}
                  onCancelDelete={() => setDeletingId(null)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

interface CategoryRowProps {
  category: TCategory
  isEditing: boolean
  editName: string
  isDeleting: boolean
  deleteCount: number | null
  isSubmittingCategoryChange: boolean
  onEdit: () => void
  onEditNameChange: (name: string) => void
  onSave: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  isParent?: boolean
}

function CategoryRow({
  category,
  isEditing,
  editName,
  isDeleting,
  deleteCount,
  isSubmittingCategoryChange,
  onEdit,
  onEditNameChange,
  onSave,
  onCancelEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  isParent,
}: CategoryRowProps) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <div className="flex items-center gap-2">
        {isEditing ? (
          <input
            className="flex-1 rounded border border-border-color/50 bg-background/60 px-2 py-1 text-sm text-title focus:border-border-color focus:outline-none"
            value={editName}
            onChange={e => onEditNameChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") onSave()
              if (e.key === "Escape") onCancelEdit()
            }}
            maxLength={255}
            autoFocus
          />
        ) : (
          <span className={twMerge("flex-1 text-sm", isParent ? "font-semibold text-title" : "text-subTitle")}>
            {category.name}
          </span>
        )}

        {isEditing ? (
          <div className="flex gap-1">
            <button
              className={twMerge(
                "rounded border border-success/40 bg-success/10 px-2 py-1 text-xs text-success transition-colors duration-150 hover:bg-success/20",
                isSubmittingCategoryChange && "pointer-events-none opacity-60",
              )}
              type="button"
              onClick={onSave}
              disabled={isSubmittingCategoryChange}>
              {isSubmittingCategoryChange ? "Updating..." : "Save"}
            </button>
            <button
              className="rounded border border-border-color/30 px-2 py-1 text-xs text-subTitle transition-colors duration-150 hover:bg-foreground/10"
              type="button"
              onClick={onCancelEdit}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-1">
            <button
              className="rounded p-1 text-subTitle transition-colors duration-150 hover:bg-foreground/10 hover:text-title"
              type="button"
              onClick={onEdit}
              aria-label="Edit category">
              <CiEdit size={14} />
            </button>
            <button
              className="rounded p-1 text-subTitle transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
              type="button"
              onClick={onDelete}
              aria-label="Delete category">
              <MdOutlineDelete size={14} />
            </button>
          </div>
        )}
      </div>

      {isDeleting && (
        <div className="mt-1 rounded border border-danger/20 bg-danger/5 px-3 py-2">
          {deleteCount === null ? (
            <p className="text-xs text-subTitle">Counting affected products...</p>
          ) : (
            <p className="text-xs text-danger/80">
              {deleteCount > 0
                ? `Deleting this will unassign ${deleteCount} product${deleteCount !== 1 ? "s" : ""}.`
                : "No products are assigned to this category."}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              className={twMerge(
                "rounded border border-danger/40 bg-danger/10 px-2 py-1 text-xs text-danger transition-colors duration-150 hover:bg-danger/20",
                isSubmittingCategoryChange && "pointer-events-none opacity-60",
              )}
              type="button"
              onClick={onConfirmDelete}
              disabled={isSubmittingCategoryChange || deleteCount === null}>
              {isSubmittingCategoryChange ? "Deleting..." : "Confirm delete"}
            </button>
            <button
              className="rounded border border-border-color/30 px-2 py-1 text-xs text-subTitle transition-colors duration-150 hover:bg-foreground/10"
              type="button"
              onClick={onCancelDelete}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
