# Sistema de Gestión — Corporación de Usuarios Medicinales de Cannabis Zona Lacustre

Aplicación interna para administrar socios, expedientes, área agrícola, suministración y transporte, generando la documentación lista para una fiscalización, conforme al Manual Interno V2.2 y los 6 documentos del expediente de socio (ANX-ML-001, CTR-001, DC-001, DJ-001, FS-001, SOL-001).

Stack: **Next.js 14 (App Router, TypeScript) + Supabase (Postgres, Auth, Storage, RLS) + Tailwind CSS**, desplegado en **Vercel**. Mismo stack que la app NIDAMAR.

---

## ⚠️ Aviso importante antes de empezar

Este proyecto fue escrito íntegramente a mano (sin `npm install` ni `next build` locales), porque el entorno donde se generó el código no tiene acceso al registro de npm. Todo el código fue revisado manualmente (imports, tipos, balance de llaves/paréntesis, columnas de la base de datos), pero **no se pudo compilar ni ejecutar realmente**. Es muy probable que al correr `npm install && npm run build` aparezcan uno o dos errores menores de TypeScript (tipos implícitos, algún import). Son normales y rápidos de corregir — si te aparece alguno, pégamelo y lo arreglamos.

---

## 1. Requisitos

- Node.js 18 o superior
- Una cuenta de [Supabase](https://supabase.com) (plan gratuito sirve para partir)
- Una cuenta de [Vercel](https://vercel.com)
- Un repositorio en [GitHub](https://github.com)

## 2. Crear el proyecto Supabase

1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Elige nombre (ej. `corporacion-lacustre`), región cercana a Chile (ej. São Paulo), y una contraseña de base de datos (guárdala).
3. Espera a que el proyecto termine de aprovisionarse (1-2 minutos).
4. Ve a **SQL Editor** → **New query**, y ejecuta los tres archivos de `supabase/` **en este orden exacto**, pegando el contenido completo de cada uno y presionando "Run":
   1. `supabase/schema.sql` (tablas, tipos, secuencias, función y trigger del checklist de expediente)
   2. `supabase/rls.sql` (políticas de seguridad a nivel de fila)
   3. `supabase/storage.sql` (buckets `documentos` y `firmas`, con sus políticas)
5. Ve a **Project Settings → API**. Copia:
   - **Project URL**
   - **anon public key**

## 3. Configurar variables de entorno

En la raíz del proyecto, copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Y completa con los valores del paso anterior:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

## 4. Instalar dependencias y probar localmente

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Te redirigirá a `/login`. Todavía no hay usuarios — sigue el paso 5.

Si `npm run build` marca errores de TypeScript, cópiamelos y los corregimos juntos antes de desplegar.

## 5. Crear el primer usuario administrador

Las cuentas no son de auto-registro: las crea el equipo de la Corporación. Para crear el primer administrador:

1. En el panel de Supabase, ve a **Authentication → Users → Add user** (puedes usar "Create new user" con email + contraseña, marcando "Auto Confirm User").
2. Copia el **UUID** del usuario recién creado.
3. Ve a **SQL Editor** y ejecuta (reemplazando el UUID y el nombre):

```sql
insert into profiles (id, nombre_completo, rol)
values ('EL-UUID-DEL-USUARIO', 'Nombre Apellido', 'admin');
```

4. Ya puedes iniciar sesión en la app con ese correo y contraseña. Desde la app, ese primer administrador no crea más usuarios directamente (no hay pantalla de registro): los siguientes usuarios del equipo se crean repitiendo este mismo paso 5 (Authentication → Add user + insert en `profiles` con el `rol` que corresponda: `directorio`, `secretaria`, `direccion_tecnica`, `comite_seguridad`, `comite_calidad`, `comite_etica`, `tesoreria`, o `socio`).

Para vincular un usuario con rol `socio` a su ficha de socio ya creada en el módulo Socios, agrega también `socio_id` al insertar el perfil:

```sql
insert into profiles (id, nombre_completo, rol, socio_id)
values ('EL-UUID-DEL-USUARIO', 'Nombre Apellido', 'socio', 'el-id-del-registro-en-la-tabla-socios');
```

## 6. Subir el código a GitHub

```bash
cd corporacion-app
git init
git add .
git commit -m "Sistema de gestión Corporación Zona Lacustre — versión inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/corporacion-lacustre-app.git
git push -u origin main
```

(Crea antes el repositorio vacío en GitHub, sin README ni .gitignore, para evitar conflictos.)

## 7. Desplegar en Vercel

1. Entra a [vercel.com](https://vercel.com) → **Add New → Project** → importa el repositorio recién subido.
2. En **Environment Variables**, agrega las mismas dos variables de `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Presiona **Deploy**.
4. Si el build falla, revisa el log de errores de Vercel (suele mostrar exactamente la línea con el problema) y pégamelo para corregirlo.

## 8. Después del primer despliegue

- Cada `git push` a `main` vuelve a desplegar automáticamente.
- Los buckets `documentos` y `firmas` de Storage son privados: solo usuarios autenticados pueden leer/escribir, y las URLs de descarga que genera la app son firmadas y expiran en 1 hora.
- El checklist de expediente (9 ítems) se crea automáticamente cada vez que se registra un socio nuevo, vía trigger de base de datos — no requiere lógica adicional en la app.

---

## Estructura del proyecto

```
app/
  socios/                    Módulo Socios y Expediente Digital
  mi-perfil/                 Vista de autoservicio para el rol "socio"
  agricola/
    lotes/                   Lotes (código LT-)
    plantas/                 Plantas individuales (código CP-)
    planificacion/           Vista Gantt con fechas calculadas automáticamente
  registros/[slug]/          Sistema genérico de 16 tipos de registro agrícola/calidad
  suministracion/
    solicitudes/             Solicitudes de suministro (socio → staff)
    entregas/                Entregas con firma de recepción (código EN-)
  transporte/                Traslados internos/externos (código TR-)
  documentos/                Repositorio central de documentos escaneados
  fiscalizacion/             Generador de expedientes compilados para inspección
components/
  SignaturePad.tsx           Firma digital en pantalla (canvas → PNG → Storage)
  FileUpload.tsx              Escaneo/subida de documentos desde cámara o archivo
  DataTable.tsx, EntityForm.tsx   Listado y formulario genéricos
lib/
  entities.ts                 Registro central de los 16 tipos de registro genérico
  actions/                     Server Actions (inserciones, actualizaciones, resoluciones)
  auth.ts                      Sesión, roles y permisos de página
supabase/
  schema.sql, rls.sql, storage.sql   Base de datos completa, lista para ejecutar en orden
```

## Módulos incluidos

- **Socios y Expediente Digital**: alta de socios (genera CUS automático), checklist de 9 documentos del expediente, subida/escaneo de documentos, firma en pantalla de CTR-001/DC-001/DJ-001, Ficha de Perfil y Consumo (FS-001).
- **Área Agrícola**: Lotes (código LT-) con fechas de germinación/vegetación/floración/cosecha calculadas automáticamente a partir de la fecha de inicio; Plantas individuales (código CP-); vista de Planificación tipo Gantt; 8 tipos de registro operativo (riego, fertilización, fitosanitario, manejo, ambiental, cosecha, secado, curado).
- **Inventario y calidad**: almacenamiento, inventario, control de plantas activas, eliminación de material, no conformidades, auditorías, incidentes, ingreso y visitas.
- **Suministración**: solicitudes de socios y su resolución por Dirección Técnica/Secretaría, entregas con firma de recepción (código EN-).
- **Transporte**: traslados internos/externos (código TR-) con registro de documentos exigidos al transportista, según el Protocolo de Transporte (Manual 7.17–7.23).
- **Documentos**: repositorio central filtrable, con aviso de documentos vencidos o por vencer.
- **Fiscalización**: resumen general del estado de la Corporación, expediente compilado por socio y por lote, listos para imprimir/exportar a PDF ante una inspección.

## Próximos pasos sugeridos (no incluidos en esta primera entrega)

- Firma Electrónica Avanzada con validez legal plena (la firma en pantalla actual es un control interno, no un FEA).
- Notificaciones automáticas (correo) cuando un documento está por vencer o un checklist queda incompleto.
- Exportación directa a PDF del expediente de fiscalización (hoy se usa "Imprimir → Guardar como PDF" del navegador).
