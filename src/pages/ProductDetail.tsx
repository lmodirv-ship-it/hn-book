import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookCover from "@/components/BookCover";
import { getProduct, products } from "@/lib/products";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const product = getProduct(id || "");

  if (!product) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto flex flex-col items-center justify-center px-4 py-32">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <Button asChild className="mt-6">
            <Link to="/">Back to Store</Link>
          </Button>
        </div>
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Store
        </Link>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-2xl border"
          >
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{product.category}</Badge>
              {product.badge && (
                <Badge className="bg-primary text-primary-foreground">{product.badge}</Badge>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-bold md:text-4xl">{product.name}</h1>

            <div className="mt-3 flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">(128 reviews)</span>
            </div>

            <p className="mt-6 text-muted-foreground leading-relaxed">{product.description}</p>

            <Separator className="my-6" />

            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold">${product.price}</span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    ${product.originalPrice}
                  </span>
                  <Badge variant="destructive">Save {discount}%</Badge>
                </>
              )}
            </div>

            <Button size="lg" className="mt-8 w-full gap-2 text-base">
              <ShoppingCart className="h-5 w-5" /> Buy Now — ${product.price}
            </Button>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Instant download • 30-day money-back guarantee
            </p>

            <Separator className="my-6" />

            <div>
              <h3 className="text-lg font-semibold">What's Included</h3>
              <ul className="mt-4 space-y-3">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20">
                      <Check className="h-3 w-3 text-accent" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetail;
