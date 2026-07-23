"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { profileApi, type Address } from "@/lib/api/profile";
import { useAuth } from "@/providers/AuthContext";

const SELECTED_ADDRESS_KEY = "p4u_selected_address_id";
type AddressInput = Omit<Address, "id">;

interface AddressContextValue {
  addresses: Address[];
  selectedAddress: Address | null;
  selectedAddressId: string | null;
  isLoading: boolean;
  error: string | null;
  refreshAddresses: () => Promise<void>;
  selectAddress: (addressId: string | number) => void;
  createAddress: (data: AddressInput) => Promise<Address>;
  updateAddress: (addressId: string | number, data: Partial<Address>) => Promise<Address>;
  deleteAddress: (addressId: string | number) => Promise<void>;
  setDefaultAddress: (addressId: string | number) => Promise<Address>;
}

const AddressContext = createContext<AddressContextValue | null>(null);
const addressId = (value: string | number) => String(value);

function chooseAddress(items: Address[], preferredId?: string | null) {
  if (!items.length) return null;
  if (preferredId) {
    const preferred = items.find((item) => addressId(item.id) === preferredId);
    if (preferred) return preferred;
  }
  return items.find((item) => item.isDefault) ?? items[0];
}

export function formatAddress(address: Address | null | undefined) {
  if (!address) return "";
  return [address.line1, address.line2, address.city, address.state, address.pincode]
    .filter((part) => typeof part === "string" && part.trim())
    .join(", ");
}

export function formatAddressLabel(address: Address | null | undefined) {
  if (!address) return "Set your location";
  const place = [address.city, address.state].filter(Boolean).join(", ");
  return place || address.label || formatAddress(address);
}

export function AddressProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyAddresses = useCallback((items: Address[], preferredId?: string | null) => {
    setAddresses(items);
    const persisted = preferredId ?? (typeof window !== "undefined" ? localStorage.getItem(SELECTED_ADDRESS_KEY) : null);
    const selected = chooseAddress(items, persisted);
    const nextId = selected ? addressId(selected.id) : null;
    setSelectedAddressId(nextId);
    if (typeof window !== "undefined") {
      if (nextId) localStorage.setItem(SELECTED_ADDRESS_KEY, nextId);
      else localStorage.removeItem(SELECTED_ADDRESS_KEY);
    }
  }, []);

  const refreshAddresses = useCallback(async () => {
    if (!isLoggedIn) {
      applyAddresses([]);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      applyAddresses(await profileApi.getAddresses());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load saved addresses.");
      throw cause;
    } finally {
      setIsLoading(false);
    }
  }, [applyAddresses, isLoggedIn]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      applyAddresses([]);
      setError(null);
      return;
    }
    void refreshAddresses().catch(() => {});
  }, [applyAddresses, authLoading, isLoggedIn, refreshAddresses]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SELECTED_ADDRESS_KEY) applyAddresses(addresses, event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [addresses, applyAddresses]);

  const selectAddress = useCallback((id: string | number) => {
    const normalized = addressId(id);
    if (!addresses.some((item) => addressId(item.id) === normalized)) return;
    setSelectedAddressId(normalized);
    localStorage.setItem(SELECTED_ADDRESS_KEY, normalized);
  }, [addresses]);

  const createAddress = useCallback(async (data: AddressInput) => {
    setError(null);
    try {
      const created = await profileApi.createAddress(data);
      const next = data.isDefault
        ? [created, ...addresses.map((item) => ({ ...item, isDefault: false }))]
        : [created, ...addresses];
      applyAddresses(next, addressId(created.id));
      return created;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save address.");
      throw cause;
    }
  }, [addresses, applyAddresses]);

  const updateAddress = useCallback(async (id: string | number, data: Partial<Address>) => {
    setError(null);
    try {
      const updated = await profileApi.updateAddress(id, data);
      const normalized = addressId(id);
      const next = addresses.map((item) => {
        if (addressId(item.id) === normalized) return updated;
        return data.isDefault ? { ...item, isDefault: false } : item;
      });
      applyAddresses(next, selectedAddressId);
      return updated;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update address.");
      throw cause;
    }
  }, [addresses, applyAddresses, selectedAddressId]);

  const setDefaultAddress = useCallback(async (id: string | number) => {
    const updated = await updateAddress(id, { isDefault: true });
    selectAddress(id);
    return updated;
  }, [selectAddress, updateAddress]);

  const deleteAddress = useCallback(async (id: string | number) => {
    setError(null);
    const normalized = addressId(id);
    try {
      await profileApi.deleteAddress(id);
      let next = addresses.filter((item) => addressId(item.id) !== normalized);
      const removed = addresses.find((item) => addressId(item.id) === normalized);
      if (removed?.isDefault && next.length && !next.some((item) => item.isDefault)) {
        const replacement = await profileApi.updateAddress(next[0].id, { isDefault: true });
        next = next.map((item, index) => (index === 0 ? replacement : item));
      }
      applyAddresses(next, selectedAddressId === normalized ? null : selectedAddressId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete address.");
      await refreshAddresses().catch(() => {});
      throw cause;
    }
  }, [addresses, applyAddresses, refreshAddresses, selectedAddressId]);

  const selectedAddress = useMemo(
    () => chooseAddress(addresses, selectedAddressId),
    [addresses, selectedAddressId],
  );

  const value = useMemo<AddressContextValue>(() => ({
    addresses,
    selectedAddress,
    selectedAddressId,
    isLoading,
    error,
    refreshAddresses,
    selectAddress,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  }), [addresses, selectedAddress, selectedAddressId, isLoading, error, refreshAddresses, selectAddress, createAddress, updateAddress, deleteAddress, setDefaultAddress]);

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddresses() {
  const value = useContext(AddressContext);
  if (!value) throw new Error("useAddresses must be used inside AddressProvider");
  return value;
}