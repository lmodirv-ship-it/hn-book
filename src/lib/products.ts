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

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface CatTemplate {
  name: string;
  short: string;
  features: string[];
}

interface CatDef {
  category: string;
  image: string;
  templates: CatTemplate[];
  topics: string[];
}

const t = (n: string, s: string, f: string[]): CatTemplate => ({ name: n, short: s, features: f });

const categoryData: CatDef[] = [
  {
    category: "eBooks & PLR",
    image: productEbooks,
    templates: [
      t("{topic} eBook Bundle — {count}+ Books", "{count}+ eBooks on {topic} with full PLR resale rights", ["Full PLR Rights", "Instant Download", "Editable Source Files", "Commercial License", "Multiple Formats", "Free Updates"]),
      t("{topic} — Complete eBook Collection", "Comprehensive {topic} eBook library with MRR rights", ["Master Resale Rights", "PDF & EPUB", "Cover Designs", "Sales Page Template", "Email Swipes", "Bonus Content"]),
      t("{topic} PLR Articles — {count}+", "{count}+ PLR articles on {topic} ready to publish", ["{count}+ Articles", "Word & TXT", "SEO Optimized", "Unique Content", "PLR Rights", "Niche Targeted"]),
    ],
    topics: "Self-Help,Health & Fitness,Business,Marketing,Finance,Cooking,Technology,Relationships,Mindfulness,Productivity,Leadership,Real Estate,Cryptocurrency,Weight Loss,Yoga,Meditation,Personal Development,Time Management,Public Speaking,Freelancing,Blogging,SEO,Copywriting,Sales,Negotiation,Psychology,Parenting,Travel,Photography,Music,Art,Fashion,Beauty,Skincare,Nutrition,Vegan,Keto Diet,Intermittent Fasting,Home Workout,Running,Swimming,Golf,Tennis,Chess,Gaming,Anime,Manga,Comics,Sci-Fi,Fantasy,Romance,Mystery,Thriller,Horror,Poetry,Philosophy,History,Science,Math,Physics,Chemistry,Biology,Astronomy,Geography,Politics,Economics,Sociology,Anthropology,Linguistics,Education,Teaching,Tutoring,Homeschooling,Study Skills,Memory Techniques,Speed Reading,Creative Writing,Journalism,Screenwriting,Podcasting,Video Editing,Graphic Design,Web Design,UI/UX Design,Mobile Apps,Cloud Computing,Cybersecurity,Data Science,Machine Learning,Blockchain,NFTs,IoT,Robotics,3D Printing,Woodworking,Gardening,DIY Home,Interior Design,Architecture,Car Maintenance,Dog Training,Cat Care,Pet Health,Bird Watching,Fishing,Camping,Hiking,Survival Skills,Prepping,First Aid,Herbal Medicine,Essential Oils,Aromatherapy,Massage Therapy,Dental Health,Mental Health,Anxiety Relief,Depression Help,Retirement Planning,Estate Planning,Tax Planning,Insurance Guide,Budgeting,Investing,Stock Trading,Forex Trading,Options Trading,Day Trading,Value Investing,Dividend Strategy,ETFs Guide,Mutual Funds,Bonds Trading,Passive Income,Side Hustles,Remote Work,Digital Nomad,Minimalism,Decluttering,Organization,Meal Prep,Smoothie Recipes,Paleo Diet,Mediterranean Diet,Gluten Free,Diabetes Management,Heart Health,Back Pain Relief,Sleep Improvement,Stress Management,Confidence Building,Social Skills,Dating Advice,Marriage Counseling,Divorce Recovery,Grief Support,Addiction Recovery,Anger Management,Emotional Intelligence,Critical Thinking,Problem Solving,Decision Making,Goal Setting,Vision Board,Manifestation,Law of Attraction,Affirmations,Gratitude Practice,Journaling,Morning Routine,Evening Routine,Habit Formation,Procrastination,Focus Techniques,Deep Work,Flow State,Biohacking,Longevity,Anti-Aging,Supplements Guide,Protein Guide,Bodybuilding,Calisthenics,CrossFit,Pilates,Stretching,Flexibility,Martial Arts,Boxing,MMA,Judo,Karate,Taekwondo,Kickboxing,Wrestling".split(","),
  },
  {
    category: "Design Templates",
    image: productCanva,
    templates: [
      t("{topic} Canva Templates — {count}+", "{count}+ editable Canva templates for {topic}", ["Canva Editable", "Commercial License", "Brand Colors", "All Sizes", "Print Ready", "Social Ready"]),
      t("{topic} Social Media Kit — {count}+", "{count}+ social media templates for {topic}", ["Instagram & Facebook", "TikTok & Pinterest", "Stories & Reels", "Carousel Templates", "Highlights", "Bio Templates"]),
      t("{topic} Planner — {count} Pages", "{topic} digital planner with {count} editable pages", ["{count} Pages", "Canva Editable", "Printable PDF", "Daily & Weekly", "Goal Tracking", "Habit Tracker"]),
    ],
    topics: "Business,Fitness,Restaurant,Fashion,Beauty,Skincare,Travel,Wedding,Real Estate,Education,Coaching,Podcast,YouTube,Blog,E-commerce,Photography,Music,Art Gallery,Startup,Tech Company,Healthcare,Dental,Law Firm,Accounting,Consulting,Marketing Agency,Nonprofit,Church,Event Planning,Interior Design,Architecture,Construction,Automotive,Pet Business,Salon & Spa,Gym,Yoga Studio,Dance Studio,Coffee Shop,Bakery,Florist,Jewelry,Clothing Brand,Kids & Baby,Sports Team,Music Band,DJ & Producer,Photographer,Videographer,Freelancer,Digital Nomad,Life Coach,Business Coach,Motivational Speaker,Author,Influencer,Content Creator,Streamer,Gamer,Crypto Brand,NFT Artist,SaaS Product,Mobile App,Portfolio,Resume & CV,Tattoo Studio,Barber Shop,Nail Salon,Makeup Artist,Hair Stylist,Personal Trainer,Nutritionist,Therapist,Chiropractor,Veterinarian,Pharmacy,Optical Store,Bookstore,Library,Museum,Theater,Cinema,Bowling Alley,Escape Room,Amusement Park,Hotel,Hostel,Airbnb,Campground,Resort,Cruise,Airline,Car Rental,Moving Company,Cleaning Service,Landscaping,Plumbing,Electrician,HVAC,Roofing,Painting,Handyman,Pest Control,Pool Service,Security Company,Insurance Agency,Financial Advisor,Mortgage Broker,Credit Repair,Debt Management,Wealth Management,Retirement Planning,Student Loans,Scholarship,University,Online School,Daycare,Preschool,Elementary School,High School,Tutoring Center,Language School,Coding Bootcamp,Art School,Music School,Culinary School,Driving School,Flight School,Surfing School,Ski Resort,Golf Course,Tennis Club,Boxing Gym,MMA Gym,Rock Climbing".split(","),
  },
  {
    category: "Online Courses",
    image: productMarketing,
    templates: [
      t("{topic} Masterclass — Complete", "Complete {topic} course beginner to advanced", ["HD Video", "Resources", "Certificate", "Lifetime Access", "Community", "Expert Instructor"]),
      t("{topic} — Pro Training", "Professional {topic} training with exercises", ["Step-by-Step", "Real Projects", "Quizzes", "Resale Rights", "Materials", "Instructor Notes"]),
    ],
    topics: "Facebook Ads,Instagram Marketing,TikTok Marketing,Google Ads,YouTube Marketing,LinkedIn Marketing,Pinterest Marketing,Twitter Marketing,Email Marketing,Content Marketing,Affiliate Marketing,Influencer Marketing,SEO Mastery,Copywriting Pro,Sales Funnel,Landing Pages,Webinar Marketing,Podcast Marketing,Video Marketing,Social Media Mgmt,Brand Building,Personal Branding,Public Relations,Crisis Management,Customer Service,Lead Generation,Conversion Optimization,A/B Testing,Analytics & Data,Marketing Automation,CRM Mastery,HubSpot Pro,Salesforce Admin,Mailchimp Pro,ActiveCampaign,Shopify Mastery,WooCommerce Pro,WordPress Dev,Wix Expert,Squarespace Pro,Webflow Design,Figma Design,Photoshop Pro,Illustrator Pro,Premiere Pro,After Effects,DaVinci Resolve,Canva Pro Master,ChatGPT Mastery,Midjourney Art,Stable Diffusion,Python Basics,Python Advanced,JavaScript Basics,JavaScript Advanced,React Development,Vue.js Dev,Angular Dev,Node.js Backend,PHP & Laravel,Ruby on Rails,Swift iOS Dev,Kotlin Android,Flutter Cross-Platform,Unity Game Dev,Unreal Engine,Blender 3D,AutoCAD Design,SketchUp Pro,Excel Advanced,Power BI Expert,Tableau Analytics,SQL Database,MongoDB NoSQL,PostgreSQL,AWS Cloud Pro,Azure Cloud,Google Cloud,Docker Mastery,Kubernetes,Git & GitHub,Agile & Scrum,Project Management,Product Management,UX Research,UI Design Pro,Blockchain Dev,Smart Contracts,Solidity Coding,Web3 Development,Ethical Hacking,Penetration Testing,Network Security,CompTIA Prep,CCNA Cisco,Linux Admin,Windows Server,VMware,Terraform,Ansible,Jenkins CI/CD,GraphQL,REST API Design,Microservices,System Design,Data Structures,Algorithms,C++ Programming,C# Development,Java Programming,Go Language,Rust Programming,TypeScript Pro,Next.js Framework,Nuxt.js Framework,Django Web Dev,FastAPI,Spring Boot,Express.js,NestJS,Svelte Framework,Tailwind CSS,Bootstrap 5,Material UI,Sass & SCSS,CSS Animation,WebGL & Three.js,PWA Development,Electron Desktop,React Native,Ionic Framework,Xamarin Dev,SwiftUI,Jetpack Compose".split(","),
  },
  {
    category: "AI Tools",
    image: productPrompts,
    templates: [
      t("ChatGPT {topic} Prompts — {count}+", "{count}+ ChatGPT prompts for {topic}", ["{count}+ Prompts", "Copy-Paste Ready", "Categorized", "Regular Updates", "Templates", "Usage Guide"]),
      t("Midjourney {topic} — {count}+", "{count}+ Midjourney prompts for {topic}", ["{count}+ Art Prompts", "Style Variations", "Aspect Ratios", "Negative Prompts", "Examples", "Prompt Guide"]),
      t("AI {topic} Toolkit", "Complete AI toolkit for {topic}", ["ChatGPT Prompts", "Midjourney Prompts", "DALL-E Prompts", "Workflows", "Scripts", "Tutorials"]),
    ],
    topics: "Business Marketing,Content Writing,Social Media,Email Campaigns,Blog Posts,Product Descriptions,Ad Copy,SEO Content,Resume & CV,Cover Letters,Business Plans,Financial Analysis,Legal Documents,Academic Writing,Creative Writing,Poetry Generation,Storytelling,Screenwriting,Song Lyrics,Game Design,Character Design,World Building,Logo Design,Brand Identity,Web Design Prompts,UI/UX Prompts,Illustration,Photo Editing,Video Scripts,Podcast Scripts,Presentations,Infographics,Data Visualization,Code Generation,Code Review,Debugging Help,API Design,Database Queries,System Architecture,DevOps Automation,Testing Scripts,Documentation,Customer Support,Sales Scripts,Negotiation Tips,HR & Recruiting,Training Materials,Coaching Scripts,Therapy Prompts,Meal Planning,Fitness Programs,Travel Planning,Event Planning,Real Estate Listings,E-commerce Copy,Dropshipping Ideas,Print on Demand,Course Outlines,Ebook Writing,Newsletter Content,Tweet Threads,LinkedIn Posts,Instagram Captions,TikTok Scripts,YouTube Titles,Thumbnail Ideas,Hook Writing,CTA Writing,Tagline Creation,Slogan Generator,Mission Statements,Vision Statements,SWOT Analysis,Competitor Analysis,Market Research,Survey Questions,Interview Prep,Job Descriptions,Performance Reviews,Meeting Agendas,Project Proposals,Grant Writing,Press Releases,Media Pitches,Crisis Communication,Apology Templates,Thank You Notes,Congratulations,Sympathy Messages,Birthday Wishes,Wedding Speeches,Graduation Speech,Motivational Quotes,Daily Affirmations,Gratitude Prompts,Journal Prompts,Meditation Scripts,Workout Plans,Yoga Sequences,Recipe Ideas,Wine Pairing,Cocktail Recipes,Party Planning,Gift Ideas,Book Recommendations,Movie Reviews,Game Reviews,Tech Reviews,Product Comparisons,Buying Guides,How-To Guides,Tutorial Scripts,Explainer Videos,FAQ Generation,Knowledge Base,Chatbot Training,Voice Assistant,Smart Home,Automation Rules".split(","),
  },
  {
    category: "Design Assets",
    image: productDesign,
    templates: [
      t("{topic} Design Pack — {count}+", "{count}+ professional {topic} assets", ["{count}+ Assets", "High Resolution", "Multiple Formats", "Commercial License", "Easy to Edit", "Instant Download"]),
      t("{topic} Premium Collection", "Premium {topic} collection for designers", ["Premium Quality", "Vector Files", "PSD Included", "PNG & SVG", "Print Ready", "Web Optimized"]),
    ],
    topics: "Logo Templates,Business Cards,Letterheads,Flyers & Posters,Brochures,Web Banners,Social Graphics,YouTube Thumbnails,Twitch Overlays,Stream Packages,Icon Packs,Illustrations,Mockup Templates,T-Shirt Designs,Mug Designs,Phone Cases,Sticker Packs,Emoji Sets,Font Collections,Brush Packs,Texture Packs,Pattern Collection,Backgrounds,Stock Photos,Color Palettes,Gradient Packs,UI Kits,Wireframe Kits,Dashboard UI,Landing Pages,Email Templates,Newsletter Design,Invoice Templates,Proposal Templates,Contract Templates,Certificate Design,Badge Designs,Award Templates,Menu Templates,Recipe Cards,Invitation Cards,Greeting Cards,Calendar Design,Planner Inserts,Worksheet Templates,Infographic Design,Chart Templates,Mind Maps,Flowcharts,Org Charts,Timeline Design,Roadmap Templates,SWOT Templates,Pitch Decks,Presentations,Report Templates,Book Covers,Magazine Layout,Catalog Design,Poster Art,Album Covers,Vinyl Covers,Podcast Covers,App Icons,Favicon Pack,Cursor Pack,Loading Animations,Button Styles,Form Designs,Card Components,Navigation Bars,Footer Designs,Hero Sections,Feature Sections,Pricing Tables,Testimonials,Team Sections,Contact Forms,Login Pages,Signup Forms,Error Pages,Coming Soon,Under Construction,Thank You Pages,Confirmation Pages,Receipt Templates,Shipping Labels,Product Labels,Packaging Design,Box Design,Bag Design,Tag Design,Seal Design,Stamp Design,Watermark Pack,Overlay Pack,Frame Collection,Border Collection,Divider Pack,Arrow Icons,Hand Drawn Icons,Flat Icons,3D Icons,Isometric Icons,Outline Icons,Filled Icons,Duotone Icons,Gradient Icons,Animated Icons".split(","),
  },
  {
    category: "Business Courses",
    image: productEcommerce,
    templates: [
      t("{topic} — Complete Course", "Step-by-step {topic} course for entrepreneurs", ["Video Lessons", "Templates", "Case Studies", "Action Plans", "Community", "Certificate"]),
      t("{topic} Blueprint — Start to Profit", "From zero to profit with {topic}", ["Proven Framework", "Real Examples", "Financial Templates", "Marketing Plan", "Launch Checklist", "Bonus Resources"]),
    ],
    topics: "Shopify Dropshipping,Amazon FBA,eBay Selling,Etsy Business,Print on Demand,AliExpress Dropshipping,Wholesale Business,Private Label,Subscription Box,SaaS Business,Digital Agency,Freelancing Pro,Consulting Business,Coaching Business,Online Tutoring,Course Creation,Membership Site,Community Building,Newsletter Business,Blog Monetization,YouTube Channel,Podcast Business,TikTok Creator,Instagram Business,Pinterest Business,Affiliate Pro,CPA Marketing,Lead Gen Agency,Social Media Agency,SEO Agency,PPC Agency,Content Agency,Video Production,Photo Business,Design Business,Web Dev Agency,App Development,AI Automation,Virtual Assistant,Bookkeeping,Tax Preparation,Real Estate Investing,Airbnb Business,Rental Property,House Flipping,Wholesale Real Estate,Stock Trading Pro,Forex Pro,Crypto Trading,Options Trading,Day Trading,Vending Machine,Laundromat,Car Wash,Food Truck,Catering,Personal Chef,Bakery Business,Coffee Shop Biz,Clothing Brand,Jewelry Business,Candle Business,Soap Business,Cosmetics Brand,Supplement Brand,Fitness Brand,Pet Products,Baby Products,Home Decor,Furniture Business,Electronics Store,Phone Repair,Computer Repair,Auto Detailing,Pressure Washing,Junk Removal,Storage Business,Parking Business,ATM Business,Amazon KDP,Merch by Amazon,Redbubble,Teespring,Printful,Gooten,Gelato Print,Fine Art America,Society6,Zazzle,Spreadshirt,CafePress,Bonfire,Custom Ink,Vistaprint,Shutterfly,Snapfish,Canvas Factory,Mixtiles,Fracture,eBay Dropshipping,Walmart Dropshipping,Target Dropshipping,Home Depot Dropshipping,Costco Dropshipping,Wayfair Dropshipping".split(","),
  },
  {
    category: "Video Courses",
    image: productCourses,
    templates: [
      t("{topic} Video Course — Full", "Complete {topic} video course with lifetime access", ["HD Video", "Downloads", "Exercises", "Quizzes", "Resale Rights", "Lifetime Updates"]),
      t("{topic} — Video Training", "Professional {topic} video training all levels", ["Multi-Part Series", "All Levels", "Screen Recordings", "Live Examples", "Resources", "Community"]),
    ],
    topics: "Web Development,Mobile Dev,Game Development,Data Science,Machine Learning,Deep Learning,Computer Vision,NLP Processing,Robotics,IoT Projects,Arduino,Raspberry Pi,3D Printing,CAD Design,Animation,Motion Graphics,VFX,Sound Design,Music Production,DJ Skills,Guitar Lessons,Piano Lessons,Singing,Drawing,Oil Painting,Watercolor,Digital Art,Calligraphy,Pottery,Woodworking,Metalworking,Sewing,Knitting,Jewelry Making,Candle Making,Soap Making,Leather Craft,Paper Craft,Origami,Portrait Photo,Landscape Photo,Food Photography,Product Photo,Drone Photo,Astrophotography,Street Photo,Wedding Photo,Cinematography,Documentary,Short Film,Voice Acting,Stand-up Comedy,Magic Tricks,Bartending,Wine Tasting,Coffee Brewing,Bread Baking,Cake Decorating,Chocolate Making,Cheese Making,Beer Brewing,Cocktail Making,Sushi Making,BBQ & Grilling,Smoking Meat,Preserving Food,Fermentation,Sourdough,Pasta Making,Pizza Making,Indian Cooking,Chinese Cooking,Japanese Cooking,Thai Cooking,Italian Cooking,French Cooking,Mexican Cooking,Korean Cooking,Vietnamese Cooking,Mediterranean Food,Middle Eastern Food,African Cooking,Caribbean Cooking,Brazilian Cooking,Peruvian Cooking,Spanish Cooking,Greek Cooking,Turkish Cooking,Lebanese Cooking,Moroccan Cooking,Ethiopian Cooking,Indonesian Cooking,Malaysian Cooking,Filipino Cooking,Australian BBQ,Southern Cooking,Cajun Cooking,Tex-Mex,Fusion Cooking,Vegan Cooking,Vegetarian Food,Raw Food,Keto Cooking,Paleo Cooking,Gluten Free Cook,Low Carb Recipes,High Protein Meals,Meal Prep Pro,Batch Cooking,Slow Cooker,Instant Pot,Air Fryer,Sous Vide,Wok Cooking,Cast Iron,Dutch Oven,Sheet Pan,One Pot Meals".split(","),
  },
  {
    category: "Language Courses",
    image: productLanguages,
    templates: [
      t("{topic} — Complete Course", "Learn {topic} from beginner to fluent", ["All Levels A1-C2", "Video Lessons", "Audio Practice", "Grammar Guide", "Vocabulary", "Cultural Notes"]),
      t("{topic} — Conversation Mastery", "Master {topic} conversation skills fast", ["Real Dialogues", "Pronunciation", "Slang & Idioms", "Role Play", "Audio Files", "PDF Workbook"]),
      t("{topic} — Business Level", "Professional {topic} for business communication", ["Business Vocabulary", "Email Writing", "Presentation Skills", "Meeting Language", "Negotiation Terms", "Industry Jargon"]),
    ],
    topics: "English,French,Spanish,German,Italian,Portuguese,Dutch,Russian,Polish,Czech,Ukrainian,Turkish,Arabic,Hebrew,Persian,Hindi,Urdu,Bengali,Tamil,Telugu,Kannada,Malayalam,Gujarati,Marathi,Punjabi,Chinese Mandarin,Chinese Cantonese,Japanese,Korean,Thai,Vietnamese,Indonesian,Malay,Filipino,Swahili,Amharic,Yoruba,Zulu,Afrikaans,Swedish,Norwegian,Danish,Finnish,Icelandic,Greek,Romanian,Hungarian,Bulgarian,Serbian,Croatian,Slovenian,Slovak,Lithuanian,Latvian,Estonian,Georgian,Armenian,Azerbaijani,Kazakh,Uzbek,Tajik,Kyrgyz,Mongolian,Tibetan,Burmese,Khmer,Lao,Nepali,Sinhala,Pashto,Kurdish,Somali,Hausa,Igbo,Twi,Wolof,Malagasy,Tongan,Samoan,Hawaiian,Maori,Quechua,Guarani,Nahuatl,Cherokee,Navajo,Inuktitut,ASL Sign,BSL Sign,Auslan Sign,LSF French Sign,DGS German Sign,JSL Japanese Sign,KSL Korean Sign,CSL Chinese Sign,ISL Indian Sign,Latin,Ancient Greek,Sanskrit,Classical Arabic,Biblical Hebrew,Old English,Middle English,Esperanto,Irish Gaelic,Scottish Gaelic,Welsh,Breton,Basque,Catalan,Galician,Occitan,Romansh,Luxembourgish,Maltese,Albanian,Macedonian,Bosnian,Montenegrin".split(","),
  },
];

function generateProducts(): Product[] {
  const all: Product[] = [];
  let idx = 0;
  const badges = ["Best Seller", "Popular", "Top Rated", "New", "Hot", "Trending", undefined, undefined, undefined, undefined, undefined, undefined];

  for (const cat of categoryData) {
    for (let ti = 0; ti < cat.topics.length; ti++) {
      const topic = cat.topics[ti].trim();
      if (!topic) continue;
      const tmpl = cat.templates[ti % cat.templates.length];
      const r = seededRandom(idx + 42);
      const count = Math.floor(r * 9000 + 500);
      const price = Math.floor(seededRandom(idx + 7) * 30 + 5);
      const origPrice = Math.floor(price * (2 + seededRandom(idx + 13) * 3));
      const badge = badges[Math.floor(seededRandom(idx + 99) * badges.length)];

      all.push({
        id: `p-${idx}`,
        name: tmpl.name.replace("{topic}", topic).replace("{count}", String(count)),
        description: `Premium ${topic} digital product with full resale rights. ${tmpl.short.replace("{topic}", topic).replace("{count}", String(count))}. Complete package for entrepreneurs and creators. All products come with PLR/MRR rights — resell as your own and keep 100% of profits.`,
        shortDescription: tmpl.short.replace("{topic}", topic).replace("{count}", String(count)),
        price,
        originalPrice: origPrice,
        category: cat.category,
        image: cat.image,
        features: tmpl.features.map((f) => f.replace("{count}", String(count))),
        badge,
      });
      idx++;
    }
  }
  return all;
}

export const products: Product[] = generateProducts();
export const categories = [...new Set(products.map((p) => p.category))];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
