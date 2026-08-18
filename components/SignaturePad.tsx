'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SignaturePad({
  contexto,
  socioId,
  referenciaId,
  firmanteNombreDefault,
  onSigned,
}: {
  contexto: string;
  socioId?: string | null;
  referenciaId?: string | null;
  firmanteNombreDefault?: string;
  onSigned?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [nombre, setNombre] = useState(firmanteNombreDefault ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1F4E2C';
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSaved(false);
  }

  async function guardar() {
    setErrorMsg('');
    if (!nombre.trim()) {
      setErrorMsg('Ingresa el nombre de quien firma.');
      return;
    }
    setSaving(true);
    try {
      const canvas = canvasRef.current!;
      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b as Blob), 'image/png')
      );
      const supabase = createClient();
      const path = `${contexto}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      const { error: uploadError } = await supabase.storage.from('firmas').upload(path, blob, {
        contentType: 'image/png',
      });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('firmas').insert({
        contexto,
        referencia_id: referenciaId ?? null,
        socio_id: socioId ?? null,
        firmante_nombre: nombre.trim(),
        storage_path: path,
      });
      if (insertError) throw insertError;

      setSaved(true);
      onSigned?.();
    } catch (err: any) {
      setErrorMsg(err.message ?? 'No se pudo guardar la firma.');
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <p className="text-sm text-brand bg-brand-pale rounded px-3 py-2">
        Firma guardada correctamente para "{contexto}".
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Nombre de quien firma</label>
        <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div>
        <label className="label">Firma (dibuja con el mouse o el dedo)</label>
        <canvas
          ref={canvasRef}
          width={480}
          height={160}
          className="border border-neutral-300 rounded-md bg-white touch-none w-full max-w-md"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={clear}>
          Limpiar
        </button>
        <button type="button" className="btn-primary" onClick={guardar} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar firma'}
        </button>
      </div>
      <p className="text-xs text-neutral-400">
        Esta es una firma simple en pantalla para control interno (Manual Interno), no reemplaza una
        Firma Electrónica Avanzada con validez legal plena.
      </p>
    </div>
  );
}
