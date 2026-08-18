'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const TIPOS: { value: string; label: string }[] = [
  { value: 'cedula_identidad', label: 'Fotocopia de cédula de identidad' },
  { value: 'certificado_antecedentes', label: 'Certificado de Antecedentes' },
  { value: 'receta_medica', label: 'Receta médica' },
  { value: 'ficha_perfil_fs001', label: 'Ficha de Perfil y Consumo (FS-001) firmada' },
  { value: 'declaracion_coherencia_dc001', label: 'Declaración de Coherencia (DC-001) firmada' },
  { value: 'contrato_adhesion_ctr001', label: 'Contrato de Adhesión (CTR-001) firmado' },
  { value: 'anexo_marco_legal_anxml001', label: 'Anexo Marco Legal (ANX-ML-001) firmado' },
  { value: 'declaracion_jurada_dj001', label: 'Declaración Jurada (DJ-001) firmada' },
  { value: 'solicitud_ingreso_sol001', label: 'Solicitud Formal de Ingreso (SOL-001)' },
  { value: 'otro', label: 'Otro documento' },
];

export default function FileUpload({ socioId, onUploaded }: { socioId: string; onUploaded?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState(TIPOS[0].value);
  const [vigencia, setVigencia] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleFile(file: File) {
    setUploading(true);
    setMsg('');
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `${socioId}/${tipo}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('documentos').upload(path, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('socio_documentos').insert({
        socio_id: socioId,
        tipo,
        storage_path: path,
        nombre_archivo: file.name,
        vigencia_hasta: vigencia || null,
      });
      if (insertError) throw insertError;

      // Marca el ítem del checklist como completado si coincide el código.
      const codigoMap: Record<string, string> = {
        cedula_identidad: 'cedula_identidad',
        certificado_antecedentes: 'cert_antecedentes',
        receta_medica: 'receta_medica',
        ficha_perfil_fs001: 'FS-001',
        declaracion_coherencia_dc001: 'DC-001',
        contrato_adhesion_ctr001: 'CTR-001',
        anexo_marco_legal_anxml001: 'ANX-ML-001',
        declaracion_jurada_dj001: 'DJ-001',
        solicitud_ingreso_sol001: 'SOL-001',
      };
      const codigo = codigoMap[tipo];
      if (codigo) {
        await supabase
          .from('expediente_items')
          .update({ completado: true, fecha_completado: new Date().toISOString().slice(0, 10) })
          .eq('socio_id', socioId)
          .eq('codigo', codigo);
      }

      setMsg('Documento subido correctamente.');
      onUploaded?.();
    } catch (err: any) {
      setMsg(`Error: ${err.message ?? 'no se pudo subir el archivo'}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <p className="font-semibold text-brand">Subir o escanear documento</p>
      <div>
        <label className="label">Tipo de documento</label>
        <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Vigencia hasta (si aplica, ej. receta médica)</label>
        <input className="input" type="date" value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
      </div>
      <div>
        <label className="label">Archivo o foto</label>
        <input
          ref={inputRef}
          className="input"
          type="file"
          accept="image/*,.pdf"
          capture="environment"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <p className="text-xs text-neutral-400 mt-1">
          En el celular esto abre la cámara para escanear el documento en el momento.
        </p>
      </div>
      {uploading && <p className="text-sm text-neutral-500">Subiendo…</p>}
      {msg && <p className="text-sm text-brand">{msg}</p>}
    </div>
  );
}
