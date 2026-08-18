-- =====================================================================
-- CORPORACIÓN DE USUARIOS MEDICINALES DE CANNABIS ZONA LACUSTRE
-- Esquema de base de datos — Sistema de Gestión Interno
-- Alineado al Manual Interno MI-001 V2.2 y al libro
-- Sistema_Registros_Agricolas_Corporacion_Lacustre_V1.0.xlsx
-- Motor: PostgreSQL (Supabase)
-- =====================================================================

-- ---------- Extensiones ----------
create extension if not exists "uuid-ossp";

-- ---------- Enums ----------
create type rol_usuario as enum (
  'directorio', 'secretaria', 'direccion_tecnica',
  'comite_seguridad', 'comite_calidad', 'comite_etica',
  'tesoreria', 'socio', 'admin'
);

create type categoria_socio as enum ('activo', 'usuario_medicinal', 'honorario');
create type estado_socio as enum ('activo', 'suspendido', 'renunciado', 'excluido');
create type estado_lote as enum ('planificado', 'germinacion', 'vegetacion', 'floracion', 'cosechado', 'cerrado');
create type estado_incidente as enum ('abierto', 'en_investigacion', 'cerrado');
create type resolucion_solicitud as enum ('pendiente', 'aprobada', 'aprobada_parcial', 'rechazada');
create type tipo_movimiento_inventario as enum ('entrada', 'salida', 'ajuste');
create type tipo_traslado as enum ('interno', 'externo');
create type tipo_documento_socio as enum (
  'cedula_identidad', 'certificado_antecedentes', 'receta_medica',
  'ficha_perfil_fs001', 'declaracion_coherencia_dc001', 'contrato_adhesion_ctr001',
  'anexo_marco_legal_anxml001', 'declaracion_jurada_dj001', 'solicitud_ingreso_sol001',
  'otro'
);

-- =====================================================================
-- NÚCLEO: PERFILES Y ROLES
-- =====================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null,
  rol rol_usuario not null default 'socio',
  socio_id uuid, -- se referencia luego de crear tabla socios
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table profiles is 'Extiende auth.users con nombre, rol institucional (Manual Cap. III) y, si corresponde, el socio asociado.';

-- =====================================================================
-- SOCIOS Y EXPEDIENTE (Manual Cap. IV)
-- =====================================================================
create sequence cus_seq start 1;

create table socios (
  id uuid primary key default uuid_generate_v4(),
  cus text not null unique default ('CUS-' || lpad(nextval('cus_seq')::text, 4, '0')),
  nombre_completo text not null,
  rut text,
  fecha_nacimiento date,
  direccion text,
  telefono text,
  email text,
  categoria categoria_socio not null default 'activo',
  estado estado_socio not null default 'activo',
  fecha_ingreso date not null default current_date,
  fecha_ultima_actualizacion date not null default current_date,
  observaciones text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table profiles add constraint profiles_socio_fk foreign key (socio_id) references socios(id);

comment on table socios is 'Registro Maestro de Socios (Manual 4.15).';

-- Ficha de Perfil y Consumo (documento FS-001)
create table fichas_perfil (
  id uuid primary key default uuid_generate_v4(),
  socio_id uuid not null references socios(id) on delete cascade,
  diagnostico_principal text,
  medico_tratante text,
  especialidad text,
  fecha_receta date,
  vigencia_receta date,
  duracion_tratamiento text,
  via_administracion text, -- aceite sublingual / vaporización / tópico / cápsulas / otro
  dosis_diaria_g numeric,
  frecuencia_diaria integer,
  consumo_mensual_estimado_g numeric,
  rango_minimo_g numeric,
  rango_maximo_g numeric,
  variedad_genetica text,
  n_plantas_asignadas integer,
  codigos_planta text,
  observaciones_tecnicas text,
  responsable_validacion uuid references profiles(id),
  fecha_validacion date,
  created_at timestamptz not null default now()
);

comment on table fichas_perfil is 'Documento FS-001 — Ficha de Perfil y Consumo del Socio Medicinal.';

-- Checklist del expediente de incorporación (Manual 4.16 / IDX-001)
create table expediente_items (
  id uuid primary key default uuid_generate_v4(),
  socio_id uuid not null references socios(id) on delete cascade,
  codigo text not null, -- FS-001, DC-001, CTR-001, ANX-ML-001, DJ-001, SOL-001, cert_antecedentes, receta_medica, cedula
  nombre text not null,
  completado boolean not null default false,
  fecha_completado date,
  documento_id uuid, -- referencia a socio_documentos si aplica
  unique (socio_id, codigo)
);

comment on table expediente_items is 'Checklist de los 9 ítems del Índice del Expediente (IDX-001).';

-- Documentos escaneados/subidos del socio (recetas, cédula, certificados, contratos firmados)
create table socio_documentos (
  id uuid primary key default uuid_generate_v4(),
  socio_id uuid not null references socios(id) on delete cascade,
  tipo tipo_documento_socio not null,
  storage_path text not null, -- ruta en el bucket 'documentos'
  nombre_archivo text,
  vigencia_hasta date,
  subido_por uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Firmas digitales capturadas en pantalla (contrato, declaraciones, entregas, actas)
create table firmas (
  id uuid primary key default uuid_generate_v4(),
  contexto text not null, -- 'CTR-001','DJ-001','DC-001','entrega','acta', etc.
  referencia_id uuid, -- id del registro relacionado (entrega, socio, etc.)
  socio_id uuid references socios(id),
  firmante_nombre text not null,
  storage_path text not null, -- imagen png de la firma en el bucket 'firmas'
  ip_origen text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- ÁREA AGRÍCOLA (Manual Cap. V y VI)
-- =====================================================================
create sequence lt_seq start 1;
create sequence cp_seq start 1;

create table lotes (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique default ('LT-' || to_char(now(),'YYYY') || '-' || lpad(nextval('lt_seq')::text,3,'0')),
  fecha_inicio date not null,
  area_m2 numeric,
  cultivo_genetica text,
  n_plantas integer,
  responsable_tecnico uuid references profiles(id),
  sem_germinacion integer default 2,
  sem_vegetacion integer default 5,
  sem_floracion integer default 11,
  sem_cosecha integer default 1,
  rendimiento_esperado_m2 numeric,
  rendimiento_esperado_planta numeric,
  estado estado_lote not null default 'planificado',
  fecha_cierre date,
  evaluacion_final text,
  created_at timestamptz not null default now()
);

comment on table lotes is 'Registro de Lotes (Manual 5.5 / 6.5). Planificación calculada a partir de fecha_inicio + semanas por etapa.';

create table plantas (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique default ('CP-' || lpad(nextval('cp_seq')::text,6,'0')),
  lote_id uuid references lotes(id) on delete set null,
  fecha_germinacion date,
  origen text,
  variedad text,
  responsable uuid references profiles(id),
  estado_sanitario text,
  ubicacion text,
  observaciones text,
  fecha_cosecha date,
  created_at timestamptz not null default now()
);

create table registros_riego (
  id uuid primary key default uuid_generate_v4(),
  fecha date not null default current_date,
  planta_id uuid references plantas(id),
  lote_id uuid references lotes(id),
  producto text,
  cantidad text,
  responsable uuid references profiles(id),
  observaciones text,
  created_at timestamptz not null default now()
);

create table registros_fertilizacion (
  id uuid primary key default uuid_generate_v4(),
  fecha date not null default current_date,
  planta_id uuid references plantas(id),
  lote_id uuid references lotes(id),
  tipo text,
  producto text,
  dosis text,
  responsable uuid references profiles(id),
  observaciones text,
  created_at timestamptz not null default now()
);

create table registros_fitosanitario (
  id uuid primary key default uuid_generate_v4(),
  fecha date not null default current_date,
  planta_id uuid references plantas(id),
  lote_id uuid references lotes(id),
  problema text,
  accion text,
  producto text,
  responsable uuid references profiles(id),
  registrado_como_incidente boolean not null default false,
  created_at timestamptz not null default now()
);

create table registros_manejo_agricola (
  id uuid primary key default uuid_generate_v4(),
  fecha date not null default current_date,
  planta_id uuid references plantas(id),
  lote_id uuid references lotes(id),
  problema_necesidad text,
  accion text,
  responsable uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table registros_ambiental (
  id uuid primary key default uuid_generate_v4(),
  fecha date not null default current_date,
  hora time,
  lote_id uuid references lotes(id),
  temperatura_c numeric,
  humedad_relativa_pct numeric,
  ph numeric,
  ce_ds_m numeric,
  iluminacion_horas numeric,
  ventilacion boolean,
  responsable uuid references profiles(id),
  observaciones text,
  created_at timestamptz not null default now()
);

create table registros_cosecha (
  id uuid primary key default uuid_generate_v4(),
  fecha date not null default current_date,
  lote_id uuid references lotes(id),
  n_plantas_cosechadas integer,
  peso_fresco_g numeric,
  responsable uuid references profiles(id),
  eliminacion_desechos text,
  observaciones text,
  created_at timestamptz not null default now()
);

create table registros_secado (
  id uuid primary key default uuid_generate_v4(),
  lote_id uuid references lotes(id),
  fecha_ingreso date,
  fecha_termino date,
  condiciones_ambientales text,
  peso_inicial_g numeric,
  peso_final_g numeric,
  ubicacion text,
  responsable uuid references profiles(id),
  eliminacion_desechos text,
  created_at timestamptz not null default now()
);

create table registros_curado (
  id uuid primary key default uuid_generate_v4(),
  lote_id uuid references lotes(id),
  inicio date,
  fin date,
  responsable uuid references profiles(id),
  humedad_pct numeric,
  evaluacion_organoleptica text,
  observaciones text,
  created_at timestamptz not null default now()
);

create table registros_almacenamiento (
  id uuid primary key default uuid_generate_v4(),
  codigo text, -- LT o PR asociado
  ubicacion text,
  cantidad_g numeric,
  responsable uuid references profiles(id),
  fecha_ingreso date,
  fecha_salida date,
  estado text default 'disponible',
  created_at timestamptz not null default now()
);

create table registros_inventario (
  id uuid primary key default uuid_generate_v4(),
  fecha date not null default current_date,
  codigo text,
  tipo_movimiento tipo_movimiento_inventario not null,
  cantidad_g numeric,
  saldo_resultante_g numeric,
  documento_respaldo text,
  responsable uuid references profiles(id),
  observaciones text,
  created_at timestamptz not null default now()
);

create table control_plantas_activas (
  id uuid primary key default uuid_generate_v4(),
  fecha date not null default current_date,
  plantas_activas integer,
  plantas_cosechadas_acum integer,
  mermas_acum integer,
  observaciones text,
  created_at timestamptz not null default now()
);

create table eliminacion_material (
  id uuid primary key default uuid_generate_v4(),
  codigo text, -- CP o LT
  fecha date not null default current_date,
  cantidad text,
  motivo text,
  metodo text,
  autorizado_por text,
  n_acta text,
  responsable uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- =====================================================================
-- SEGURIDAD, INCIDENTES Y AUDITORÍA (Manual Cap. VIII y X)
-- =====================================================================
create table registro_ingreso_visitas (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  motivo text,
  fecha date not null default current_date,
  hora_ingreso time,
  hora_salida time,
  autorizado_por uuid references profiles(id),
  created_at timestamptz not null default now()
);

create sequence inc_seq start 1;
create table incidentes (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique default ('INC-' || to_char(now(),'YYYY') || '-' || lpad(nextval('inc_seq')::text,3,'0')),
  fecha_hora timestamptz not null default now(),
  tipo text,
  descripcion text,
  personas_involucradas text,
  responsable_reporte uuid references profiles(id),
  medidas_inmediatas text,
  estado estado_incidente not null default 'abierto',
  created_at timestamptz not null default now()
);

create table no_conformidades (
  id uuid primary key default uuid_generate_v4(),
  codigo_asociado text, -- incidente o auditoría
  descripcion text,
  causa text,
  responsable uuid references profiles(id),
  medida_correctiva text,
  fecha_cierre date,
  verificacion_eficacia text,
  created_at timestamptz not null default now()
);

create sequence aud_seq start 1;
create table auditorias (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique default ('AUD-' || to_char(now(),'YYYY') || '-' || lpad(nextval('aud_seq')::text,3,'0')),
  fecha date not null default current_date,
  tipo text,
  alcance text,
  responsable uuid references profiles(id),
  hallazgos text,
  estado text default 'abierta',
  created_at timestamptz not null default now()
);

-- =====================================================================
-- SUMINISTRACIÓN (Manual Cap. VII)
-- =====================================================================
create table solicitudes_suministro (
  id uuid primary key default uuid_generate_v4(),
  n_control text not null default ('SOL-' || to_char(now(),'YYYYMMDDHH24MISS')),
  socio_id uuid not null references socios(id),
  fecha date not null default current_date,
  tipo_material text,
  cantidad_solicitada_g numeric,
  observaciones text,
  resolucion resolucion_solicitud not null default 'pendiente',
  resuelto_por uuid references profiles(id),
  created_at timestamptz not null default now()
);

create sequence en_seq start 1;
create table entregas (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique default ('EN-' || to_char(now(),'YYYY') || '-' || lpad(nextval('en_seq')::text,3,'0')),
  fecha_hora timestamptz not null default now(),
  socio_id uuid not null references socios(id),
  lote_id uuid references lotes(id),
  cantidad_g numeric,
  responsable_entrega uuid references profiles(id),
  firma_id uuid references firmas(id),
  solicitud_id uuid references solicitudes_suministro(id),
  observaciones text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- TRANSPORTE (Manual 7.17 a 7.23)
-- =====================================================================
create sequence tr_seq start 1;
create table traslados (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique default ('TR-' || to_char(now(),'YYYY') || '-' || lpad(nextval('tr_seq')::text,3,'0')),
  tipo tipo_traslado not null default 'interno',
  fecha_salida timestamptz,
  fecha_llegada timestamptz,
  origen text,
  destino text,
  responsable uuid references profiles(id),
  vehiculo_patente text,
  lote_id uuid references lotes(id),
  entrega_id uuid references entregas(id),
  cantidad text,
  autorizacion text,
  observaciones text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- ÍNDICES
-- =====================================================================
create index on socios (estado);
create index on plantas (lote_id);
create index on registros_riego (lote_id, fecha);
create index on registros_fertilizacion (lote_id, fecha);
create index on entregas (socio_id, fecha_hora);
create index on socio_documentos (socio_id, tipo);
create index on incidentes (estado);

-- =====================================================================
-- FUNCIÓN: crear checklist de expediente al crear un socio
-- =====================================================================
create or replace function crear_checklist_expediente()
returns trigger as $$
begin
  insert into expediente_items (socio_id, codigo, nombre) values
    (new.id, 'FS-001', 'Ficha de Perfil y Consumo'),
    (new.id, 'DC-001', 'Declaración de Coherencia'),
    (new.id, 'CTR-001', 'Contrato de Adhesión'),
    (new.id, 'ANX-ML-001', 'Anexo Marco Legal'),
    (new.id, 'DJ-001', 'Declaración Jurada de Uso Personal'),
    (new.id, 'SOL-001', 'Solicitud Formal de Ingreso'),
    (new.id, 'cert_antecedentes', 'Certificado de Antecedentes vigente'),
    (new.id, 'receta_medica', 'Receta médica vigente'),
    (new.id, 'cedula_identidad', 'Fotocopia de cédula de identidad');
  return new;
end;
$$ language plpgsql;

create trigger trg_crear_checklist_expediente
  after insert on socios
  for each row execute function crear_checklist_expediente();

