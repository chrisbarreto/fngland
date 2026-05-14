export const STORAGE_KEYS = {
  idCliente: "formulang_idCliente",
  idRegistroPendiente: "formulang_idRegistroPendiente",
  idPlanPendiente: "formulang_idPlanPendiente",
  idMembresiaActivar: "formulang_idMembresiaActivar",
  idsMembresiasActivar: "formulang_idsMembresiasActivar",
  idVehiculo: "formulang_idVehiculo",
} as const;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function storeMembresiasSeleccionadas(
  storage: StorageLike,
  idsSeleccionadas: string[],
): void {
  if (idsSeleccionadas.length > 1) {
    storage.setItem(
      STORAGE_KEYS.idsMembresiasActivar,
      JSON.stringify(idsSeleccionadas),
    );
    storage.removeItem(STORAGE_KEYS.idMembresiaActivar);
  } else {
    storage.setItem(STORAGE_KEYS.idMembresiaActivar, idsSeleccionadas[0]);
    storage.removeItem(STORAGE_KEYS.idsMembresiasActivar);
  }
}

export function buildConfirmPayload(storage: StorageLike): Record<string, any> {
  const storedClienteId = storage.getItem(STORAGE_KEYS.idCliente);
  const storedIdRegistroPendiente = storage.getItem(
    STORAGE_KEYS.idRegistroPendiente,
  );
  const storedIdMembresiaActivar = storage.getItem(
    STORAGE_KEYS.idMembresiaActivar,
  );
  const storedIdsMembresiasActivarRaw = storage.getItem(
    STORAGE_KEYS.idsMembresiasActivar,
  );
  let storedIdsMembresiasActivar: string[] = [];
  try {
    storedIdsMembresiasActivar = storedIdsMembresiasActivarRaw
      ? (JSON.parse(storedIdsMembresiasActivarRaw) as string[])
      : [];
  } catch {
    storedIdsMembresiasActivar = [];
  }

  if (!storedClienteId) {
    throw new Error("No se encontró el cliente.");
  }

  const confirmPayload: Record<string, any> = {
    idCliente: storedClienteId,
    acceptTerminos: true,
  };
  if (storedIdRegistroPendiente)
    confirmPayload.idRegistroPendiente = storedIdRegistroPendiente;
  if (storedIdsMembresiasActivar.length > 0)
    confirmPayload.idsMembresiasActivar = storedIdsMembresiasActivar;
  else if (storedIdMembresiaActivar)
    confirmPayload.idMembresiaActivar = storedIdMembresiaActivar;

  return confirmPayload;
}

export function buildCallbackUrl(origin: string, storage: StorageLike): URL {
  const cbUrl = new URL(`${origin}/api/callback`);
  cbUrl.searchParams.set(
    "idCliente",
    storage.getItem(STORAGE_KEYS.idCliente) || "",
  );
  cbUrl.searchParams.set("acceptTerminos", "true");

  const rpId = storage.getItem(STORAGE_KEYS.idRegistroPendiente) || "";
  if (rpId) cbUrl.searchParams.set("idRegistroPendiente", rpId);

  const idMemActivar = storage.getItem(STORAGE_KEYS.idMembresiaActivar) || "";
  if (idMemActivar) cbUrl.searchParams.set("idMembresiaActivar", idMemActivar);

  const idsMemRaw = storage.getItem(STORAGE_KEYS.idsMembresiasActivar) || "";
  if (idsMemRaw) cbUrl.searchParams.set("idsMembresiasActivar", idsMemRaw);

  return cbUrl;
}
