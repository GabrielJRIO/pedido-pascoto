"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────────────────

type PortalUser = {
  id: string;
  username: string;
  password: string;
  name: string;
  unit: string;
  active: boolean;
  localityType: string; // 'unidade' | 'posto'
};

type CatalogMaterial = {
  code: string;
  name: string;
  category: string;
  unit: string; // unidade de medida
};

type CartItem = {
  materialCode: string;
  materialName: string;
  category: string;
  unit: string;
  quantidade: number;
  observacao: string;
};

type LocalBatch = {
  id: string;
  materialCode: string;
  materialName: string;
  lot: string;
  expiresAt: string; // 'yyyy-mm-dd'
  quantity: number;
};

type PedidoStatus =
  | "Aguardando aprovação"
  | "Aprovado"
  | "Parcialmente aprovado"
  | "Rejeitado"
  | "Em separação"
  | "Enviado"
  | "Recebido"
  | "Cancelado";

type PedidoItem = {
  id: string;
  materialCode: string;
  materialName: string;
  quantidadeSolicitada: number;
  quantidadeAprovada: number | null;
  observacao: string;
};

type Pedido = {
  id: string;
  numero: string;
  unit: string;
  solicitanteName: string;
  status: PedidoStatus;
  observacoes: string;
  itens: PedidoItem[];
  createdAt: string;
  approvedBy: string;
  approvedAt: string;
  recebimentoStatus: string;
};

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_CFG: Record<PedidoStatus, { bg: string; color: string; border: string }> = {
  "Aguardando aprovação": { bg: "bg-yellow-50",  color: "text-yellow-700", border: "border-yellow-300" },
  "Aprovado":             { bg: "bg-green-50",   color: "text-green-700",  border: "border-green-300"  },
  "Parcialmente aprovado":{ bg: "bg-blue-50",    color: "text-blue-700",   border: "border-blue-300"   },
  "Rejeitado":            { bg: "bg-red-50",     color: "text-red-700",    border: "border-red-300"    },
  "Em separação":         { bg: "bg-purple-50",  color: "text-purple-700", border: "border-purple-300" },
  "Enviado":              { bg: "bg-indigo-50",  color: "text-indigo-700", border: "border-indigo-300" },
  "Recebido":             { bg: "bg-emerald-50", color: "text-emerald-700",border: "border-emerald-300"},
  "Cancelado":            { bg: "bg-slate-100",  color: "text-slate-500",  border: "border-slate-300"  },
};

// ─── Toast ──────────────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg ${ok ? "bg-green-600" : "bg-red-600"}`}>
      {ok ? "✓" : "✗"} {msg}
    </div>
  );
}

// ─── Login Screen ───────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (user: PortalUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error: err } = await supabase
      .from("pedido_users")
      .select("*")
      .eq("username", username.trim().toLowerCase())
      .eq("active", true)
      .single();
    setLoading(false);
    if (err || !data) { setError("Usuário não encontrado ou inativo."); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = data as any;
    if (row.password !== password) { setError("Senha incorreta."); return; }
    // Carimba o último acesso (fire-and-forget — não bloqueia o login)
    supabase.from("pedido_users").update({ last_login: new Date().toISOString() }).eq("id", row.id).then(() => {});
    onLogin({ id: row.id, username: row.username, name: row.name, unit: row.unit, password: row.password, active: row.active, localityType: row.locality_type || "unidade" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-red-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Outer orbital ring */}
              <ellipse cx="48" cy="48" rx="44" ry="18" stroke="#DC2626" strokeWidth="2.5" strokeOpacity="0.25" fill="none"/>
              {/* Diagonal orbital ring 1 */}
              <ellipse cx="48" cy="48" rx="44" ry="18" stroke="#DC2626" strokeWidth="2.5" strokeOpacity="0.35" fill="none" transform="rotate(60 48 48)"/>
              {/* Diagonal orbital ring 2 */}
              <ellipse cx="48" cy="48" rx="44" ry="18" stroke="#DC2626" strokeWidth="2.5" strokeOpacity="0.35" fill="none" transform="rotate(120 48 48)"/>
              {/* Blood drop shadow */}
              <ellipse cx="48" cy="58" rx="10" ry="3.5" fill="#DC2626" fillOpacity="0.15"/>
              {/* Blood drop body */}
              <path d="M48 22 C48 22 30 40 30 52 C30 61.9 38.1 70 48 70 C57.9 70 66 61.9 66 52 C66 40 48 22 48 22Z" fill="#DC2626"/>
              {/* Highlight on drop */}
              <path d="M40 44 C40 44 37 50 37 54 C37 54 36 48 40 44Z" fill="white" fillOpacity="0.3"/>
              {/* Orbital dot */}
              <circle cx="92" cy="48" r="4" fill="#DC2626" fillOpacity="0.6"/>
              <circle cx="4" cy="48" r="4" fill="#DC2626" fillOpacity="0.6"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-widest text-slate-900 uppercase">PASCOTO</h1>
          <p className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-slate-400 uppercase">Laboratório de Análises Clínicas</p>
          <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-red-300 to-transparent"/>
          <p className="mt-3 text-sm font-medium text-slate-500">Portal de Pedidos</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Usuário</label>
              <input
                required autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: coleta.alcantara"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#DC2626] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Senha</label>
              <input
                required type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-[#DC2626] focus:outline-none"
              />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#DC2626] py-3 text-sm font-bold text-white hover:bg-red-700 disabled:bg-slate-300">
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Desenvolvido por <span className="font-semibold text-slate-600">GRP Tecnologia</span>
        </p>
      </div>
    </div>
  );
}

// ─── Portal App ─────────────────────────────────────────────────────────────

export default function PortalApp() {
  const [currentUser, setCurrentUser] = useState<PortalUser | null>(null);
  const [materials, setMaterials] = useState<CatalogMaterial[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<"catalog" | "cart" | "orders" | "detail" | "estoque">("catalog");
  const [localBatches, setLocalBatches] = useState<LocalBatch[]>([]);
  const [usoMat, setUsoMat] = useState<string | null>(null);
  const [usoLoteId, setUsoLoteId] = useState("");
  const [usoQty, setUsoQty] = useState("");
  const [usoObs, setUsoObs] = useState("");
  const [usando, setUsando] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [obsGeral, setObsGeral] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [divergenceOpen, setDivergenceOpen] = useState(false);
  const [divergencePedidoId, setDivergencePedidoId] = useState<string | null>(null);
  const [divergenceType, setDivergenceType] = useState("");
  const [divergenceDesc, setDivergenceDesc] = useState("");
  const [savingDivergence, setSavingDivergence] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [scanInput, setScanInput] = useState("");

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadData(user: PortalUser) {
    setLoadingData(true);
    const [matRes, pedRes] = await Promise.all([
      supabase.from("materials").select("code,name,category,unit_of_measure").eq("disponivel_para_pedido", true).order("name"),
      supabase.from("pedidos").select("*, pedido_itens(*)").eq("unit", user.unit).order("created_at", { ascending: false }).limit(100),
    ]);

    if (!matRes.error && matRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMaterials((matRes.data as any[]).map((m) => ({
        code: m.code,
        name: m.name,
        category: m.category || "Outros",
        unit: m.unit_of_measure || "un",
      })));
    }

    if (!pedRes.error && pedRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPedidos((pedRes.data as any[]).map(mapPedido));
    }
    await loadLocalStock(user);
    setLoadingData(false);
  }

  // Estoque local da própria localidade, por lote (ordem FEFO)
  async function loadLocalStock(user: PortalUser) {
    const { data, error } = await supabase
      .from("material_batches")
      .select("id, material_code, lot, expires_at, quantity_current, materials(name)")
      .eq("unit", user.unit)
      .eq("status", "ativo")
      .gt("quantity_current", 0)
      .order("expires_at", { ascending: true });
    if (error) { console.warn("Estoque local indisponível (grant material_batches?):", error.message); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setLocalBatches((data as any[]).map((b) => ({
      id: b.id,
      materialCode: b.material_code,
      materialName: b.materials?.name || b.material_code,
      lot: b.lot || "—",
      expiresAt: b.expires_at || "",
      quantity: Number(b.quantity_current || 0),
    })));
  }

  function openUso(materialCode: string) {
    const lotes = localBatches.filter((b) => b.materialCode === materialCode);
    setUsoMat(materialCode);
    setUsoLoteId(lotes[0]?.id ?? ""); // FEFO (já vem ordenado) — auto-seleciona o primeiro
    setUsoQty("");
    setUsoObs("");
  }

  // Registra uso local via RPC transacional (baixa no lote correto)
  async function handleUsarMaterial() {
    if (!currentUser || !usoMat) return;
    const lote = localBatches.find((b) => b.id === usoLoteId);
    if (!lote) { showToast("Selecione o lote.", false); return; }
    const qty = Number(usoQty);
    if (!qty || qty <= 0) { showToast("Informe a quantidade usada.", false); return; }
    if (qty > lote.quantity) { showToast(`Máximo disponível neste lote: ${lote.quantity}`, false); return; }
    setUsando(true);
    const { data, error } = await supabase.rpc("registrar_uso_local", {
      p_material_code: usoMat, p_unit: currentUser.unit, p_batch_id: lote.id,
      p_qty: qty, p_responsavel: currentUser.name, p_obs: usoObs.trim() || null,
    });
    setUsando(false);
    if (error) { showToast("Erro ao registrar uso: " + error.message, false); return; }
    const res = data as { ok?: boolean; error?: string } | null;
    if (!res?.ok) { showToast(res?.error || "Não foi possível registrar o uso.", false); return; }
    showToast("Uso registrado! Estoque atualizado.");
    setUsoMat(null);
    await loadLocalStock(currentUser);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapPedido(r: any): Pedido {
    return {
      id: r.id,
      numero: r.numero,
      unit: r.unit,
      solicitanteName: r.solicitante_name,
      status: r.status as PedidoStatus,
      observacoes: r.observacoes || "",
      approvedBy: r.approved_by || "",
      approvedAt: r.approved_at ? new Date(r.approved_at).toLocaleString("pt-BR") : "",
      createdAt: new Date(r.created_at).toLocaleString("pt-BR"),
      recebimentoStatus: r.recebimento_status || "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      itens: (r.pedido_itens ?? []).map((i: any) => ({
        id: i.id,
        materialCode: i.material_code,
        materialName: i.material_name,
        quantidadeSolicitada: i.quantidade_solicitada,
        quantidadeAprovada: i.quantidade_aprovada ?? null,
        observacao: i.observacao || "",
      })),
    };
  }

  function handleLogin(user: PortalUser) {
    setCurrentUser(user);
    loadData(user);
  }

  function handleLogout() {
    setCurrentUser(null);
    setCart([]);
    setView("catalog");
    setPedidos([]);
    setMaterials([]);
  }

  // Cart logic
  function addToCart(mat: CatalogMaterial, qty = 1) {
    setCart((prev) => {
      const exists = prev.find((i) => i.materialCode === mat.code);
      if (exists) return prev.map((i) => i.materialCode === mat.code ? { ...i, quantidade: i.quantidade + qty } : i);
      return [...prev, { materialCode: mat.code, materialName: mat.name, category: mat.category, unit: mat.unit, quantidade: qty, observacao: "" }];
    });
    showToast(`${mat.name} adicionado ao pedido`);
  }

  function removeFromCart(code: string) { setCart((p) => p.filter((i) => i.materialCode !== code)); }

  function updateCartItem(code: string, field: "quantidade" | "observacao", value: number | string) {
    setCart((p) => p.map((i) => i.materialCode !== code ? i : { ...i, [field]: value }));
  }

  // Barcode scan
  function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const val = scanInput.trim();
    if (!val) return;
    const found = materials.find((m) =>
      m.code.toLowerCase() === val.toLowerCase()
    );
    if (!found) {
      showToast(`Código "${val}" não encontrado no catálogo`, false);
    } else {
      addToCart(found, 1);
    }
    setScanInput("");
  }

  async function handleSubmitPedido() {
    if (!currentUser) return;
    if (cart.length === 0) { showToast("Adicione pelo menos um material", false); return; }

    // Generate number
    const { count } = await supabase.from("pedidos").select("*", { count: "exact", head: true });
    const numero = `PED-${String((count ?? 0) + 1).padStart(6, "0")}`;

    setSubmitting(true);
    const { data: pedData, error: pedErr } = await supabase.from("pedidos").insert({
      numero,
      unit: currentUser.unit,
      locality_type: currentUser.localityType,
      solicitante_id: currentUser.id,
      solicitante_name: currentUser.name,
      status: "Aguardando aprovação",
      observacoes: obsGeral,
    }).select("*").single();

    if (pedErr || !pedData) {
      setSubmitting(false);
      showToast(`Erro ao enviar pedido: ${pedErr?.message}`, false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pedId = (pedData as any).id as string;

    const itens = cart.map((i) => ({
      pedido_id: pedId,
      material_code: i.materialCode,
      material_name: i.materialName,
      quantidade_solicitada: i.quantidade,
      observacao: i.observacao,
    }));

    const { data: itensData } = await supabase.from("pedido_itens").insert(itens).select("*");

    const novoPedido: Pedido = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: pedId, numero, unit: currentUser.unit, solicitanteName: currentUser.name,
      status: "Aguardando aprovação", observacoes: obsGeral,
      approvedBy: "", approvedAt: "",
      createdAt: new Date().toLocaleString("pt-BR"),
      recebimentoStatus: "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      itens: (itensData ?? []).map((i: any) => ({
        id: i.id, materialCode: i.material_code, materialName: i.material_name,
        quantidadeSolicitada: i.quantidade_solicitada, quantidadeAprovada: null,
        observacao: i.observacao || "",
      })),
    };

    setPedidos((prev) => [novoPedido, ...prev]);
    setCart([]);
    setObsGeral("");
    setSubmitting(false);
    setView("orders");
    showToast(`Pedido ${numero} enviado com sucesso!`);
  }

  async function handleCancelPedido(pedidoId: string) {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (!pedido || pedido.status !== "Aguardando aprovação") return;
    setCancelling(true);
    await supabase.from("pedidos").update({ status: "Cancelado" }).eq("id", pedidoId);
    setPedidos((prev) => prev.map((p) => p.id === pedidoId ? { ...p, status: "Cancelado" } : p));
    setCancelling(false);
    setView("orders");
    showToast("Pedido cancelado.");
  }

  // Destino confirma o recebimento. NÃO mexe em estoque e NÃO finaliza o pedido —
  // apenas SINALIZA à Gestão que o destino confirmou. O "Recebido" (e a baixa de
  // estoque) só acontecem quando a Gestão finaliza a remessa.
  async function handleConfirmReceipt(pedidoId: string) {
    if (!currentUser) return;
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (!pedido || pedido.status !== "Enviado") return;
    setConfirmingReceipt(true);
    const { error } = await supabase.from("pedidos").update({
      recebido_por: currentUser.name,
      recebido_em: new Date().toISOString(),
      recebimento_status: "confirmado",
    }).eq("id", pedidoId);
    setConfirmingReceipt(false);
    if (error) { showToast("Não foi possível confirmar. Tente novamente."); return; }
    setPedidos((prev) => prev.map((p) => p.id === pedidoId ? { ...p, recebimentoStatus: "confirmado" } : p));
    showToast("Recebimento confirmado! A Matriz vai finalizar.");
  }

  function openDivergence(pedidoId: string) {
    setDivergencePedidoId(pedidoId);
    setDivergenceType("");
    setDivergenceDesc("");
    setDivergenceOpen(true);
  }

  // Divergência NÃO finaliza recebimento nem mexe em estoque — abre pendência pra Gestão analisar.
  async function handleReportDivergence() {
    if (!currentUser || !divergencePedidoId) return;
    if (!divergenceType) { showToast("Escolha o tipo de divergência."); return; }
    setSavingDivergence(true);
    const { error } = await supabase.from("pedido_divergencias").insert({
      pedido_id: divergencePedidoId,
      tipo: divergenceType,
      descricao: divergenceDesc.trim() || null,
      status: "aberta",
      criado_por: currentUser.name,
    });
    if (!error) {
      await supabase.from("pedidos").update({ recebimento_status: "divergencia" }).eq("id", divergencePedidoId);
    }
    setSavingDivergence(false);
    if (error) { showToast("Não foi possível registrar. Tente novamente."); return; }
    setPedidos((prev) => prev.map((p) => p.id === divergencePedidoId ? { ...p, recebimentoStatus: "divergencia" } : p));
    setDivergenceOpen(false);
    showToast("Divergência registrada. A Gestão vai analisar.");
  }

  // Catalog filtering
  const categories = useMemo(() => {
    const cats = Array.from(new Set(materials.map((m) => m.category))).sort();
    return ["Todos", ...cats];
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.code.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === "Todos" || m.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [materials, search, catFilter]);

  const totalCartItems = cart.reduce((s, i) => s + i.quantidade, 0);

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* ── Modal de divergência ── */}
      {divergenceOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl">
            <h3 className="text-lg font-bold text-slate-900">Recebi com divergência</h3>
            <p className="mt-1 text-sm text-slate-500">Conte o que houve. A Gestão vai analisar antes de finalizar.</p>

            <label className="mt-4 block text-xs font-semibold text-slate-500">Tipo de divergência *</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { v: "faltando", l: "Item faltando" },
                { v: "qty_errada", l: "Quantidade errada" },
                { v: "produto_errado", l: "Produto errado" },
                { v: "lote_divergente", l: "Lote divergente" },
                { v: "danificado", l: "Material danificado" },
                { v: "outro", l: "Outro" },
              ].map((opt) => (
                <button key={opt.v} type="button" onClick={() => setDivergenceType(opt.v)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${divergenceType === opt.v ? "border-amber-500 bg-amber-50 text-amber-800 ring-1 ring-amber-200" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                  {opt.l}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-xs font-semibold text-slate-500">Descrição (opcional)</label>
            <textarea value={divergenceDesc} onChange={(e) => setDivergenceDesc(e.target.value)} rows={3}
              placeholder="Ex: chegaram 80 luvas em vez de 100; uma caixa veio molhada..."
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setDivergenceOpen(false)}
                className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button type="button" disabled={savingDivergence} onClick={handleReportDivergence}
                className="flex-1 rounded-xl bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">
                {savingDivergence ? "Registrando..." : "Registrar divergência"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top nav ── */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <svg width="36" height="36" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="48" cy="48" rx="44" ry="18" stroke="#DC2626" strokeWidth="2.5" strokeOpacity="0.3" fill="none"/>
              <ellipse cx="48" cy="48" rx="44" ry="18" stroke="#DC2626" strokeWidth="2.5" strokeOpacity="0.4" fill="none" transform="rotate(60 48 48)"/>
              <ellipse cx="48" cy="48" rx="44" ry="18" stroke="#DC2626" strokeWidth="2.5" strokeOpacity="0.4" fill="none" transform="rotate(120 48 48)"/>
              <path d="M48 22 C48 22 30 40 30 52 C30 61.9 38.1 70 48 70 C57.9 70 66 61.9 66 52 C66 40 48 22 48 22Z" fill="#DC2626"/>
              <path d="M40 44 C40 44 37 50 37 54 C37 54 36 48 40 44Z" fill="white" fillOpacity="0.3"/>
            </svg>
            <div>
              <p className="text-sm font-black tracking-wider text-slate-900 uppercase">Pascoto</p>
              <p className="text-xs text-slate-500">{currentUser.unit} · {currentUser.name}</p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            <button onClick={() => setView("catalog")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${view === "catalog" ? "bg-[#DC2626] text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              Catálogo
            </button>
            <button onClick={() => setView("cart")} className={`relative rounded-xl px-4 py-2 text-sm font-semibold ${view === "cart" ? "bg-[#DC2626] text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              Pedido
              {cart.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#DC2626] text-[10px] font-black text-white shadow">{cart.length}</span>
              )}
            </button>
            <button onClick={() => { loadData(currentUser); setView("orders"); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${view === "orders" || view === "detail" ? "bg-[#DC2626] text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              Meus Pedidos
            </button>
            <button onClick={() => { loadLocalStock(currentUser); setView("estoque"); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${view === "estoque" ? "bg-[#DC2626] text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              Estoque
            </button>
            <button onClick={handleLogout} className="ml-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
              Sair
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">

        {/* ═══════════════ CATALOG ═══════════════ */}
        {view === "catalog" && (
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-bold text-slate-900">Catálogo de Materiais</h1>
              {cart.length > 0 && (
                <button onClick={() => setView("cart")} className="flex items-center gap-2 rounded-xl bg-[#DC2626] px-4 py-2.5 text-sm font-bold text-white shadow">
                  Ver Pedido ({cart.length} itens · {totalCartItems} un) →
                </button>
              )}
            </div>

            {/* Scan bar */}
            <div className="mb-4 flex gap-3">
              <input
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleScan}
                placeholder="📦 Bipar código de barras ou código interno e pressione Enter"
                className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-[#DC2626] focus:outline-none"
                autoComplete="off"
              />
            </div>

            {/* Search + category filter */}
            <div className="mb-4 flex flex-wrap gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Buscar por nome, código ou categoria..."
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"
              />
            </div>
            <div className="mb-5 flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c} onClick={() => setCatFilter(c)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${catFilter === c ? "border-[#DC2626] bg-[#DC2626] text-white" : "border-slate-300 text-slate-600 hover:border-[#DC2626] hover:text-[#DC2626]"}`}>
                  {c}
                </button>
              ))}
            </div>

            {loadingData ? (
              <div className="py-20 text-center text-slate-400">Carregando materiais...</div>
            ) : filteredMaterials.length === 0 ? (
              <div className="py-16 text-center text-slate-400">Nenhum material encontrado.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMaterials.map((mat) => {
                  const inCart = cart.find((i) => i.materialCode === mat.code);
                  return (
                    <div key={mat.code} className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${inCart ? "border-[#DC2626] ring-1 ring-[#DC2626]/20" : "border-slate-200"}`}>
                      <div className="flex-1">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-900 leading-tight">{mat.name}</p>
                          {inCart && <span className="shrink-0 rounded-full bg-[#DC2626] px-2 py-0.5 text-[10px] font-bold text-white">✓ {inCart.quantidade}</span>}
                        </div>
                        <p className="text-xs text-slate-400">{mat.code}</p>
                        <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{mat.category}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        {inCart ? (
                          <>
                            <div className="flex flex-1 items-center gap-1">
                              <button onClick={() => updateCartItem(mat.code, "quantidade", Math.max(1, inCart.quantidade - 1))}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100">−</button>
                              <span className="flex-1 text-center text-sm font-bold">{inCart.quantidade} {mat.unit}</span>
                              <button onClick={() => updateCartItem(mat.code, "quantidade", inCart.quantidade + 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100">+</button>
                            </div>
                            <button onClick={() => removeFromCart(mat.code)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">Remover</button>
                          </>
                        ) : (
                          <button onClick={() => addToCart(mat)} className="w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-[#DC2626]">
                            + Adicionar ao Pedido
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ CART / PEDIDO ═══════════════ */}
        {view === "cart" && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h1 className="text-xl font-bold text-slate-900">Revisar Pedido</h1>
              <button onClick={() => setView("catalog")} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">← Voltar ao Catálogo</button>
            </div>

            {cart.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                <p className="text-lg font-semibold text-slate-400">Seu pedido está vazio</p>
                <button onClick={() => setView("catalog")} className="mt-4 rounded-xl bg-[#DC2626] px-6 py-2.5 text-sm font-bold text-white">Adicionar Materiais</button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Item list */}
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <h3 className="mb-4 font-bold text-slate-900">Materiais solicitados</h3>
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.materialCode} className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{item.materialName}</p>
                          <p className="text-xs text-slate-400">{item.materialCode} · {item.category}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateCartItem(item.materialCode, "quantidade", Math.max(1, item.quantidade - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-100">−</button>
                          <input
                            type="number" min="1"
                            value={item.quantidade}
                            onChange={(e) => updateCartItem(item.materialCode, "quantidade", Math.max(1, Number(e.target.value)))}
                            className="h-8 w-16 rounded-lg border border-slate-300 text-center text-sm font-bold"
                          />
                          <button onClick={() => updateCartItem(item.materialCode, "quantidade", item.quantidade + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-100">+</button>
                          <span className="ml-1 text-xs text-slate-400">{item.unit}</span>
                        </div>
                        <input
                          value={item.observacao}
                          onChange={(e) => updateCartItem(item.materialCode, "observacao", e.target.value)}
                          placeholder="Observação (opcional)"
                          className="h-8 w-40 rounded-lg border border-slate-200 px-3 text-xs"
                        />
                        <button onClick={() => removeFromCart(item.materialCode)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600">✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary + obs */}
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xl font-bold text-slate-900">{cart.length}</p>
                      <p className="text-xs text-slate-500">Materiais</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xl font-bold text-slate-900">{totalCartItems}</p>
                      <p className="text-xs text-slate-500">Itens total</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-sm font-bold text-slate-900">{currentUser.unit}</p>
                      <p className="text-xs text-slate-500">Unidade</p>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Observação geral (opcional)</label>
                    <textarea value={obsGeral} onChange={(e) => setObsGeral(e.target.value)} rows={3} placeholder="Urgência, contexto, informações adicionais..." className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3">
                  <button onClick={() => setView("catalog")} className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700">← Continuar Adicionando</button>
                  <button onClick={handleSubmitPedido} disabled={submitting} className="flex-[2] rounded-xl bg-[#DC2626] py-3 text-sm font-bold text-white shadow hover:bg-red-700 disabled:bg-slate-300">
                    {submitting ? "Enviando..." : `✓ Enviar Pedido (${cart.length} materiais)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ MY ORDERS ═══════════════ */}
        {view === "orders" && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h1 className="text-xl font-bold text-slate-900">Meus Pedidos — {currentUser.unit}</h1>
              <button onClick={() => { setView("catalog"); setCart([]); }} className="rounded-xl bg-[#DC2626] px-4 py-2.5 text-sm font-bold text-white">+ Novo Pedido</button>
            </div>

            {loadingData ? (
              <div className="py-20 text-center text-slate-400">Carregando...</div>
            ) : pedidos.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                <p className="text-lg font-semibold text-slate-400">Nenhum pedido ainda</p>
                <button onClick={() => setView("catalog")} className="mt-4 rounded-xl bg-[#DC2626] px-6 py-2.5 text-sm font-bold text-white">Fazer Primeiro Pedido</button>
              </div>
            ) : (
              <div className="space-y-3">
                {pedidos.map((ped) => {
                  const cfg = STATUS_CFG[ped.status];
                  return (
                    <button key={ped.id} onClick={() => { setSelectedPedido(ped); setView("detail"); }}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-[#DC2626] hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{ped.numero}</span>
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}>{ped.status}</span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{ped.itens.length} material(is) · {ped.solicitanteName}</p>
                          {ped.observacoes && <p className="mt-0.5 text-xs text-slate-400 truncate">{ped.observacoes}</p>}
                        </div>
                        <p className="shrink-0 text-xs text-slate-400">{ped.createdAt}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ ORDER DETAIL ═══════════════ */}
        {view === "detail" && selectedPedido && (() => {
          const ped = pedidos.find((p) => p.id === selectedPedido.id) ?? selectedPedido;
          const cfg = STATUS_CFG[ped.status];
          return (
            <div>
              <div className="mb-5 flex items-center gap-3">
                <button onClick={() => setView("orders")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">← Voltar</button>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{ped.numero}</h1>
                  <p className="text-sm text-slate-500">{ped.unit} · {ped.createdAt}</p>
                </div>
                <span className={`ml-auto rounded-full border px-4 py-1.5 text-sm font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}>{ped.status}</span>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                {/* Items */}
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <h3 className="mb-4 font-bold text-slate-900">Itens do Pedido</h3>
                  <div className="space-y-2">
                    {ped.itens.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{item.materialName}</p>
                          <p className="text-xs text-slate-400">{item.materialCode}</p>
                          {item.observacao && <p className="mt-0.5 text-xs text-slate-500">Obs: {item.observacao}</p>}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-bold text-slate-900">{item.quantidadeSolicitada} un</p>
                          {item.quantidadeAprovada !== null && item.quantidadeAprovada !== item.quantidadeSolicitada && (
                            <p className="text-xs font-semibold text-amber-600">Aprovado: {item.quantidadeAprovada} un</p>
                          )}
                          {item.quantidadeAprovada === item.quantidadeSolicitada && ped.status !== "Aguardando aprovação" && (
                            <p className="text-xs font-semibold text-green-600">✓ Aprovado</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info + actions */}
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="mb-3 font-bold text-slate-900">Detalhes</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-slate-500">Número</dt><dd className="font-bold">{ped.numero}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Unidade</dt><dd className="font-medium">{ped.unit}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Solicitante</dt><dd className="font-medium">{ped.solicitanteName}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Data</dt><dd>{ped.createdAt}</dd></div>
                      {ped.approvedBy && <div className="flex justify-between"><dt className="text-slate-500">Aprovado por</dt><dd className="font-medium text-green-700">{ped.approvedBy}</dd></div>}
                      {ped.approvedAt && <div className="flex justify-between"><dt className="text-slate-500">Em</dt><dd>{ped.approvedAt}</dd></div>}
                      {ped.observacoes && (
                        <div className="mt-2 border-t border-slate-100 pt-2">
                          <dt className="text-slate-500">Observação</dt>
                          <dd className="mt-1 text-slate-700">{ped.observacoes}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Status timeline */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="mb-3 font-bold text-slate-900">Status</h3>
                    {(["Aguardando aprovação","Aprovado","Em separação","Enviado","Recebido"] as PedidoStatus[]).map((s) => {
                      const statusOrder = ["Aguardando aprovação","Aprovado","Em separação","Enviado","Recebido"];
                      const currentIdx = statusOrder.indexOf(ped.status);
                      const thisIdx = statusOrder.indexOf(s);
                      const isDone = thisIdx <= currentIdx && !["Rejeitado","Cancelado","Parcialmente aprovado"].includes(ped.status);
                      const isCurrent = s === ped.status;
                      return (
                        <div key={s} className={`flex items-center gap-2 py-1.5 text-sm ${isDone ? "text-slate-900" : "text-slate-400"}`}>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${isCurrent ? "bg-[#DC2626] text-white" : isDone ? "bg-green-100 text-green-700" : "bg-slate-100"}`}>
                            {isDone && !isCurrent ? "✓" : thisIdx + 1}
                          </span>
                          <span className={isCurrent ? "font-bold text-[#DC2626]" : ""}>{s}</span>
                        </div>
                      );
                    })}
                    {(ped.status === "Rejeitado" || ped.status === "Cancelado") && (
                      <p className={`mt-2 rounded-lg px-3 py-2 text-xs font-semibold ${ped.status === "Cancelado" ? "bg-slate-100 text-slate-500" : "bg-red-50 text-red-600"}`}>
                        Pedido {ped.status.toLowerCase()}
                      </p>
                    )}
                  </div>

                  {ped.status === "Enviado" && ped.recebimentoStatus === "divergencia" && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                      <p className="text-sm font-bold text-amber-700">⚠ Divergência registrada</p>
                      <p className="mt-1 text-xs text-amber-600">Em análise pela Gestão.</p>
                    </div>
                  )}

                  {ped.status === "Enviado" && ped.recebimentoStatus !== "divergencia" && ped.recebimentoStatus !== "confirmado" && (
                    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
                      <p className="mb-1 text-sm font-bold text-emerald-800">Chegou até você?</p>
                      <p className="mb-3 text-xs text-emerald-700">Confirme o recebimento quando o material chegar em {ped.unit}.</p>
                      <button disabled={confirmingReceipt} onClick={() => { if (confirm(`Confirmar que recebeu o pedido ${ped.numero}?`)) handleConfirmReceipt(ped.id); }}
                        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                        {confirmingReceipt ? "Confirmando..." : "✓ Confirmar Recebimento"}
                      </button>
                      <button onClick={() => openDivergence(ped.id)}
                        className="mt-2 w-full rounded-xl border border-amber-300 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50">
                        Recebi com divergência
                      </button>
                    </div>
                  )}

                  {ped.status === "Enviado" && ped.recebimentoStatus === "confirmado" && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                      <p className="text-sm font-bold text-emerald-700">✓ Recebimento confirmado</p>
                      <p className="mt-1 text-xs text-emerald-600">Aguardando a Matriz finalizar a remessa.</p>
                    </div>
                  )}

                  {ped.status === "Recebido" && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                      <p className="text-sm font-bold text-emerald-700">✓ Recebido e finalizado</p>
                    </div>
                  )}

                  {ped.status === "Aguardando aprovação" && (
                    <button disabled={cancelling} onClick={() => { if (confirm("Cancelar este pedido?")) handleCancelPedido(ped.id); }}
                      className="w-full rounded-xl border border-red-300 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                      {cancelling ? "Cancelando..." : "Cancelar Pedido"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══════════════ ESTOQUE LOCAL ═══════════════ */}
        {view === "estoque" && (() => {
          const grupos = Object.values(
            localBatches.reduce((acc: Record<string, { code: string; name: string; total: number; lotes: number }>, b) => {
              acc[b.materialCode] ??= { code: b.materialCode, name: b.materialName, total: 0, lotes: 0 };
              acc[b.materialCode].total += b.quantity;
              acc[b.materialCode].lotes += 1;
              return acc;
            }, {}),
          ).sort((a, b) => a.name.localeCompare(b.name));

          return (
            <div>
              <div className="mb-5">
                <h1 className="text-xl font-bold text-slate-900">Estoque — {currentUser.unit}</h1>
                <p className="text-sm text-slate-500">Toque em um material para registrar o uso.</p>
              </div>

              {grupos.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
                  <p className="text-lg font-semibold text-slate-400">Nenhum material em estoque</p>
                  <p className="mt-1 text-sm text-slate-400">O estoque aparece quando a Matriz finalizar uma remessa para {currentUser.unit}.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {grupos.map((g) => (
                    <button key={g.code} onClick={() => openUso(g.code)}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#DC2626] hover:shadow">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{g.name}</p>
                        <p className="text-xs text-slate-400">{g.lotes} lote{g.lotes > 1 ? "s" : ""} · toque para usar</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-2xl font-black text-slate-900">{g.total}</p>
                        <p className="text-[10px] text-slate-400">disponível</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </main>

      {/* ─── Modal: Usar material ─── */}
      {usoMat && (() => {
        const lotes = localBatches.filter((b) => b.materialCode === usoMat);
        const nome = lotes[0]?.materialName ?? usoMat;
        const loteSel = localBatches.find((b) => b.id === usoLoteId);
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center" onClick={() => setUsoMat(null)}>
            <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#DC2626]">Registrar uso</p>
                  <h3 className="text-lg font-bold text-slate-900">{nome}</h3>
                </div>
                <button onClick={() => setUsoMat(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">✕</button>
              </div>

              {/* Seleção de lote (auto se só houver 1) */}
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                {lotes.length > 1 ? "Escolha o lote *" : "Lote"}
              </label>
              <div className="space-y-1.5">
                {lotes.map((l, i) => (
                  <button key={l.id} type="button" onClick={() => setUsoLoteId(l.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${usoLoteId === l.id ? "border-[#DC2626] bg-red-50 ring-1 ring-red-200" : "border-slate-200 hover:border-slate-300"}`}>
                    <span>
                      <span className="font-semibold text-slate-800">Lote {l.lot}</span>
                      {i === 0 && lotes.length > 1 && <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">vence antes</span>}
                      <span className="block text-xs text-slate-500">Validade {l.expiresAt ? l.expiresAt.split("-").reverse().join("/") : "—"}</span>
                    </span>
                    <span className="shrink-0 font-bold text-slate-900">{l.quantity} un</span>
                  </button>
                ))}
              </div>

              <label className="mb-1 mt-4 block text-xs font-semibold text-slate-500">Quantidade usada *</label>
              <input type="number" min={1} max={loteSel?.quantity} value={usoQty}
                onChange={(e) => setUsoQty(e.target.value)} placeholder="0"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
              {loteSel && Number(usoQty) > loteSel.quantity && (
                <p className="mt-1 text-xs font-semibold text-red-600">Máximo disponível neste lote: {loteSel.quantity}</p>
              )}

              <label className="mb-1 mt-3 block text-xs font-semibold text-slate-500">Observação (opcional)</label>
              <input value={usoObs} onChange={(e) => setUsoObs(e.target.value)} placeholder="Ex.: usado no setor X"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" />

              <button disabled={usando} onClick={handleUsarMaterial}
                className="mt-5 w-full rounded-xl bg-[#DC2626] py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {usando ? "Registrando..." : "Confirmar uso"}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Footer */}
      <footer className="mt-10 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Desenvolvido por <span className="font-semibold text-slate-600">GRP Tecnologia</span> · Portal de Pedidos Pascoto
      </footer>
    </div>
  );
}
