"use client";

import { useState, useRef } from "react";
import { AlertCircle, X, Upload, Loader2, CheckCircle2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = "idle" | "submitting" | "success" | "error";

export default function ReportProblemButton() {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [ticket, setTicket] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function copyTicket() {
    if (!ticket) return;
    try {
      await navigator.clipboard.writeText(ticket);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard no disponible — silencioso, el ticket sigue visible para copiar a mano.
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3);
    setImages(files);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !descripcion.trim()) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const fd = new FormData();
      fd.append("titulo", titulo.trim());
      fd.append("descripcion", descripcion.trim());
      for (const img of images) {
        fd.append("imagenes", img);
      }

      const res = await fetch("/api/report-problem", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Error desconocido");
      }

      const data = await res.json().catch(() => ({})) as { ticket?: string };
      setTicket(typeof data.ticket === "string" ? data.ticket : null);
      setStatus("success");
      setTitulo("");
      setDescripcion("");
      setImages([]);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Error al enviar");
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items);
    const imageFiles = items
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null && f.size <= 2 * 1024 * 1024);

    if (imageFiles.length === 0) return;

    setImages((prev) => {
      const combined = [...prev, ...imageFiles];
      return combined.slice(0, 3); // max 3
    });
  }

  function handleClose() {
    if (status === "submitting") return;
    setOpen(false);
    setTimeout(() => {
      setStatus("idle");
      setErrorMsg("");
      setTitulo("");
      setDescripcion("");
      setImages([]);
      setTicket(null);
      setCopied(false);
    }, 200);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1.5 rounded-md hover:bg-red-400/10"
        title="Reportar un problema"
      >
        <AlertCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Reportar problema</span>
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="bg-[#141418] border-surface-500 text-white max-w-md"
          onPaste={handlePaste}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Reportar un problema
            </DialogTitle>
          </DialogHeader>

          {status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
              <p className="font-semibold text-white">Reporte enviado</p>
              <p className="text-sm text-gray-400">
                Nuestro equipo técnico lo revisará pronto.
              </p>
              {ticket && (
                <div className="mt-1 w-full rounded-md border border-accent-purple/40 bg-accent-purple/10 px-4 py-3">
                  <p className="text-xs text-gray-400">Tu número de ticket</p>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span className="text-lg font-bold tracking-wide text-white">
                      {ticket}
                    </span>
                    <button
                      type="button"
                      onClick={copyTicket}
                      title="Copiar número de ticket"
                      className="flex items-center gap-1 rounded-md border border-surface-500 px-2 py-1 text-xs text-gray-300 transition-colors hover:text-white hover:border-accent-purple/60"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-400" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">
                    Guárdalo para dar seguimiento con soporte.
                  </p>
                </div>
              )}
              <Button
                onClick={handleClose}
                className="mt-2 bg-surface-600 hover:bg-surface-500 text-white"
              >
                Cerrar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rp-titulo" className="text-sm text-gray-300">
                  Nombre del problema <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="rp-titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: El filtro de fechas no funciona"
                  required
                  maxLength={120}
                  className="bg-surface-700 border-surface-500 text-white placeholder:text-gray-500"
                  disabled={status === "submitting"}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rp-desc" className="text-sm text-gray-300">
                  Descripción <span className="text-red-400">*</span>
                </Label>
                <textarea
                  id="rp-desc"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe qué pasó, en qué sección ocurre, y cómo reproducirlo si puedes."
                  required
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-md bg-surface-700 border border-surface-500 text-white placeholder:text-gray-500 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-accent-purple/60 disabled:opacity-50"
                  disabled={status === "submitting"}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm text-gray-300">
                  Capturas de pantalla{" "}
                  <span className="text-gray-500">(opcional, máx 3)</span>
                </Label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={status === "submitting" || images.length >= 3}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-dashed border-surface-500 rounded-md px-3 py-2 transition-colors hover:border-accent-purple/60 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  {images.length === 0
                    ? "Subir imágenes"
                    : `${images.length} imagen${images.length > 1 ? "es" : ""} seleccionada${images.length > 1 ? "s" : ""}`}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-gray-500">
                  También puedes pegar imágenes con Ctrl+V / ⌘+V
                </p>
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative group w-16 h-16 rounded-md overflow-hidden border border-surface-500"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={URL.createObjectURL(img)}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {status === "error" && (
                <p className="text-sm text-red-400 bg-red-400/10 rounded-md px-3 py-2">
                  {errorMsg}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={status === "submitting"}
                  className="text-gray-400 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    status === "submitting" || !titulo.trim() || !descripcion.trim()
                  }
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    "Enviar reporte"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
