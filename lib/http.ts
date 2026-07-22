import "server-only";

const NAO_INFORMADO = "não informado";

/**
 * IP real do cliente. Não confia cegamente no x-forwarded-for: valida o
 * formato e descarta lixo, para o registro de auditoria não guardar qualquer
 * string que o cliente resolva mandar.
 */
export function extrairIp(headers: Headers): string {
  const bruto = headers.get("x-forwarded-for") ?? headers.get("x-real-ip") ?? "";
  const primeiro = bruto.split(",")[0]?.trim() ?? "";
  if (!primeiro) return NAO_INFORMADO;

  const semPorta = primeiro.startsWith("[")
    ? primeiro.slice(1, primeiro.indexOf("]"))
    : primeiro.includes(":") && primeiro.split(":").length === 2
      ? primeiro.split(":")[0]
      : primeiro;

  const ipv4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  if (ipv4.test(semPorta) || (semPorta.includes(":") && ipv6.test(semPorta))) return semPorta;
  return NAO_INFORMADO;
}

export function extrairDevice(headers: Headers): string {
  const ua = headers.get("user-agent")?.trim();
  return ua ? ua.slice(0, 300) : NAO_INFORMADO;
}
