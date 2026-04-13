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

// Category definitions for generation
const categoryData = [
  {
    category: "eBooks & PLR",
    image: productEbooks,
    templates: [
      { name: "{topic} eBook Bundle — {count}+ Books", short: "{count}+ eBooks on {topic} with full PLR resale rights", features: ["Full PLR Rights", "Instant Download", "Editable Source Files", "Commercial License", "Multiple Formats", "Free Updates"] },
      { name: "{topic} — Complete eBook Collection", short: "Comprehensive {topic} eBook library with MRR rights", features: ["Master Resale Rights", "PDF & EPUB Format", "Cover Designs Included", "Sales Page Template", "Email Swipes", "Bonus Content"] },
      { name: "{topic} PLR Articles Pack — {count}+", short: "{count}+ PLR articles on {topic} ready to publish", features: ["{count}+ Articles", "Word & TXT Format", "SEO Optimized", "Unique Content", "Private Label Rights", "Niche Targeted"] },
    ],
    topics: ["Self-Help", "Health & Fitness", "Business", "Marketing", "Finance", "Cooking", "Technology", "Relationships", "Mindfulness", "Productivity", "Leadership", "Real Estate", "Cryptocurrency", "Weight Loss", "Yoga", "Meditation", "Personal Development", "Time Management", "Public Speaking", "Freelancing", "Blogging", "SEO", "Copywriting", "Sales", "Negotiation", "Psychology", "Parenting", "Travel", "Photography", "Music", "Art", "Fashion", "Beauty", "Skincare", "Nutrition", "Vegan", "Keto Diet", "Intermittent Fasting", "Home Workout", "Running", "Swimming", "Golf", "Tennis", "Chess", "Gaming", "Anime", "Manga", "Comics", "Sci-Fi", "Fantasy", "Romance", "Mystery", "Thriller", "Horror", "Poetry", "Philosophy", "History", "Science", "Math", "Physics", "Chemistry", "Biology", "Astronomy", "Geography", "Politics", "Economics", "Sociology", "Anthropology", "Linguistics", "Education", "Teaching", "Tutoring", "Homeschooling", "Study Skills", "Memory", "Speed Reading", "Writing", "Journalism", "Screenwriting", "Podcasting", "Video Editing", "Graphic Design", "Web Design", "UI/UX", "Mobile Apps", "Cloud Computing", "Cybersecurity", "Data Science", "Machine Learning", "Blockchain", "NFTs", "Metaverse", "VR/AR", "IoT", "Robotics", "3D Printing", "Woodworking", "Gardening", "DIY Home", "Interior Design", "Architecture", "Car Maintenance", "Dog Training", "Cat Care", "Pet Health", "Bird Watching", "Fishing", "Camping", "Hiking", "Survival Skills", "Prepping", "First Aid", "Herbal Medicine", "Essential Oils", "Aromatherapy", "Massage", "Acupuncture", "Chiropractic", "Dental Health", "Mental Health", "Anxiety", "Depression", "ADHD", "Autism", "Dyslexia", "Retirement", "Estate Planning", "Tax Planning", "Insurance", "Budgeting", "Investing", "Stock Trading", "Forex Trading", "Options Trading", "Day Trading", "Swing Trading", "Value Investing", "Dividend Investing", "ETFs", "Mutual Funds", "Bonds"],
  },
  {
    category: "Design Templates",
    image: productCanva,
    templates: [
      { name: "{topic} Canva Templates — {count}+ Designs", short: "{count}+ editable Canva templates for {topic}", features: ["Canva Editable", "Commercial License", "Brand Color Swap", "All Sizes Included", "Print Ready", "Social Media Ready"] },
      { name: "{topic} Social Media Kit — {count}+ Posts", short: "{count}+ social media post templates for {topic}", features: ["Instagram & Facebook", "TikTok & Pinterest", "Stories & Reels", "Carousel Templates", "Highlight Covers", "Bio Templates"] },
      { name: "{topic} Planner Templates — {count} Pages", short: "{topic} digital planner with {count} editable pages", features: ["{count} Planner Pages", "Canva Editable", "Printable PDF", "Daily & Weekly Views", "Goal Tracking", "Habit Tracker"] },
    ],
    topics: ["Business", "Fitness", "Food & Restaurant", "Fashion", "Beauty & Skincare", "Travel", "Wedding", "Real Estate", "Education", "Coaching", "Podcast", "YouTube", "Blog", "E-commerce", "Photography", "Music", "Art Gallery", "Startup", "Tech Company", "Healthcare", "Dental", "Law Firm", "Accounting", "Consulting", "Marketing Agency", "Nonprofit", "Church", "Event Planning", "Interior Design", "Architecture", "Construction", "Automotive", "Pet Business", "Salon & Spa", "Gym & Fitness", "Yoga Studio", "Dance Studio", "Coffee Shop", "Bakery", "Florist", "Jewelry", "Clothing Brand", "Kids & Baby", "Sports Team", "Music Band", "DJ", "Photographer", "Videographer", "Freelancer", "Digital Nomad", "Life Coach", "Business Coach", "Motivational Speaker", "Author", "Influencer", "Content Creator", "Streamer", "Gamer", "Crypto", "NFT Artist", "SaaS Product", "Mobile App", "Portfolio", "Resume & CV"],
  },
  {
    category: "Online Courses",
    image: productMarketing,
    templates: [
      { name: "{topic} Masterclass — Complete Course", short: "Complete {topic} course from beginner to advanced", features: ["HD Video Lessons", "Downloadable Resources", "Certificate Included", "Lifetime Access", "Community Access", "Expert Instructor"] },
      { name: "{topic} — Professional Training", short: "Professional {topic} training with practical exercises", features: ["Step-by-Step Lessons", "Real-World Projects", "Quizzes & Tests", "Resale Rights", "Student Materials", "Instructor Notes"] },
    ],
    topics: ["Facebook Ads", "Instagram Marketing", "TikTok Marketing", "Google Ads", "YouTube Marketing", "LinkedIn Marketing", "Pinterest Marketing", "Twitter Marketing", "Email Marketing", "Content Marketing", "Affiliate Marketing", "Influencer Marketing", "SEO Mastery", "Copywriting", "Sales Funnel", "Landing Page", "Webinar Marketing", "Podcast Marketing", "Video Marketing", "Social Media Management", "Brand Building", "Personal Branding", "Public Relations", "Crisis Management", "Customer Service", "Lead Generation", "Conversion Optimization", "A/B Testing", "Analytics & Data", "Marketing Automation", "CRM Mastery", "HubSpot", "Salesforce", "Mailchimp", "ActiveCampaign", "Shopify", "WooCommerce", "WordPress", "Wix", "Squarespace", "Webflow", "Figma Design", "Adobe Photoshop", "Adobe Illustrator", "Adobe Premiere", "After Effects", "DaVinci Resolve", "Canva Pro", "ChatGPT Mastery", "Midjourney Art", "Stable Diffusion", "Python Programming", "JavaScript", "React Development", "Node.js", "PHP & Laravel", "Ruby on Rails", "Swift iOS", "Kotlin Android", "Flutter", "Unity Game Dev", "Unreal Engine", "Blender 3D", "AutoCAD", "SketchUp", "Excel Advanced", "Power BI", "Tableau", "SQL Database", "MongoDB", "AWS Cloud", "Azure Cloud", "Google Cloud", "Docker", "Kubernetes", "Git & GitHub", "Agile & Scrum", "Project Management", "Product Management", "UX Research", "UI Design", "Blockchain Dev", "Smart Contracts", "Solidity", "Web3", "Ethical Hacking", "Penetration Testing", "Network Security", "CompTIA", "CCNA Cisco"],
  },
  {
    category: "AI Tools",
    image: productPrompts,
    templates: [
      { name: "ChatGPT {topic} Prompts — {count}+", short: "{count}+ ChatGPT prompts for {topic}", features: ["{count}+ Prompts", "Copy-Paste Ready", "Categorized", "Regular Updates", "Bonus Templates", "Usage Guide"] },
      { name: "Midjourney {topic} Prompts — {count}+", short: "{count}+ Midjourney prompts for {topic} art", features: ["{count}+ Art Prompts", "Style Variations", "Aspect Ratios", "Negative Prompts", "Example Outputs", "Prompt Guide"] },
      { name: "AI {topic} Toolkit — Complete Bundle", short: "Complete AI toolkit for {topic} with prompts & templates", features: ["ChatGPT Prompts", "Midjourney Prompts", "DALL-E Prompts", "Workflow Templates", "Automation Scripts", "Video Tutorials"] },
    ],
    topics: ["Business & Marketing", "Content Writing", "Social Media", "Email Campaigns", "Blog Posts", "Product Descriptions", "Ad Copy", "SEO Content", "Resume & CV", "Cover Letters", "Business Plans", "Financial Analysis", "Legal Documents", "Academic Writing", "Creative Writing", "Poetry", "Storytelling", "Screenwriting", "Song Lyrics", "Game Design", "Character Design", "World Building", "Logo Design", "Brand Identity", "Web Design", "UI/UX Design", "Illustration", "Photography Editing", "Video Scripts", "Podcast Scripts", "Presentation Design", "Infographic Design", "Data Visualization", "Code Generation", "Code Review", "Debugging", "API Design", "Database Design", "System Architecture", "DevOps", "Testing", "Documentation", "Customer Support", "Sales Scripts", "Negotiation", "HR & Recruiting", "Training Materials", "Coaching", "Therapy & Wellness", "Meal Planning", "Fitness Programs", "Travel Planning", "Event Planning", "Real Estate Listings", "E-commerce Products", "Dropshipping", "Print on Demand", "Course Creation", "Ebook Writing"],
  },
  {
    category: "Design Assets",
    image: productDesign,
    templates: [
      { name: "{topic} Design Pack — {count}+ Assets", short: "{count}+ professional {topic} design assets", features: ["{count}+ Assets", "High Resolution", "Multiple Formats", "Commercial License", "Easy to Edit", "Instant Download"] },
      { name: "{topic} Bundle — Premium Collection", short: "Premium {topic} collection for designers & creators", features: ["Premium Quality", "Vector Files", "PSD Included", "PNG & SVG", "Print Ready", "Web Optimized"] },
    ],
    topics: ["Logo Templates", "Business Cards", "Letterheads", "Flyers & Posters", "Brochures", "Banners", "Social Media Graphics", "YouTube Thumbnails", "Twitch Overlays", "Stream Packages", "Icon Packs", "Illustration Sets", "Mockup Templates", "T-Shirt Designs", "Mug Designs", "Phone Cases", "Sticker Packs", "Emoji Sets", "Font Collections", "Brush Packs", "Texture Packs", "Pattern Collections", "Background Images", "Stock Photos", "Color Palettes", "Gradient Packs", "Shadow Packs", "UI Kits", "Wireframe Kits", "Dashboard Templates", "Landing Page Templates", "Email Templates", "Newsletter Templates", "Invoice Templates", "Proposal Templates", "Contract Templates", "Certificate Templates", "Badge Designs", "Award Templates", "Menu Templates", "Recipe Cards", "Invitation Templates", "Greeting Cards", "Calendar Templates", "Planner Inserts", "Worksheet Templates", "Infographic Templates", "Chart Templates", "Mind Map Templates", "Flowchart Templates", "Org Chart Templates", "Timeline Templates", "Roadmap Templates", "SWOT Templates", "Pitch Deck Templates", "Presentation Templates", "Report Templates", "Book Cover Templates", "Magazine Templates", "Catalog Templates"],
  },
  {
    category: "Business Courses",
    image: productEcommerce,
    templates: [
      { name: "{topic} — Complete Business Course", short: "Step-by-step {topic} course for entrepreneurs", features: ["Video Lessons", "Business Templates", "Case Studies", "Action Plans", "Community Access", "Certificate"] },
      { name: "{topic} Blueprint — Start to Profit", short: "From zero to profit with {topic}", features: ["Proven Framework", "Real Examples", "Financial Templates", "Marketing Plan", "Launch Checklist", "Bonus Resources"] },
    ],
    topics: ["Shopify Dropshipping", "Amazon FBA", "eBay Selling", "Etsy Business", "Print on Demand", "AliExpress Dropshipping", "Wholesale Business", "Private Label", "Subscription Box", "SaaS Business", "Digital Agency", "Freelancing Business", "Consulting Business", "Coaching Business", "Online Tutoring", "Course Creation", "Membership Site", "Community Building", "Newsletter Business", "Blog Monetization", "YouTube Channel", "Podcast Business", "TikTok Creator", "Instagram Business", "Pinterest Business", "Affiliate Marketing", "CPA Marketing", "Lead Generation Agency", "Social Media Agency", "SEO Agency", "PPC Agency", "Content Agency", "Video Production", "Photography Business", "Graphic Design Business", "Web Development Agency", "App Development", "AI Automation Agency", "Virtual Assistant", "Bookkeeping Business", "Tax Preparation", "Real Estate Investing", "Airbnb Business", "Rental Property", "House Flipping", "Wholesaling Real Estate", "Stock Trading", "Forex Trading", "Crypto Trading", "Options Trading", "Day Trading Academy", "Vending Machine Business", "Laundromat Business", "Car Wash Business", "Food Truck", "Catering Business", "Personal Chef", "Bakery Business", "Coffee Shop", "Clothing Brand", "Jewelry Business"],
  },
  {
    category: "Video Courses",
    image: productCourses,
    templates: [
      { name: "{topic} Video Course — Full Access", short: "Complete {topic} video course with lifetime access", features: ["HD Video Content", "Downloadable Files", "Practice Exercises", "Quizzes", "Resale Rights", "Lifetime Updates"] },
      { name: "{topic} — Video Training Series", short: "Professional {topic} video training for all levels", features: ["Multi-Part Series", "Beginner to Advanced", "Screen Recordings", "Live Examples", "Resource Files", "Community Forum"] },
    ],
    topics: ["Web Development", "Mobile Development", "Game Development", "Data Science", "Machine Learning", "Deep Learning", "Computer Vision", "NLP", "Robotics", "IoT Projects", "Arduino", "Raspberry Pi", "3D Printing", "CAD Design", "Animation", "Motion Graphics", "VFX", "Sound Design", "Music Production", "DJ Skills", "Guitar Lessons", "Piano Lessons", "Singing Lessons", "Drawing & Sketching", "Oil Painting", "Watercolor", "Digital Art", "Calligraphy", "Pottery", "Woodworking", "Metalworking", "Sewing", "Knitting", "Jewelry Making", "Candle Making", "Soap Making", "Leather Craft", "Paper Craft", "Origami", "Photography Basics", "Portrait Photography", "Landscape Photography", "Food Photography", "Product Photography", "Drone Photography", "Astrophotography", "Street Photography", "Wedding Photography", "Video Cinematography", "Documentary Filmmaking", "Short Film", "Screenwriting", "Voice Acting", "Stand-up Comedy", "Magic Tricks", "Bartending", "Wine Tasting", "Coffee Brewing", "Bread Baking", "Cake Decorating"],
  },
  {
    category: "Language Courses",
    image: productLanguages,
    templates: [
      { name: "{topic} — Complete Language Course", short: "Learn {topic} from beginner to fluent", features: ["All Levels A1-C2", "Video Lessons", "Audio Practice", "Grammar Guide", "Vocabulary Lists", "Cultural Notes"] },
      { name: "{topic} — Conversation Mastery", short: "Master {topic} conversation skills fast", features: ["Real Dialogues", "Pronunciation Guide", "Slang & Idioms", "Role Play Exercises", "Audio Files", "PDF Workbook"] },
    ],
    topics: ["English", "French", "Spanish", "German", "Italian", "Portuguese", "Dutch", "Russian", "Polish", "Czech", "Ukrainian", "Turkish", "Arabic", "Hebrew", "Persian", "Hindi", "Urdu", "Bengali", "Tamil", "Chinese Mandarin", "Chinese Cantonese", "Japanese", "Korean", "Thai", "Vietnamese", "Indonesian", "Malay", "Filipino", "Swahili", "Amharic", "Yoruba", "Zulu", "Afrikaans", "Swedish", "Norwegian", "Danish", "Finnish", "Greek", "Romanian", "Hungarian", "Bulgarian", "Serbian", "Croatian", "Slovenian", "Slovak", "Lithuanian", "Latvian", "Estonian", "Georgian", "Armenian", "Sign Language ASL", "Sign Language BSL", "Latin", "Ancient Greek", "Sanskrit", "Esperanto", "Irish Gaelic", "Scottish Gaelic", "Welsh", "Basque", "Catalan"],
  },
];

// Seeded random for consistent results
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateProducts(): Product[] {
  const allProducts: Product[] = [];
  let globalIndex = 0;

  const badges = ["Best Seller", "Popular", "Top Rated", "New", "Hot", "Trending", undefined, undefined, undefined, undefined];

  for (const cat of categoryData) {
    for (let topicIdx = 0; topicIdx < cat.topics.length; topicIdx++) {
      const topic = cat.topics[topicIdx];
      const templateIdx = topicIdx % cat.templates.length;
      const template = cat.templates[templateIdx];

      const rand = seededRandom(globalIndex + 42);
      const count = Math.floor(rand * 9000 + 1000);
      const basePrice = Math.floor(seededRandom(globalIndex + 7) * 30 + 7);
      const originalPrice = Math.floor(basePrice * (2 + seededRandom(globalIndex + 13) * 3));
      const badgeIdx = Math.floor(seededRandom(globalIndex + 99) * badges.length);

      const product: Product = {
        id: `${cat.category.toLowerCase().replace(/[^a-z]/g, "-")}-${topic.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${globalIndex}`,
        name: template.name.replace("{topic}", topic).replace("{count}", String(count)),
        description: `Premium ${topic} digital product with full resale rights. ${template.short.replace("{topic}", topic).replace("{count}", String(count))}. This is a complete package designed for entrepreneurs, content creators, and digital marketers who want to start selling immediately. All products come with PLR/MRR rights so you can resell them as your own and keep 100% of profits.`,
        shortDescription: template.short.replace("{topic}", topic).replace("{count}", String(count)),
        price: basePrice,
        originalPrice,
        category: cat.category,
        image: cat.image,
        features: template.features.map((f) => f.replace("{count}", String(count))),
        badge: badges[badgeIdx],
      };

      allProducts.push(product);
      globalIndex++;
    }
  }

  return allProducts;
}

export const products: Product[] = generateProducts();

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((p) => p.category === category);
}

export const categories = [...new Set(products.map((p) => p.category))];
