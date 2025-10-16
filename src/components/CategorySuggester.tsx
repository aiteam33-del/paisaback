import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface CategorySuggesterProps {
  vendor: string;
  category: string;
  onCategoryChange: (category: string) => void;
}

const categoryKeywords = {
  travel: ["uber", "ola", "rapido", "train", "flight", "airline", "bus", "taxi", "metro", "petrol", "diesel", "fuel"],
  food: ["restaurant", "cafe", "zomato", "swiggy", "food", "pizza", "burger", "dominos", "mcdonalds", "kfc"],
  lodging: ["hotel", "resort", "oyo", "airbnb", "booking", "treebo", "accommodation", "stay"],
  office: ["amazon", "flipkart", "stationery", "office", "laptop", "computer", "software", "printer", "supplies"],
};

export const CategorySuggester = ({ vendor, category, onCategoryChange }: CategorySuggesterProps) => {
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (!vendor || category) return;

    const vendorLower = vendor.toLowerCase();
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => vendorLower.includes(keyword))) {
        setSuggestion(cat);
        break;
      }
    }
  }, [vendor, category]);

  const categories = ["travel", "food", "lodging", "office", "other"];

  return (
    <div className="space-y-2">
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {suggestion && !category && (
        <button
          onClick={() => {
            onCategoryChange(suggestion);
            setSuggestion(null);
          }}
          className="flex items-center gap-2 text-xs text-primary hover:underline"
        >
          <Sparkles className="h-3 w-3" />
          Suggested: <Badge variant="outline">{suggestion}</Badge>
        </button>
      )}
    </div>
  );
};