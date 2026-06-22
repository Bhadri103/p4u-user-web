import ProductRoute from "./ProductRoute";

export const dynamicParams = true;

export function generateStaticParams() {
  // All product routes are resolved dynamically via API
  return [];
}

export default function Page({ params }: { params: { vendorId: string; productId: string } }) {
  return <ProductRoute params={params} />;
}
