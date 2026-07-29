import type { RegisterVendorPayload } from "@/lib/api/auth";

export type VendorKindChoice = "" | "PRODUCT" | "SERVICE" | "BOTH";

export interface VendorRegisterPersonal {
  name: string;
  phone: string;
  secondaryPhone: string;
  email: string;
}

export interface VendorRegisterBusiness {
  businessName: string;
  businessType: string;
  vendorKind: VendorKindChoice;
  categorySlug: string;
  serviceName: string;
  state: string;
  district: string;
  shopAddress: string;
}

export interface VendorRegisterKyc {
  aadhaarNumber: string;
  aadhaarFrontName: string;
  aadhaarBackName: string;
  pan: string;
  panCardName: string;
  gst: string;
  gstCertName: string;
}

export interface VendorRegisterBank {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
}

function normalizedPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits ? `+91${digits}` : null;
}

/** Canonical payload shared by vendor web/mobile and customer web/mobile. */
export function buildVendorRegisterPayload(input: {
  personal: VendorRegisterPersonal;
  business: VendorRegisterBusiness;
  kyc: VendorRegisterKyc;
  bank: VendorRegisterBank;
}): RegisterVendorPayload {
  const { personal, business, kyc, bank } = input;
  const effectiveKind = business.vendorKind || "PRODUCT";
  const wantsProduct = effectiveKind === "PRODUCT" || effectiveKind === "BOTH";
  const wantsService = effectiveKind === "SERVICE" || effectiveKind === "BOTH";
  const hasBank = Boolean(
    bank.bankName.trim() ||
      bank.accountHolderName.trim() ||
      bank.accountNumber.trim() ||
      bank.ifscCode.trim(),
  );

  return {
    vendorKind:
      effectiveKind === "SERVICE"
        ? "service"
        : effectiveKind === "BOTH"
          ? "both"
          : "product",
    vendorType: effectiveKind,
    ownerName: personal.name.trim(),
    businessName: business.businessName.trim(),
    businessType: business.businessType.trim() || null,
    email: personal.email.trim().toLowerCase() || null,
    phone: normalizedPhone(personal.phone),
    secondaryPhone: normalizedPhone(personal.secondaryPhone),
    categoriesJson:
      wantsProduct && business.categorySlug.trim()
        ? [business.categorySlug.trim()]
        : null,
    servicesJson:
      wantsService && business.serviceName.trim()
        ? [business.serviceName.trim()]
        : null,
    gst: kyc.gst.trim().toUpperCase() || null,
    pan: kyc.pan.trim().toUpperCase() || null,
    addressJson: {
      state: business.state.trim() || null,
      stateName: business.state.trim() || null,
      district: business.district.trim() || null,
      areaLocality: business.shopAddress.trim() || null,
      address: business.shopAddress.trim() || null,
    },
    documentsJson: {
      aadhaarNumber: kyc.aadhaarNumber || null,
      aadhaarFrontFileName: kyc.aadhaarFrontName || null,
      aadhaarBackFileName: kyc.aadhaarBackName || null,
      panCardFileName: kyc.panCardName || null,
      gstCertificateFileName: kyc.gstCertName || null,
    },
    bankJson: {
      version: 1,
      accounts: hasBank
        ? [
            {
              id: `primary-${Date.now()}`,
              bankName: bank.bankName.trim(),
              accountHolderName: bank.accountHolderName.trim(),
              accountNumber: bank.accountNumber.trim(),
              ifscCode: bank.ifscCode.trim().toUpperCase(),
              accountType: "savings",
              isPrimary: true,
            },
          ]
        : [],
    },
  };
}