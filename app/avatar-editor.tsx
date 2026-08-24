"use client";

import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AVATAR_OUTPUT_MAX_BYTES,
  validateAvatarSource,
} from "../lib/avatar.js";

const CROP_SIZE = 360;
const PREVIEW_SIZE = 112;
const OUTPUT_SIZE = 512;
const MAX_ZOOM = 3;

type Offset = { x: number; y: number };
type DragState = Offset & { pointerId: number; clientX: number; clientY: number };

type AvatarEditorProps = {
  displayName: string;
  avatarUrl: string | null;
  onAvatarChange: (avatarUrl: string) => void;
  onError: (message: string | null) => void;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function cropBounds(bitmap: ImageBitmap, zoom: number) {
  const minimumScale = Math.max(CROP_SIZE / bitmap.width, CROP_SIZE / bitmap.height);
  const scale = minimumScale * zoom;
  return {
    scale,
    maxOffsetX: Math.max(0, (bitmap.width * scale - CROP_SIZE) / 2),
    maxOffsetY: Math.max(0, (bitmap.height * scale - CROP_SIZE) / 2),
  };
}

function clampOffset(bitmap: ImageBitmap, zoom: number, offset: Offset): Offset {
  const { maxOffsetX, maxOffsetY } = cropBounds(bitmap, zoom);
  return {
    x: clamp(offset.x, -maxOffsetX, maxOffsetX),
    y: clamp(offset.y, -maxOffsetY, maxOffsetY),
  };
}

function drawCrop(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  zoom: number,
  offset: Offset,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const outputScale = canvas.width / CROP_SIZE;
  const { scale } = cropBounds(bitmap, zoom);
  const width = bitmap.width * scale * outputScale;
  const height = bitmap.height * scale * outputScale;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    bitmap,
    (canvas.width - width) / 2 + offset.x * outputScale,
    (canvas.height - height) / 2 + offset.y * outputScale,
    width,
    height,
  );
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("无法生成头像。")),
      "image/webp",
      quality,
    );
  });
}

function AvatarFace({ displayName, avatarUrl }: Pick<AvatarEditorProps, "displayName" | "avatarUrl">) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span className="account-avatar" aria-hidden="true">
      {avatarUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element -- Private avatar responses require the signed-in browser cookie.
        <img
          className="account-avatar-image"
          src={avatarUrl}
          alt=""
          onError={() => setImageFailed(true)}
        />
      ) : (
        displayName.trim().slice(0, 1).toLocaleUpperCase()
      )}
    </span>
  );
}

export function AvatarEditor({
  displayName,
  avatarUrl,
  onAvatarChange,
  onError,
}: AvatarEditorProps) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (!bitmap) return;
    const cropCanvas = cropCanvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (cropCanvas) drawCrop(cropCanvas, bitmap, zoom, offset);
    if (previewCanvas) drawCrop(previewCanvas, bitmap, zoom, offset);
  }, [bitmap, offset, zoom]);

  useEffect(() => {
    return () => bitmap?.close();
  }, [bitmap]);

  const openFilePicker = () => {
    onError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    try {
      validateAvatarSource(file.type, file.size);
      const nextBitmap = await createImageBitmap(file);
      setBitmap(nextBitmap);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setDialogError(null);
      onError(null);
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "无法读取这张图片。";
      setDialogError(message);
      onError(message);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!bitmap || isUploading) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      x: offset.x,
      y: offset.y,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!bitmap || !drag || drag.pointerId !== event.pointerId) return;
    const width = event.currentTarget.getBoundingClientRect().width;
    const canvasPixelsPerCssPixel = width ? CROP_SIZE / width : 1;
    setOffset(clampOffset(bitmap, zoom, {
      x: drag.x + (event.clientX - drag.clientX) * canvasPixelsPerCssPixel,
      y: drag.y + (event.clientY - drag.clientY) * canvasPixelsPerCssPixel,
    }));
  };

  const stopDragging = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const handleCropKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (!bitmap || isUploading) return;
    const movement: Record<string, Offset> = {
      ArrowLeft: { x: -4, y: 0 },
      ArrowRight: { x: 4, y: 0 },
      ArrowUp: { x: 0, y: -4 },
      ArrowDown: { x: 0, y: 4 },
    };
    const delta = movement[event.key];
    if (!delta) return;
    event.preventDefault();
    setOffset((current) => clampOffset(bitmap, zoom, {
      x: current.x + delta.x,
      y: current.y + delta.y,
    }));
  };

  const handleZoomChange = (nextZoom: number) => {
    if (!bitmap) return;
    setZoom(nextZoom);
    setOffset((current) => clampOffset(bitmap, nextZoom, current));
  };

  const closeEditor = () => {
    if (!isUploading) dialogRef.current?.close();
  };

  const handleDialogClose = () => {
    setBitmap(null);
    setDialogError(null);
    setIsUploading(false);
    dragRef.current = null;
    triggerRef.current?.focus();
  };

  const saveAvatar = async () => {
    if (!bitmap || isUploading) return;
    setIsUploading(true);
    setDialogError(null);
    onError(null);

    try {
      const output = document.createElement("canvas");
      output.width = OUTPUT_SIZE;
      output.height = OUTPUT_SIZE;
      drawCrop(output, bitmap, zoom, offset);
      let blob = await canvasToWebp(output, 0.88);
      if (blob.size > AVATAR_OUTPUT_MAX_BYTES) blob = await canvasToWebp(output, 0.78);
      if (blob.type !== "image/webp" || blob.size > AVATAR_OUTPUT_MAX_BYTES) {
        throw new Error("裁剪后的头像超过 1 MB，请缩小后重试。");
      }

      const response = await fetch("/api/auth/avatar", {
        method: "PUT",
        headers: { "content-type": "image/webp" },
        body: blob,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        avatarUrl?: unknown;
        error?: unknown;
      };
      if (!response.ok || typeof payload.avatarUrl !== "string") {
        throw new Error(typeof payload.error === "string" ? payload.error : "上传头像失败，请重试。");
      }

      onAvatarChange(payload.avatarUrl);
      dialogRef.current?.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : "上传头像失败，请重试。";
      setDialogError(message);
      onError(message);
      setIsUploading(false);
    }
  };

  return (
    <>
      <button
        className="account-avatar-button"
        ref={triggerRef}
        type="button"
        aria-label={avatarUrl ? "更换头像" : "上传头像"}
        onClick={openFilePicker}
      >
        <AvatarFace key={avatarUrl ?? "default"} displayName={displayName} avatarUrl={avatarUrl} />
        <span className="account-avatar-edit" aria-hidden="true">✎</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => void handleFileChange(event)}
      />
      <dialog
        className="avatar-crop-dialog"
        ref={dialogRef}
        aria-labelledby="avatar-crop-heading"
        onCancel={(event) => {
          if (isUploading) event.preventDefault();
        }}
        onClose={handleDialogClose}
      >
        <div className="avatar-crop-heading">
          <div>
            <span>个人头像</span>
            <h2 id="avatar-crop-heading">裁剪头像</h2>
          </div>
          <button
            className="dialog-close"
            type="button"
            aria-label="关闭头像裁剪"
            disabled={isUploading}
            onClick={closeEditor}
          >
            ×
          </button>
        </div>
        <div className="avatar-crop-layout">
          <div className="avatar-crop-editor">
            <div className="avatar-crop-area">
              <canvas
                ref={cropCanvasRef}
                width={CROP_SIZE}
                height={CROP_SIZE}
                tabIndex={0}
                aria-label="拖动图片调整头像位置，也可以使用方向键微调"
                onKeyDown={handleCropKeyDown}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={stopDragging}
                onPointerCancel={stopDragging}
                onLostPointerCapture={stopDragging}
              />
              <span className="avatar-crop-mask" aria-hidden="true" />
              <span className="avatar-crop-drag-label" aria-hidden="true">拖动调整位置</span>
            </div>
            <label className="avatar-zoom">
              缩放
              <input
                type="range"
                min="1"
                max={MAX_ZOOM}
                step="0.01"
                value={zoom}
                disabled={!bitmap || isUploading}
                onChange={(event) => handleZoomChange(Number(event.currentTarget.value))}
              />
            </label>
            <small>支持方向键微调，原图不会上传。</small>
          </div>
          <div className="avatar-preview-column">
            <span>头像预览</span>
            <canvas
              className="avatar-preview"
              ref={previewCanvasRef}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              aria-label="圆形头像预览"
            />
            <p>保存后会同步到使用同一账号登录的其他设备。</p>
          </div>
        </div>
        {dialogError ? <p className="avatar-crop-error" role="alert">{dialogError}</p> : null}
        <div className="avatar-crop-actions">
          <button type="button" disabled={isUploading} onClick={openFilePicker}>重新选择</button>
          <span aria-hidden="true" />
          <button type="button" disabled={isUploading} onClick={closeEditor}>取消</button>
          <button
            className="avatar-crop-save"
            type="button"
            disabled={!bitmap || isUploading}
            onClick={() => void saveAvatar()}
          >
            {isUploading ? "保存中…" : "保存头像"}
          </button>
        </div>
      </dialog>
    </>
  );
}
