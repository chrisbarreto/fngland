import { describe, it, expect, beforeEach } from "vitest";
import {
  STORAGE_KEYS,
  storeMembresiasSeleccionadas,
  buildConfirmPayload,
  buildCallbackUrl,
  type StorageLike,
} from "../lib/debito-automatico";

function createMockStorage(): StorageLike & Record<string, string> {
  const store: Record<string, string> = {};
  return {
    ...store,
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
  } as StorageLike & Record<string, string>;
}

describe("storeMembresiasSeleccionadas", () => {
  let storage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    storage = createMockStorage();
  });

  describe("múltiples membresías (>1)", () => {
    it("debe guardar idsMembresiasActivar como JSON y borrar idMembresiaActivar", () => {
      const ids = ["mem-1", "mem-2", "mem-3"];
      storeMembresiasSeleccionadas(storage, ids);

      expect(storage.getItem(STORAGE_KEYS.idsMembresiasActivar)).toBe(
        JSON.stringify(ids),
      );
      expect(storage.getItem(STORAGE_KEYS.idMembresiaActivar)).toBeNull();
    });

    it("NO debe borrar idsMembresiasActivar inmediatamente después de guardarlo (BUG original)", () => {
      const ids = ["mem-1", "mem-2", "mem-3"];
      storeMembresiasSeleccionadas(storage, ids);

      const stored = storage.getItem(STORAGE_KEYS.idsMembresiasActivar);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(ids);
    });

    it("debe persistir los IDs para que handleBancardResponse los pueda leer", () => {
      const ids = ["mem-184", "mem-191", "mem-194"];
      storeMembresiasSeleccionadas(storage, ids);

      const raw = storage.getItem(STORAGE_KEYS.idsMembresiasActivar);
      expect(raw).toBe(JSON.stringify(ids));
      expect(JSON.parse(raw!)).toEqual(ids);
    });

    it("debe sobreescribir valores previos correctamente", () => {
      storage.setItem(STORAGE_KEYS.idMembresiaActivar, "old-single");

      storeMembresiasSeleccionadas(storage, ["new-1", "new-2"]);

      expect(storage.getItem(STORAGE_KEYS.idMembresiaActivar)).toBeNull();
      expect(
        JSON.parse(storage.getItem(STORAGE_KEYS.idsMembresiasActivar)!),
      ).toEqual(["new-1", "new-2"]);
    });
  });

  describe("membresía única (=1)", () => {
    it("debe guardar idMembresiaActivar y borrar idsMembresiasActivar", () => {
      storeMembresiasSeleccionadas(storage, ["mem-1"]);

      expect(storage.getItem(STORAGE_KEYS.idMembresiaActivar)).toBe("mem-1");
      expect(storage.getItem(STORAGE_KEYS.idsMembresiasActivar)).toBeNull();
    });

    it("debe sobreescribir valores previos correctamente", () => {
      storage.setItem(
        STORAGE_KEYS.idsMembresiasActivar,
        JSON.stringify(["old-1", "old-2"]),
      );

      storeMembresiasSeleccionadas(storage, ["new-single"]);

      expect(storage.getItem(STORAGE_KEYS.idMembresiaActivar)).toBe(
        "new-single",
      );
      expect(storage.getItem(STORAGE_KEYS.idsMembresiasActivar)).toBeNull();
    });
  });
});

describe("buildConfirmPayload", () => {
  let storage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    storage = createMockStorage();
    storage.setItem(STORAGE_KEYS.idCliente, "client-uuid-123");
  });

  describe("con múltiples membresías", () => {
    it("debe incluir idsMembresiasActivar en el payload cuando hay múltiples", () => {
      const ids = ["mem-1", "mem-2", "mem-3"];
      storage.setItem(STORAGE_KEYS.idsMembresiasActivar, JSON.stringify(ids));

      const payload = buildConfirmPayload(storage);

      expect(payload.idCliente).toBe("client-uuid-123");
      expect(payload.acceptTerminos).toBe(true);
      expect(payload.idsMembresiasActivar).toEqual(ids);
      expect(payload.idMembresiaActivar).toBeUndefined();
    });

    it("debe priorizar idsMembresiasActivar sobre idMembresiaActivar cuando ambos existen", () => {
      storage.setItem(
        STORAGE_KEYS.idsMembresiasActivar,
        JSON.stringify(["mem-a", "mem-b"]),
      );
      storage.setItem(STORAGE_KEYS.idMembresiaActivar, "mem-single");

      const payload = buildConfirmPayload(storage);

      expect(payload.idsMembresiasActivar).toEqual(["mem-a", "mem-b"]);
      expect(payload.idMembresiaActivar).toBeUndefined();
    });

    it("debe incluir idRegistroPendiente cuando existe", () => {
      storage.setItem(
        STORAGE_KEYS.idsMembresiasActivar,
        JSON.stringify(["mem-1", "mem-2"]),
      );
      storage.setItem(STORAGE_KEYS.idRegistroPendiente, "rp-uuid-456");

      const payload = buildConfirmPayload(storage);

      expect(payload.idRegistroPendiente).toBe("rp-uuid-456");
      expect(payload.idsMembresiasActivar).toEqual(["mem-1", "mem-2"]);
    });
  });

  describe("con membresía única", () => {
    it("debe incluir idMembresiaActivar cuando es una sola membresía", () => {
      storage.setItem(STORAGE_KEYS.idMembresiaActivar, "mem-single");

      const payload = buildConfirmPayload(storage);

      expect(payload.idMembresiaActivar).toBe("mem-single");
      expect(payload.idsMembresiasActivar).toBeUndefined();
    });
  });

  describe("sin membresías (caso nuevo registro)", () => {
    it("debe incluir solo idCliente y acceptTerminos cuando no hay membresías", () => {
      const payload = buildConfirmPayload(storage);

      expect(payload).toEqual({
        idCliente: "client-uuid-123",
        acceptTerminos: true,
      });
    });

    it("debe lanzar error cuando no hay idCliente", () => {
      storage.removeItem(STORAGE_KEYS.idCliente);

      expect(() => buildConfirmPayload(storage)).toThrow(
        "No se encontró el cliente",
      );
    });
  });

  describe("manejo de JSON inválido en idsMembresiasActivar", () => {
    it("debe ignorar IDs inválidos y usar idMembresiaActivar como fallback", () => {
      storage.setItem(STORAGE_KEYS.idsMembresiasActivar, "invalid-json{{{");
      storage.setItem(STORAGE_KEYS.idMembresiaActivar, "mem-fallback");

      const payload = buildConfirmPayload(storage);

      expect(payload.idMembresiaActivar).toBe("mem-fallback");
      expect(payload.idsMembresiasActivar).toBeUndefined();
    });
  });
});

describe("buildCallbackUrl", () => {
  let storage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    storage = createMockStorage();
    storage.setItem(STORAGE_KEYS.idCliente, "client-uuid-123");
  });

  describe("con múltiples membresías", () => {
    it("debe incluir idsMembresiasActivar en la URL de callback", () => {
      const ids = ["mem-1", "mem-2", "mem-3"];
      storage.setItem(STORAGE_KEYS.idsMembresiasActivar, JSON.stringify(ids));

      const url = buildCallbackUrl("https://landing.formulang.com.py", storage);

      expect(url.searchParams.get("idCliente")).toBe("client-uuid-123");
      expect(url.searchParams.get("acceptTerminos")).toBe("true");
      expect(url.searchParams.get("idsMembresiasActivar")).toBe(
        JSON.stringify(ids),
      );
      expect(url.searchParams.get("idMembresiaActivar")).toBeNull();
    });

    it("debe incluir idRegistroPendiente cuando existe", () => {
      storage.setItem(
        STORAGE_KEYS.idsMembresiasActivar,
        JSON.stringify(["mem-1", "mem-2"]),
      );
      storage.setItem(STORAGE_KEYS.idRegistroPendiente, "rp-uuid-789");

      const url = buildCallbackUrl("https://landing.formulang.com.py", storage);

      expect(url.searchParams.get("idRegistroPendiente")).toBe("rp-uuid-789");
      expect(url.searchParams.get("idsMembresiasActivar")).toBe(
        JSON.stringify(["mem-1", "mem-2"]),
      );
    });
  });

  describe("con membresía única", () => {
    it("debe incluir idMembresiaActivar en la URL de callback", () => {
      storage.setItem(STORAGE_KEYS.idMembresiaActivar, "mem-single");

      const url = buildCallbackUrl("https://landing.formulang.com.py", storage);

      expect(url.searchParams.get("idMembresiaActivar")).toBe("mem-single");
      expect(url.searchParams.get("idsMembresiasActivar")).toBeNull();
    });
  });

  describe("sin membresías", () => {
    it("debe incluir solo idCliente y acceptTerminos en la URL", () => {
      const url = buildCallbackUrl("https://landing.formulang.com.py", storage);

      expect(url.searchParams.get("idCliente")).toBe("client-uuid-123");
      expect(url.searchParams.get("acceptTerminos")).toBe("true");
      expect(url.searchParams.get("idsMembresiasActivar")).toBeNull();
      expect(url.searchParams.get("idMembresiaActivar")).toBeNull();
      expect(url.searchParams.get("idRegistroPendiente")).toBeNull();
    });
  });

  describe("flujo end-to-end: store → callback URL", () => {
    it("múltiples membresías: los IDs persisten desde store hasta callback URL", () => {
      const ids = ["NG184", "NG191", "NG194"];
      storeMembresiasSeleccionadas(storage, ids);

      const url = buildCallbackUrl("https://landing.formulang.com.py", storage);

      expect(url.searchParams.get("idsMembresiasActivar")).toBe(
        JSON.stringify(ids),
      );
      expect(url.searchParams.get("idMembresiaActivar")).toBeNull();
    });

    it("membresía única: el ID persiste desde store hasta callback URL", () => {
      storeMembresiasSeleccionadas(storage, ["NG184"]);

      const url = buildCallbackUrl("https://landing.formulang.com.py", storage);

      expect(url.searchParams.get("idMembresiaActivar")).toBe("NG184");
      expect(url.searchParams.get("idsMembresiasActivar")).toBeNull();
    });

    it("múltiples membresías: los IDs persisten desde store hasta confirm payload", () => {
      const ids = ["mem-1", "mem-2", "mem-3"];
      storeMembresiasSeleccionadas(storage, ids);

      const payload = buildConfirmPayload(storage);

      expect(payload.idsMembresiasActivar).toEqual(ids);
      expect(payload.idMembresiaActivar).toBeUndefined();
    });

    it("membresía única: el ID persiste desde store hasta confirm payload", () => {
      storeMembresiasSeleccionadas(storage, ["mem-single"]);

      const payload = buildConfirmPayload(storage);

      expect(payload.idMembresiaActivar).toBe("mem-single");
      expect(payload.idsMembresiasActivar).toBeUndefined();
    });
  });
});
