"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FiPlus } from "react-icons/fi"
import { CiEdit } from "react-icons/ci"
import { MdOutlineDelete } from "react-icons/md"
import { twMerge } from "tailwind-merge"

import { TCategory } from "@/ts/categories/TCategory"
import { categoriesSDK } from "@/sdk/CategoriesSDK/CategoriesSDK"
import { useCategoriesStore } from "@/store/categories/useCategoriesStore"
import useToast from "@/store/ui/useToast"
import { useI18n } from "@/locales/client"
import { isValidCategoryName } from "@/utils/categoryValidation"

export function CategoriesForm() {
  const t = useI18n()
  const toast = useToast()
  const { categories, hydrate, addCategory, updateCategory, removeCategory } = useCategoriesStore()

  const [isFetching, setIsFetching] = useState(categories.length === 0)
  const [addName, setAddName] = useState("")
  const [addParentId, setAddParentId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteCount, setDeleteCount] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  const parentCategories = categories.filter(c => c.parent_id === null)

  const childrenOf = useCallback((parentId: string) => categories.filter(c => c.parent_id === parentId), [categories])

  useEffect(() => {
    if (categories.length > 0) {
      setIsFetching(false)
      return
    }
    categoriesSDK.selectDBCategories().then(result => {
      if ("categories" in result) hydrate(result.categories)
      setIsFetching(false)
    })
  }, [categories.length, hydrate])

  const handleAdd = async () => {
    if (!isValidCategoryName(addName)) {
      toast.show("error", t("category.add"), "Name must be 2–255 valid characters.")
      return
    }
    setIsAdding(true)
    const result = await categoriesSDK.insertDBCategory({ name: addName.trim(), parent_id: addParentId })
    setIsAdding(false)
    if ("error" in result) {
      toast.show("error", t("category.add"), result.error)
      return
    }
    addCategory(result.category)
    setAddName("")
    setAddParentId(null)
    toast.show("success", t("category.add"), result.category.name)
  }

  const startEdit = (cat: TCategory) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setDeletingId(null)
  }

  const saveEdit = async (id: string) => {
    if (!isValidCategoryName(editName)) {
      toast.show("error", t("category.edit_category"), "Name must be 2–255 valid characters.")
      return
    }
    setIsSaving(true)
    const result = await categoriesSDK.updateDBCategory({ id, name: editName.trim() })
    setIsSaving(false)
    if ("error" in result) {
      toast.show("error", t("category.edit_category"), result.error)
      return
    }
    updateCategory(id, result.category)
    setEditingId(null)
  }

  const startDelete = async (id: string) => {
    setDeletingId(id)
    setDeleteCount(null)
    setEditingId(null)
    const result = await categoriesSDK.selectDBCategoryCount(id)
    if ("count" in result) setDeleteCount(result.count)
  }

  const confirmDelete = async (id: string) => {
    setIsSaving(true)
    const result = await categoriesSDK.deleteDBCategory({ id })
    setIsSaving(false)
    if ("error" in result) {
      toast.show("error", "", result.error)
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
            ref={addInputRef}
            className="rounded border border-border-color/50 bg-background/60 px-3 py-1.5 text-sm text-title placeholder:text-subTitle/50 focus:border-border-color focus:outline-none"
            placeholder={t("category.name_placeholder")}
            value={addName}
            onChange={e => setAddName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            maxLength={255}
          />
          <div className="flex items-center gap-2">
            <select
              className="flex-1 rounded border border-border-color/50 bg-background/60 px-3 py-1.5 text-sm text-title focus:border-border-color focus:outline-none"
              value={addParentId ?? ""}
              onChange={e => setAddParentId(e.target.value || null)}>
              <option value="">Root category (no parent)</option>
              {parentCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
          <div key={parent.id} className="rounded border border-border-color/20 bg-background/40">
            <CategoryRow
              category={parent}
              isEditing={editingId === parent.id}
              editName={editName}
              isDeleting={deletingId === parent.id}
              deleteCount={deletingId === parent.id ? deleteCount : null}
              isSaving={isSaving}
              onEdit={() => startEdit(parent)}
              onEditNameChange={setEditName}
              onSave={() => saveEdit(parent.id)}
              onCancelEdit={() => setEditingId(null)}
              onDelete={() => startDelete(parent.id)}
              onConfirmDelete={() => confirmDelete(parent.id)}
              onCancelDelete={() => setDeletingId(null)}
              isParent
            />
            {childrenOf(parent.id).map(child => (
              <div key={child.id} className="border-t border-border-color/10 pl-4">
                <CategoryRow
                  category={child}
                  isEditing={editingId === child.id}
                  editName={editName}
                  isDeleting={deletingId === child.id}
                  deleteCount={deletingId === child.id ? deleteCount : null}
                  isSaving={isSaving}
                  onEdit={() => startEdit(child)}
                  onEditNameChange={setEditName}
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
  isSaving: boolean
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
  isSaving,
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
            autoFocus
            className="flex-1 rounded border border-border-color/50 bg-background/60 px-2 py-1 text-sm text-title focus:border-border-color focus:outline-none"
            value={editName}
            onChange={e => onEditNameChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") onSave()
              if (e.key === "Escape") onCancelEdit()
            }}
            maxLength={255}
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
                isSaving && "pointer-events-none opacity-60",
              )}
              type="button"
              onClick={onSave}
              disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
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
                isSaving && "pointer-events-none opacity-60",
              )}
              type="button"
              onClick={onConfirmDelete}
              disabled={isSaving || deleteCount === null}>
              {isSaving ? "Deleting..." : "Confirm delete"}
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
