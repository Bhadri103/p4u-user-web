import type { RegisterVendorPayload } from "@/lib/api/auth";

export type VendorKindChoice = "PRODUCT" | "SERVICE";

/** Personal step — user-web wizard (also maps into vendor `addressJson`). */
export interface VendorRegisterPersonal {
  name: string;
  phone: string;
  secondaryPhone: string;
  email: string;
  state: string;
  district: string;
  pincode: string;
  facebook: string;
  instagram: string;
}

/** Business step — aligned with vendor-web `register/page.tsx` Details fields. */
export interface VendorRegisterBusiness {
  businessName: string;
  vendorKind: VendorKindChoice;
  categorySlug: string;
  serviceName: string;
  gst: string;
  pan: string;
  stateCode: string;
  shopAddress: string;
}

export interface VendorRegisterKyc {
  gstCertName: string;
  panCardName: string;
}

export interface VendorRegisterBank {
  bankName: string;
  ifscCode: string;
  accountHolderName: string;
  accountNumber: string;
}

/**
 * Builds the same JSON body as `p4u-new-vendor-web/app/register/page.tsx` →
 * `authApi.registerVendor()` → `POST /api/auth/public/vendor/register`.
 *
 * User-web adds personal/location/social keys inside `addressJson` for admin review;
 * core vendor columns (`ownerName`, `gst`, `bankJson`, etc.) match vendor portal.
 */
export function buildVendorRegisterPayload(input: {
  personal: VendorRegisterPersonal;
  business: VendorRegisterBusiness;
  kyc: VendorRegisterKyc;
  bank: VendorRegisterBank;
}): RegisterVendorPayload {
  const { personal, business, kyc, bank } = input;
  const vendorKind = business.vendorKind;
  const stateName = personal.state.trim();

  return {
    vendorKind: vendorKind === "SERVICE" ? "service" : "product",
    vendorType: vendorKind,
    ownerName: personal.name.trim(),
    businessName: business.businessName.trim(),
    email: personal.email.trim() || null,
    phone: personal.phone.trim(),
    categoriesJson:
      vendorKind === "PRODUCT" && business.categorySlug.trim()
        ? [business.categorySlug.trim()]
        : null,
    servicesJson:
      vendorKind === "SERVICE" && business.serviceName.trim()
        ? [business.serviceName.trim()]
        : null,
    gst: business.gst.trim() || null,
    pan: business.pan.trim() || null,
    addressJson: {
      // Vendor portal field names (admin approval maps these to catalog_vendors)
      state: stateName || null,
      stateName: stateName || null,
      stateCode: business.stateCode.trim() || null,
      areaLocality: business.shopAddress.trim() || null,
      // User-web personal / location extras (stored in same JSON blob)
      district: personal.district.trim() || null,
      pincode: personal.pincode.trim() || null,
      secondaryPhone: personal.secondaryPhone.trim() || null,
      facebook: personal.facebook.trim() || null,
      instagram: personal.instagram.trim() || null,
    },
    documentsJson: {
      gstCertificateFileName: kyc.gstCertName || null,
      panCardFileName: kyc.panCardName || null,
    },
    bankJson: {
      bankName: bank.bankName.trim() || null,
      ifscCode: bank.ifscCode.trim() || null,
      accountHolderName: bank.accountHolderName.trim() || null,
      accountNumber: bank.accountNumber.trim() || null,
    },
  };
}
