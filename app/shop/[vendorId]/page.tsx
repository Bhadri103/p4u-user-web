import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import VendorDetailPage from "@/app/shop/VendorPage";

export const dynamicParams = true;

export function generateStaticParams() {
  // All vendor routes are resolved dynamically via API
  return [];
}

export default function VendorRoute({ params }: { params: { vendorId: string } }) {
  return (
    <div className="commerce-marketplace min-h-screen flex flex-col">
      <Header variant="marketplace" />
      <main className="flex-1">
       <VendorDetailPage vendorId={params.vendorId} />
      </main>
      <Footer />
    </div>
  );
}
