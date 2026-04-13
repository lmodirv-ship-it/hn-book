import productEbooks from "@/assets/product-ebooks.jpg";
import productCanva from "@/assets/product-canva.jpg";
import productCourses from "@/assets/product-courses.jpg";
import productPrompts from "@/assets/product-prompts.jpg";
import productDesign from "@/assets/product-design.jpg";
import productMarketing from "@/assets/product-marketing.jpg";
import productEcommerce from "@/assets/product-ecommerce.jpg";
import productLanguages from "@/assets/product-languages.jpg";

export interface Product {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice?: number;
  category: string;
  image: string;
  features: string[];
  badge?: string;
}

export const products: Product[] = [
  {
    id: "mega-ebook-bundle",
    name: "Mega eBook Bundle — 300K+ Books",
    description:
      "The ultimate digital library: over 300,000 eBooks plus 200,000 audiobooks and video books, all with full resale rights (PLR/MRR). Covers every niche from business and self-help to health, cooking, and technology. Start your own eBook store or use them as lead magnets — the possibilities are endless.",
    shortDescription: "300K+ eBooks & audiobooks with full resale rights (PLR/MRR)",
    price: 27,
    originalPrice: 97,
    category: "eBooks & PLR",
    image: productEbooks,
    features: [
      "300,000+ eBooks",
      "200,000+ Audiobooks & Video Books",
      "Full Resale Rights (PLR/MRR)",
      "All Niches Covered",
      "Instant Download",
      "Free Lifetime Updates",
    ],
    badge: "Best Seller",
  },
  {
    id: "canva-templates-pack",
    name: "Canva Templates Mega Pack — 23K+",
    description:
      "Over 23,000 premium Canva templates ready to edit and sell. Includes 20,000+ social media templates, 3,000+ bonus planners with 7,500 pages, and 6,000+ social media post designs. Perfect for content creators, agencies, and freelancers who want to save hours of design work.",
    shortDescription: "23,000+ editable Canva templates for social media & planners",
    price: 19,
    originalPrice: 59,
    category: "Design Templates",
    image: productCanva,
    features: [
      "20,000+ Canva Templates",
      "6,000+ Social Media Templates",
      "3,000+ Planner Templates (7,500 pages)",
      "200+ Planner Canva Templates",
      "Fully Editable in Canva",
      "Commercial Use License",
    ],
    badge: "Popular",
  },
  {
    id: "digital-marketing-bundle",
    name: "Digital Marketing Mastery Bundle",
    description:
      "Complete digital marketing education: 12+ premium courses covering Facebook Ads, Instagram Marketing, TikTok Ads, Google Ads, YouTube Ads, CPA Marketing, Affiliate Marketing, and more. Learn from top marketers and master every platform. Includes sales funnels and traffic strategies.",
    shortDescription: "12+ premium courses: Facebook, Instagram, TikTok, Google Ads & more",
    price: 34,
    originalPrice: 199,
    category: "Online Courses",
    image: productMarketing,
    features: [
      "12+ Premium Courses",
      "Facebook & Instagram Ads Mastery",
      "TikTok & Google Ads",
      "CPA & Affiliate Marketing",
      "Traffic Generation Strategies",
      "Sales Funnel Templates",
    ],
    badge: "Top Rated",
  },
  {
    id: "chatgpt-prompts-pack",
    name: "ChatGPT & Midjourney Prompts — 30K+",
    description:
      "Unlock the full power of AI with 30,000+ carefully crafted prompts. Includes 15,000+ ChatGPT prompts for content creation, marketing, coding, and business, plus 15,000+ Midjourney prompts for stunning AI art. Save hours of prompt engineering and get professional results instantly.",
    shortDescription: "30,000+ AI prompts for ChatGPT & Midjourney",
    price: 14,
    originalPrice: 49,
    category: "AI Tools",
    image: productPrompts,
    features: [
      "15,000+ ChatGPT Prompts",
      "15,000+ Midjourney Prompts",
      "All Categories Covered",
      "Copy-Paste Ready",
      "Business & Marketing Prompts",
      "Content Creation Prompts",
    ],
  },
  {
    id: "graphic-design-toolkit",
    name: "Graphic Design & Video Toolkit",
    description:
      "A comprehensive creative toolkit: Photoshop resources, 300+ professional logos, vector graphics, Lightroom presets, SVG icons, infographics, plus royalty-free music tracks and HD video clips. Everything a designer or content creator needs in one massive bundle.",
    shortDescription: "Photoshop, logos, vectors, video clips & royalty-free music",
    price: 22,
    originalPrice: 79,
    category: "Design Assets",
    image: productDesign,
    features: [
      "300+ Professional Logos",
      "Photoshop & Lightroom Presets",
      "Vector Graphics & SVG Icons",
      "Infographic Templates",
      "Royalty-Free Music Tracks",
      "HD Video Clips",
    ],
  },
  {
    id: "ecommerce-dropshipping",
    name: "E-Commerce & Dropshipping Bundle",
    description:
      "Everything you need to start a profitable online store: courses on Shopify dropshipping, Amazon FBA, eBay selling, AliExpress sourcing, and more. Learn from multiple expert instructors with step-by-step guides. Includes product research strategies and supplier databases.",
    shortDescription: "Complete Shopify, Amazon & eBay dropshipping courses",
    price: 29,
    originalPrice: 149,
    category: "Business Courses",
    image: productEcommerce,
    features: [
      "Shopify Dropshipping Course",
      "Amazon FBA & eBay Mastery",
      "AliExpress Sourcing Guide",
      "Product Research Strategies",
      "Step-by-Step Video Tutorials",
      "Supplier Database Access",
    ],
  },
  {
    id: "video-courses-bundle",
    name: "1000+ Video Courses Collection",
    description:
      "Access a massive library of over 1,000 premium video courses with full resale rights. Topics span digital marketing, entrepreneurship, personal development, technology, and more. Each course comes ready to sell or use for your own learning.",
    shortDescription: "1,000+ premium video courses with PLR resale rights",
    price: 24,
    originalPrice: 89,
    category: "Video Courses",
    image: productCourses,
    features: [
      "1,000+ Video Courses",
      "Full Resale Rights (PLR)",
      "Multiple Niches & Topics",
      "HD Quality Videos",
      "Ready to Resell",
      "Instant Download Access",
    ],
  },
  {
    id: "language-learning-bundle",
    name: "Language Learning Course Pack",
    description:
      "Master new languages with this comprehensive course collection. Includes full courses for English (beginner to TOEFL), French (beginner to DELF B2), and Spanish (all levels). Perfect for self-study with structured lessons, conversation practice, and grammar guides.",
    shortDescription: "English, French & Spanish — beginner to advanced courses",
    price: 17,
    originalPrice: 69,
    category: "Language Courses",
    image: productLanguages,
    features: [
      "English: Beginner to TOEFL",
      "French: A1 to DELF B2",
      "Spanish: All 4 Levels",
      "Grammar & Conversation",
      "Video Lessons Included",
      "Self-Paced Learning",
    ],
  },
];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
