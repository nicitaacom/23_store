"use client"

import Image from "next/image"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { twMerge } from "tailwind-merge"

import type { TSortableProductImage } from "@/ts/product/TSortableProductImage"

interface SortableProductImageStripProps {
  activeImageIndex: number
  disabled: boolean
  images: TSortableProductImage[]
  onReorder: (sourceId: string, targetId: string) => void
  onSelect: (imageIndex: number) => void
}

interface SortableProductImageProps {
  disabled: boolean
  image: TSortableProductImage
  imageIndex: number
  isActive: boolean
  onSelect: (imageIndex: number) => void
}

function SortableProductImage({
  disabled,
  image,
  imageIndex,
  isActive,
  onSelect,
}: SortableProductImageProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: image.sortableId,
    disabled,
  })

  return (
    <button
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: "none",
        zIndex: isDragging ? 1 : undefined,
      }}
      className={twMerge(
        "relative h-11 w-[72px] shrink-0 cursor-grab overflow-hidden rounded-xl border-2 border-transparent transition-[border-color,opacity] duration-150 active:cursor-grabbing",
        isActive && "border-success-accent/60",
        isDragging && "opacity-45",
        disabled && "cursor-default opacity-50",
      )}
      ref={setNodeRef}
      type="button"
      aria-label={`Product image ${imageIndex + 1}. Drag to reorder.`}
      onClick={() => onSelect(imageIndex)}
      {...attributes}
      {...listeners}>
      <Image
        className="h-full w-full object-cover"
        src={image.data_url ?? "/placeholder.jpg"}
        alt={`thumb-${imageIndex + 1}`}
        width={120}
        height={80}
        draggable={false}
      />
    </button>
  )
}

// http://localhost:6006/?path=/story/admin-productimageux--sortable-images
export function SortableProductImageStrip({
  activeImageIndex,
  disabled,
  images,
  onReorder,
  onSelect,
}: SortableProductImageStripProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return
    onReorder(String(event.active.id), String(event.over.id))
  }

  return (
    <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={images.map(image => image.sortableId)} strategy={horizontalListSortingStrategy}>
        <div className="flex shrink-0 gap-1.5 overflow-x-auto pb-1">
          {images.map((image, imageIndex) => (
            <SortableProductImage
              disabled={disabled}
              image={image}
              imageIndex={imageIndex}
              isActive={imageIndex === activeImageIndex}
              key={image.sortableId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
