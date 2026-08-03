  import Header from "@/components/layout/Header";
  import Profilepage from "./Profilepage";
  import Footer from "@/components/layout/Footer";
  
  export default function ProfileRoute() {
    return <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1"><Profilepage /></main>
      <Footer />
    </div>;
  }
