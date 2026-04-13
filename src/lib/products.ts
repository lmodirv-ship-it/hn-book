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
    id: "notion-startup-kit",
    name: "Startup OS — Notion Template",
    description: "The all-in-one Notion workspace for startups. Track OKRs, manage sprints, organize docs, and run your entire company from one dashboard. Used by 2,000+ founders worldwide.",
    shortDescription: "All-in-one Notion workspace for startups & founders",
    price: 29,
    originalPrice: 49,
    category: "Notion Templates",
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&h=400&fit=crop",
    features: ["OKR & Goal Tracker", "Sprint Board", "Meeting Notes DB", "CRM & Pipeline", "Wiki & Docs Hub", "Free Updates Forever"],
    badge: "Best Seller",
  },
  {
    id: "resume-pack",
    name: "Pro Resume Bundle",
    description: "5 ATS-optimized resume templates designed by hiring managers. Clean, modern layouts that pass applicant tracking systems and impress recruiters. Includes cover letter templates and interview prep guide.",
    shortDescription: "5 ATS-friendly resume templates + cover letters",
    price: 19,
    originalPrice: 39,
    category: "Resume Templates",
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&h=400&fit=crop",
    features: ["5 Resume Layouts", "ATS-Optimized", "Cover Letter Templates", "Interview Prep Guide", "Word & Google Docs", "Easy to Customize"],
    badge: "Popular",
  },
  {
    id: "social-media-kit",
    name: "Content Creator Toolkit",
    description: "200+ social media templates for Instagram, TikTok, LinkedIn, and Twitter. Canva-editable designs including posts, stories, carousels, and reels covers. Grow your brand with professional visuals.",
    shortDescription: "200+ editable social media templates for all platforms",
    price: 24,
    originalPrice: 44,
    category: "Design Templates",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=400&fit=crop",
    features: ["200+ Templates", "Instagram & TikTok", "LinkedIn & Twitter", "Canva Editable", "Brand Color Swap", "Monthly Updates"],
  },
  {
    id: "excel-finance",
    name: "Finance Dashboard — Excel",
    description: "Professional financial dashboard and budget tracker for freelancers and small businesses. Auto-calculates taxes, tracks expenses by category, generates monthly reports, and visualizes cash flow trends.",
    shortDescription: "Budget tracker & financial dashboard for freelancers",
    price: 15,
    originalPrice: 29,
    category: "Excel Templates",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop",
    features: ["Auto Tax Calc", "Expense Tracker", "Monthly Reports", "Cash Flow Charts", "Invoice Generator", "Works Offline"],
  },
];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
