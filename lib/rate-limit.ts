import "server-only";

/**
 * Rate limit em memória. Suficiente para segurar força bruta ingênua num
 * único processo.
 *
 * ⚠️ LIMITAÇÃO CONHECIDA: serverless escala em várias instâncias, e cada uma
 * tem o seu Map. O limite real é POR INSTÂNCIA, não global. Para valer de
 * verdade, precisa de Redis/Upstash — fica registrado como dívida.
 */
type Registro = { tentativas: number; primeiraEm: number; bloqueadoAte?: number };

const tentativas = new Map<string, Registro>();
const JANELA_MS = 15 * 60 * 1000;
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000;

export function checarRateLimit(chave: string): { ok: true } | { ok: false; segundos: number } {
  const agora = Date.now();
  const reg = tentativas.get(chave);

  if (reg?.bloqueadoAte && agora < reg.bloqueadoAte) {
    return { ok: false, segundos: Math.ceil((reg.bloqueadoAte - agora) / 1000) };
  }
  if (reg && agora - reg.primeiraEm > JANELA_MS) tentativas.delete(chave);
  return { ok: true };
}

export function registrarFalha(chave: string) {
  const agora = Date.now();
  const reg = tentativas.get(chave);

  if (!reg || agora - reg.primeiraEm > JANELA_MS) {
    tentativas.set(chave, { tentativas: 1, primeiraEm: agora });
    return;
  }
  reg.tentativas += 1;
  if (reg.tentativas >= MAX_TENTATIVAS) reg.bloqueadoAte = agora + BLOQUEIO_MS;
}

export function limparTentativas(chave: string) {
  tentativas.delete(chave);
}
