/**
 * Smart keyword-based category detection for books.
 * No AI, no external APIs — pure keyword matching.
 */

interface CategoryKeywords {
  category: string;
  keywords: string[];
}

const CATEGORY_KEYWORDS: CategoryKeywords[] = [
  {
    category: "الطب",
    keywords: ["طب", "طبي", "صحة", "أمراض", "علاج", "تشريح", "جراحة", "دواء", "أدوية", "تمريض", "medical", "medicine", "health", "anatomy", "surgery", "disease", "pharmaceutical"],
  },
  {
    category: "التاريخ",
    keywords: ["تاريخ", "تاريخي", "حضارة", "حضارات", "قديم", "عصر", "عصور", "حرب", "history", "historical", "civilization", "ancient", "war", "empire"],
  },
  {
    category: "العلوم",
    keywords: ["علوم", "علم", "فيزياء", "كيمياء", "أحياء", "رياضيات", "فلك", "جيولوجيا", "science", "physics", "chemistry", "biology", "math", "astronomy"],
  },
  {
    category: "الأدب العربي",
    keywords: ["أدب", "شعر", "رواية", "قصة", "قصص", "نثر", "ديوان", "أدبي", "literature", "poetry", "novel", "fiction", "prose"],
  },
  {
    category: "الدين الإسلامي",
    keywords: ["إسلام", "إسلامي", "قرآن", "حديث", "فقه", "سنة", "سيرة", "نبوية", "تفسير", "عقيدة", "شريعة", "islam", "quran", "hadith", "islamic"],
  },
  {
    category: "تطوير الذات",
    keywords: ["تطوير", "ذات", "نجاح", "تحفيز", "عادات", "إنتاجية", "قيادة", "تفكير", "إيجابي", "self-help", "motivation", "success", "habits", "productivity", "leadership", "mindset"],
  },
  {
    category: "الأعمال والتسويق",
    keywords: ["أعمال", "تسويق", "تجارة", "ريادة", "استثمار", "اقتصاد", "مال", "إدارة", "مشروع", "business", "marketing", "entrepreneurship", "investment", "economy", "management", "startup"],
  },
  {
    category: "التقنية والبرمجة",
    keywords: ["برمجة", "تقنية", "حاسوب", "كمبيوتر", "ذكاء اصطناعي", "بيانات", "تطبيق", "ويب", "programming", "technology", "computer", "software", "ai", "data", "web", "coding", "developer"],
  },
  {
    category: "الفلسفة",
    keywords: ["فلسفة", "فيلسوف", "فكر", "منطق", "وجود", "أخلاق", "philosophy", "philosopher", "logic", "ethics", "existential", "metaphysics"],
  },
  {
    category: "التعليم والدراسة",
    keywords: ["تعليم", "دراسة", "مدرسة", "جامعة", "منهج", "امتحان", "تعلم", "تربية", "education", "study", "school", "university", "learning", "teaching", "curriculum"],
  },
  {
    category: "الصحة واللياقة",
    keywords: ["لياقة", "رياضة", "تغذية", "وزن", "حمية", "تمارين", "يوغا", "fitness", "exercise", "nutrition", "diet", "yoga", "wellness", "workout"],
  },
  {
    category: "الطبخ والتغذية",
    keywords: ["طبخ", "وصفات", "مطبخ", "طعام", "أكل", "حلويات", "cooking", "recipes", "food", "cuisine", "baking", "chef"],
  },
];

const DEFAULT_CATEGORY = "عام";

export interface CategorySuggestion {
  category: string;
  confidence: number; // 0-1
  matchedKeywords: string[];
}

/**
 * Detect the best category for a book based on title and description.
 * Returns the top suggestion with confidence score.
 */
export function detectCategory(
  title: string,
  description?: string,
  availableCategories?: string[]
): CategorySuggestion {
  const text = `${title} ${description || ""}`.toLowerCase();

  let bestMatch: CategorySuggestion = {
    category: DEFAULT_CATEGORY,
    confidence: 0,
    matchedKeywords: [],
  };

  for (const entry of CATEGORY_KEYWORDS) {
    // If availableCategories provided, skip categories not in the list
    if (availableCategories && availableCategories.length > 0) {
      if (!availableCategories.includes(entry.category)) continue;
    }

    const matched = entry.keywords.filter((kw) => text.includes(kw.toLowerCase()));
    const confidence = matched.length / entry.keywords.length;

    if (matched.length > bestMatch.matchedKeywords.length) {
      bestMatch = {
        category: entry.category,
        confidence: Math.min(confidence * 3, 1), // scale up, cap at 1
        matchedKeywords: matched,
      };
    }
  }

  return bestMatch;
}

/**
 * Get all suggestions sorted by relevance.
 */
export function detectCategoryAll(
  title: string,
  description?: string,
  availableCategories?: string[]
): CategorySuggestion[] {
  const text = `${title} ${description || ""}`.toLowerCase();

  const suggestions: CategorySuggestion[] = [];

  for (const entry of CATEGORY_KEYWORDS) {
    if (availableCategories && availableCategories.length > 0) {
      if (!availableCategories.includes(entry.category)) continue;
    }

    const matched = entry.keywords.filter((kw) => text.includes(kw.toLowerCase()));
    if (matched.length > 0) {
      suggestions.push({
        category: entry.category,
        confidence: Math.min((matched.length / entry.keywords.length) * 3, 1),
        matchedKeywords: matched,
      });
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}
