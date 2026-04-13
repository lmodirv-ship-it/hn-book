import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProductCard from "@/components/ProductCard";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";
import { products } from "@/lib/products";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      <HeroSection />

      {/* Products Section */}
      <section id="products" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Our Templates</h2>
            <p className="mt-3 text-muted-foreground">
              Professionally crafted, ready to use
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </div>
      </section>

      <div id="features">
        <FeaturesSection />
      </div>

      <Footer />
    </div>
  );
};

export default Index;
