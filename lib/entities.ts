// =====================================================================
// Registro central de "entidades" (tablas de registro) del sistema.
// Cada entrada describe una tabla de Supabase y sus campos, para que
// el DataTable y el EntityForm genéricos puedan listar/crear registros
// sin necesidad de una página distinta escrita a mano por cada tabla.
//
// Los módulos con lógica propia (Socios, Área Agrícola - Lotes/Plantas/
// Planificación, Suministración, Transporte, Documentos) tienen sus
// propias páginas en app/ y no usan este registro genérico.
// =====================================================================

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'boolean'
  | 'select'
  | 'lote'
  | 'planta'
  | 'photo';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[]; // para type 'select'
  required?: boolean;
  /** Dato que recién se conoce al terminar el proceso (ej. peso final, fecha de
   * término). No se pide al crear el registro; se completa después desde su ficha. */
  faseFinal?: boolean;
}

export interface EntityDef {
  slug: string; // usado en la URL /registros/[slug]
  table: string; // nombre de la tabla en Supabase
  label: string; // nombre visible
  manualRef: string; // referencia al artículo del Manual Interno
  fields: FieldDef[];
  orderBy?: string;
  /** Columna que guarda quién ejecutó el registro. null = la tabla no tiene ese campo. */
  responsableColumn?: string | null;
  /** Si es true, al guardar el registro se ofrece confirmar el ingreso del día al área de cultivo. */
  implicaIngreso?: boolean;
}

export const ENTITIES: EntityDef[] = [
  {
    slug: 'riego',
    implicaIngreso: true,
    table: 'registros_riego',
    label: 'Registro de Riego',
    manualRef: 'Manual 5.7 / 5.8 / 6.9',
    orderBy: 'fecha',
    fields: [
      { key: 'fecha', label: 'Fecha', type: 'date', required: true },
      { key: 'lote', label: 'Lote', type: 'lote' },
      { key: 'planta', label: 'Planta (opcional)', type: 'planta' },
      { key: 'producto', label: 'Producto / solución', type: 'text' },
      { key: 'cantidad', label: 'Cantidad (L o ml/L)', type: 'text' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
    ],
  },
  {
    slug: 'fertilizacion',
    implicaIngreso: true,
    table: 'registros_fertilizacion',
    label: 'Registro de Fertilización',
    manualRef: 'Manual 5.7',
    orderBy: 'fecha',
    fields: [
      { key: 'fecha', label: 'Fecha', type: 'date', required: true },
      { key: 'lote', label: 'Lote', type: 'lote' },
      { key: 'planta', label: 'Planta (opcional)', type: 'planta' },
      { key: 'tipo', label: 'Tipo (Grow/Micro/Bloom/Otro)', type: 'text' },
      { key: 'producto', label: 'Producto', type: 'text' },
      { key: 'dosis', label: 'Dosis (ml/L)', type: 'text' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
    ],
  },
  {
    slug: 'fitosanitario',
    implicaIngreso: true,
    table: 'registros_fitosanitario',
    label: 'Manejo Fitosanitario',
    manualRef: 'Manual 6.11',
    orderBy: 'fecha',
    fields: [
      { key: 'fecha', label: 'Fecha', type: 'date', required: true },
      { key: 'lote', label: 'Lote', type: 'lote' },
      { key: 'planta', label: 'Planta (opcional)', type: 'planta' },
      { key: 'problema', label: 'Problema detectado', type: 'text' },
      { key: 'accion', label: 'Acción realizada', type: 'text' },
      { key: 'producto', label: 'Producto utilizado', type: 'text' },
      { key: 'registrado_como_incidente', label: '¿Registrado como incidente?', type: 'boolean' },
    ],
  },
  {
    slug: 'manejo-agricola',
    implicaIngreso: true,
    table: 'registros_manejo_agricola',
    label: 'Manejo Agrícola General',
    manualRef: 'Manual 6.8',
    orderBy: 'fecha',
    fields: [
      { key: 'fecha', label: 'Fecha', type: 'date', required: true },
      { key: 'lote', label: 'Lote', type: 'lote' },
      { key: 'planta', label: 'Planta (opcional)', type: 'planta' },
      { key: 'problema_necesidad', label: 'Problema / necesidad', type: 'text' },
      { key: 'accion', label: 'Acción realizada', type: 'text' },
    ],
  },
  {
    slug: 'ambiental',
    implicaIngreso: true,
    table: 'registros_ambiental',
    label: 'Registro Ambiental',
    manualRef: 'Manual 5.8',
    orderBy: 'fecha',
    fields: [
      { key: 'fecha', label: 'Fecha', type: 'date', required: true },
      { key: 'hora', label: 'Hora', type: 'time' },
      { key: 'lote', label: 'Lote / sector', type: 'lote' },
      { key: 'temperatura_c', label: 'Temperatura (°C)', type: 'number' },
      { key: 'humedad_relativa_pct', label: 'Humedad relativa (%)', type: 'number' },
      { key: 'ph', label: 'pH', type: 'number' },
      { key: 'ce_ds_m', label: 'CE (dS/m)', type: 'number' },
      { key: 'iluminacion_horas', label: 'Iluminación (h encendida)', type: 'number' },
      { key: 'ventilacion', label: 'Ventilación', type: 'boolean' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
    ],
  },
  {
    slug: 'cosecha',
    implicaIngreso: true,
    table: 'registros_cosecha',
    label: 'Registro de Cosecha',
    manualRef: 'Manual 5.9 / 6.12',
    orderBy: 'fecha',
    fields: [
      { key: 'fecha', label: 'Fecha', type: 'date', required: true },
      { key: 'lote', label: 'Lote', type: 'lote', required: true },
      { key: 'n_plantas_cosechadas', label: 'N.º de plantas cosechadas', type: 'number' },
      { key: 'peso_fresco_g', label: 'Peso fresco (g)', type: 'number' },
      { key: 'eliminacion_desechos', label: 'Eliminación de desechos', type: 'text' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
    ],
  },
  {
    slug: 'secado',
    implicaIngreso: true,
    table: 'registros_secado',
    label: 'Registro de Secado',
    manualRef: 'Manual 5.10 / 6.13',
    orderBy: 'fecha_ingreso',
    fields: [
      { key: 'lote', label: 'Lote', type: 'lote', required: true },
      { key: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date' },
      { key: 'condiciones_ambientales', label: 'Condiciones ambientales', type: 'text' },
      { key: 'peso_inicial_g', label: 'Peso inicial (g)', type: 'number' },
      { key: 'ubicacion', label: 'Ubicación', type: 'text' },
      { key: 'fecha_termino', label: 'Fecha de término', type: 'date', faseFinal: true },
      { key: 'peso_final_g', label: 'Peso final (g)', type: 'number', faseFinal: true },
      { key: 'eliminacion_desechos', label: 'Eliminación de desechos', type: 'text', faseFinal: true },
    ],
  },
  {
    slug: 'curado',
    implicaIngreso: true,
    table: 'registros_curado',
    label: 'Registro de Curado',
    manualRef: 'Manual 5.11 / 6.13',
    orderBy: 'inicio',
    fields: [
      { key: 'lote', label: 'Lote', type: 'lote', required: true },
      { key: 'inicio', label: 'Inicio', type: 'date' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
      { key: 'fin', label: 'Finalización', type: 'date', faseFinal: true },
      { key: 'humedad_pct', label: 'Humedad (%)', type: 'number', faseFinal: true },
      { key: 'evaluacion_organoleptica', label: 'Evaluación organoléptica', type: 'text', faseFinal: true },
      { key: 'peso_final_g', label: 'Peso final curado (g)', type: 'number', faseFinal: true },
    ],
  },
  {
    slug: 'almacenamiento',
    table: 'registros_almacenamiento',
    label: 'Registro de Almacenamiento',
    manualRef: 'Manual 5.12 / 6.14',
    orderBy: 'fecha_ingreso',
    fields: [
      { key: 'codigo', label: 'Código (LT o PR)', type: 'text' },
      { key: 'ubicacion', label: 'Ubicación', type: 'text' },
      { key: 'cantidad_g', label: 'Cantidad almacenada (g)', type: 'number' },
      { key: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date' },
      { key: 'fecha_salida', label: 'Fecha de salida', type: 'date' },
      { key: 'estado', label: 'Estado', type: 'select', options: ['disponible', 'agotado'] },
    ],
  },
  {
    slug: 'inventario',
    table: 'registros_inventario',
    label: 'Registro de Inventario',
    manualRef: 'Manual 5.13 / 6.15',
    orderBy: 'fecha',
    fields: [
      { key: 'fecha', label: 'Fecha', type: 'date', required: true },
      { key: 'codigo', label: 'Código (LT o PR)', type: 'text' },
      { key: 'tipo_movimiento', label: 'Tipo de movimiento', type: 'select', options: ['entrada', 'salida', 'ajuste'], required: true },
      { key: 'cantidad_g', label: 'Cantidad (g)', type: 'number' },
      { key: 'saldo_resultante_g', label: 'Saldo resultante (g)', type: 'number' },
      { key: 'documento_respaldo', label: 'Documento de respaldo', type: 'text' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
    ],
  },
  {
    slug: 'plantas-activas',
    table: 'control_plantas_activas',
    label: 'Control de Plantas Activas',
    manualRef: 'Manual 6.15',
    responsableColumn: null,
    orderBy: 'fecha',
    fields: [
      { key: 'fecha', label: 'Fecha', type: 'date', required: true },
      { key: 'plantas_activas', label: 'Plantas activas', type: 'number' },
      { key: 'plantas_cosechadas_acum', label: 'Plantas cosechadas (acumulado)', type: 'number' },
      { key: 'mermas_acum', label: 'Mermas (acumulado)', type: 'number' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
    ],
  },
  {
    slug: 'eliminacion-material',
    implicaIngreso: true,
    table: 'eliminacion_material',
    label: 'Eliminación de Material Vegetal',
    manualRef: 'Manual 6.16',
    orderBy: 'fecha',
    fields: [
      { key: 'codigo', label: 'Código (CP o LT)', type: 'text' },
      { key: 'fecha', label: 'Fecha', type: 'date', required: true },
      { key: 'cantidad', label: 'Cantidad a eliminar', type: 'text' },
      { key: 'motivo', label: 'Motivo', type: 'text' },
      { key: 'metodo', label: 'Método empleado', type: 'text' },
      { key: 'n_acta', label: 'N.º de acta', type: 'text' },
      { key: 'autorizado_por', label: 'Autorizado por (Dirección Técnica)', type: 'text' },
      { key: 'foto', label: 'Fotografía de respaldo', type: 'photo' },
    ],
  },
  {
    slug: 'visitas',
    table: 'registro_ingreso_visitas',
    label: 'Registro de Ingreso y Visitas',
    manualRef: 'Manual 10.4',
    responsableColumn: 'autorizado_por',
    orderBy: 'fecha',
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'motivo', label: 'Motivo', type: 'text' },
      { key: 'fecha', label: 'Fecha', type: 'date', required: true },
      { key: 'hora_ingreso', label: 'Hora de ingreso', type: 'time' },
      { key: 'hora_salida', label: 'Hora de salida', type: 'time' },
    ],
  },
  {
    slug: 'incidentes',
    table: 'incidentes',
    label: 'Registro de Incidentes',
    manualRef: 'Manual 5.15 / Cap. VIII / 10.10',
    responsableColumn: 'responsable_reporte',
    orderBy: 'fecha_hora',
    fields: [
      { key: 'fecha_hora', label: 'Fecha y hora', type: 'datetime-local', required: true },
      { key: 'tipo', label: 'Tipo de incidente', type: 'text' },
      { key: 'descripcion', label: 'Descripción de los hechos', type: 'textarea' },
      { key: 'personas_involucradas', label: 'Personas involucradas', type: 'text' },
      { key: 'medidas_inmediatas', label: 'Medidas inmediatas adoptadas', type: 'textarea' },
      { key: 'estado', label: 'Estado', type: 'select', options: ['abierto', 'en_investigacion', 'cerrado'] },
    ],
  },
  {
    slug: 'no-conformidades',
    table: 'no_conformidades',
    label: 'No Conformidad y Acción Correctiva',
    manualRef: 'Manual 5.16',
    orderBy: 'created_at',
    fields: [
      { key: 'codigo_asociado', label: 'Código de incidente o auditoría asociado', type: 'text' },
      { key: 'descripcion', label: 'Descripción de la no conformidad', type: 'textarea' },
      { key: 'causa', label: 'Causa identificada', type: 'text' },
      { key: 'medida_correctiva', label: 'Medida correctiva adoptada', type: 'textarea' },
      { key: 'fecha_cierre', label: 'Fecha de cierre', type: 'date' },
      { key: 'verificacion_eficacia', label: 'Verificación de eficacia', type: 'text' },
    ],
  },
  {
    slug: 'auditorias',
    table: 'auditorias',
    label: 'Auditorías',
    manualRef: 'Manual 5.19',
    orderBy: 'fecha',
    fields: [
      { key: 'fecha', label: 'Fecha', type: 'date', required: true },
      { key: 'tipo', label: 'Tipo', type: 'text' },
      { key: 'alcance', label: 'Alcance', type: 'text' },
      { key: 'hallazgos', label: 'Hallazgos', type: 'textarea' },
      { key: 'estado', label: 'Estado', type: 'select', options: ['abierta', 'cerrada'] },
    ],
  },
];

export function getEntity(slug: string): EntityDef | undefined {
  return ENTITIES.find((e) => e.slug === slug);
}

/**
 * Columna que guarda quién hizo el registro. Por defecto es 'responsable'
 * (así se llama en casi todas las tablas de registro). Algunas entidades
 * la renombran (visitas -> autorizado_por, incidentes -> responsable_reporte)
 * y una la desactiva explícitamente (plantas-activas -> null).
 */
export function getResponsableColumn(entity: EntityDef): string | null {
  if (entity.responsableColumn === undefined) return 'responsable';
  return entity.responsableColumn;
}
