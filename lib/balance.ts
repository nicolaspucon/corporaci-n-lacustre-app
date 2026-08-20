// Balance automático: necesidad mensual de los socios (según su ficha/receta)
// vs. producción proyectada de los lotes que van andando, alimentado por
// datos que ya existen en la app (fichas_perfil, plantas, lotes, inventario).
// No requiere que nadie escriba estos números a mano.

import { calcularStockInventario } from './inventario';

export interface LoteContribucion {
  id: string;
  codigo: string;
  variedad: string | null;
  produccionG: number;
}

export interface ProyeccionMes {
  mes: string; // 'YYYY-MM', o 'sin-fecha'
  label: string;
  produccionG: number;
  lotes: LoteContribucion[];
}

export interface BalanceProduccion {
  demandaMensualG: number;
  sociosConsiderados: number;
  sociosActivosTotal: number;
  stockDisponibleG: number;
  produccionProyectadaTotalG: number;
  mesesCobertura: number | null;
  proyeccionPorMes: ProyeccionMes[];
}

export async function calcularBalanceProduccion(supabase: any): Promise<BalanceProduccion> {
  const [{ data: sociosActivos }, stock, { data: lotes }, { data: curadosFinalizados }] = await Promise.all([
    supabase.from('socios').select('id').eq('estado', 'activo').is('anulado_en', null),
    calcularStockInventario(supabase),
    supabase.from('lotes').select('id, codigo, estado, cultivo_genetica').is('anulado_en', null),
    supabase.from('registros_inventario').select('lote_id').not('origen_curado_id', 'is', null).is('anulado_en', null),
  ]);

  const socioIds = (sociosActivos ?? []).map((s: any) => s.id);
  const { data: fichas } =
    socioIds.length > 0
      ? await supabase
          .from('fichas_perfil')
          .select('socio_id, rango_maximo_g, consumo_mensual_estimado_g')
          .in('socio_id', socioIds)
      : { data: [] as any[] };

  const demandaMensualG = (fichas ?? []).reduce(
    (sum: number, f: any) => sum + (f.rango_maximo_g ?? f.consumo_mensual_estimado_g ?? 0),
    0
  );
  const sociosConsiderados = (fichas ?? []).filter(
    (f: any) => f.rango_maximo_g ?? f.consumo_mensual_estimado_g
  ).length;

  // Lotes que ya no aportan a la proyección: cerrados formalmente, o cuyo
  // curado ya se finalizó (ese peso ya está contado en el stock disponible).
  const lotesExcluidos = new Set<string>(
    (curadosFinalizados ?? []).map((r: any) => r.lote_id).filter(Boolean)
  );
  for (const l of lotes ?? []) {
    if (l.estado === 'cerrado') lotesExcluidos.add(l.id);
  }

  const loteIdsProyectables = (lotes ?? []).map((l: any) => l.id).filter((id: string) => !lotesExcluidos.has(id));

  const { data: plantasProyectables } =
    loteIdsProyectables.length > 0
      ? await supabase
          .from('plantas')
          .select('id, lote_id, fecha_cosecha, produccion_esperada_g, lote:lotes(codigo, cultivo_genetica)')
          .in('lote_id', loteIdsProyectables)
          .is('anulado_en', null)
      : { data: [] as any[] };

  const porMes = new Map<string, ProyeccionMes>();
  let produccionProyectadaTotalG = 0;

  for (const p of plantasProyectables ?? []) {
    const g = Number((p as any).produccion_esperada_g) || 0;
    if (g <= 0) continue;
    produccionProyectadaTotalG += g;

    const fechaCosecha = (p as any).fecha_cosecha as string | null;
    const mesKey = fechaCosecha ? fechaCosecha.slice(0, 7) : 'sin-fecha';
    if (!porMes.has(mesKey)) {
      const label = fechaCosecha
        ? new Date(fechaCosecha + 'T00:00:00').toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
        : 'Sin fecha de cosecha estimada';
      porMes.set(mesKey, { mes: mesKey, label, produccionG: 0, lotes: [] });
    }
    const entry = porMes.get(mesKey)!;
    entry.produccionG += g;

    const loteInfo = (p as any).lote;
    const loteId = (p as any).lote_id;
    const existente = entry.lotes.find((l) => l.id === loteId);
    if (existente) {
      existente.produccionG += g;
    } else {
      entry.lotes.push({
        id: loteId,
        codigo: loteInfo?.codigo ?? '—',
        variedad: loteInfo?.cultivo_genetica ?? null,
        produccionG: g,
      });
    }
  }

  const proyeccionPorMes = Array.from(porMes.values()).sort((a, b) => a.mes.localeCompare(b.mes));

  const oferta = stock.totalDisponible + produccionProyectadaTotalG;
  const mesesCobertura = demandaMensualG > 0 ? Math.round((oferta / demandaMensualG) * 10) / 10 : null;

  return {
    demandaMensualG,
    sociosConsiderados,
    sociosActivosTotal: socioIds.length,
    stockDisponibleG: stock.totalDisponible,
    produccionProyectadaTotalG,
    mesesCobertura,
    proyeccionPorMes,
  };
}
