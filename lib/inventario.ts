// Cálculo del stock disponible a partir de los movimientos del Registro de
// Inventario (entrada/salida/ajuste), en vez de que el saldo se escriba a
// mano. Las entradas se generan solas al terminar el Curado de un lote; las
// salidas se generan solas al crear una Entrega.

export interface StockLote {
  loteId: string | null;
  codigo: string;
  variedad: string | null;
  entradas: number;
  salidas: number;
  ajustes: number;
  saldo: number;
}

function claveLote(m: { lote_id: string | null; codigo: string | null }) {
  return m.lote_id ?? (m.codigo ? `codigo:${m.codigo}` : 'sin-identificar');
}

export async function calcularStockInventario(supabase: any): Promise<{ porLote: StockLote[]; totalDisponible: number }> {
  const { data: movimientos } = await supabase
    .from('registros_inventario')
    .select('lote_id, codigo, tipo_movimiento, cantidad_g, lote:lotes(codigo, cultivo_genetica)');

  const porLoteMap = new Map<string, StockLote>();

  for (const m of movimientos ?? []) {
    const key = claveLote(m as any);
    if (!porLoteMap.has(key)) {
      const lote = (m as any).lote;
      porLoteMap.set(key, {
        loteId: (m as any).lote_id ?? null,
        codigo: lote?.codigo ?? (m as any).codigo ?? 'Sin lote',
        variedad: lote?.cultivo_genetica ?? null,
        entradas: 0,
        salidas: 0,
        ajustes: 0,
        saldo: 0,
      });
    }
    const s = porLoteMap.get(key)!;
    const cant = Number((m as any).cantidad_g) || 0;
    if ((m as any).tipo_movimiento === 'entrada') {
      s.entradas += cant;
      s.saldo += cant;
    } else if ((m as any).tipo_movimiento === 'salida') {
      s.salidas += cant;
      s.saldo -= cant;
    } else if ((m as any).tipo_movimiento === 'ajuste') {
      // Convención: para un ajuste a la baja, ingresar la cantidad en negativo.
      s.ajustes += cant;
      s.saldo += cant;
    }
  }

  const porLote = Array.from(porLoteMap.values()).sort((a, b) => b.saldo - a.saldo);
  const totalDisponible = porLote.reduce((sum, l) => sum + l.saldo, 0);

  return { porLote, totalDisponible };
}

export async function saldoActualLote(supabase: any, loteId: string): Promise<number> {
  const { data } = await supabase
    .from('registros_inventario')
    .select('tipo_movimiento, cantidad_g')
    .eq('lote_id', loteId);

  let saldo = 0;
  for (const m of data ?? []) {
    const cant = Number(m.cantidad_g) || 0;
    if (m.tipo_movimiento === 'entrada') saldo += cant;
    else if (m.tipo_movimiento === 'salida') saldo -= cant;
    else if (m.tipo_movimiento === 'ajuste') saldo += cant;
  }
  return saldo;
}
