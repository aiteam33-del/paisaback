import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
  delay?: number;
}

export const TestimonialCard = ({ quote, name, role, delay = 0 }: TestimonialCardProps) => {
  return (
    <Card
      className="bg-gradient-card border-border/50 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-5 sm:pt-6 sm:pb-6 md:pt-8 md:pb-8 space-y-4 sm:space-y-5 md:space-y-6">
        <Quote className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-primary/20" />
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed italic">
          "{quote}"
        </p>
        <div className="space-y-0.5 sm:space-y-1">
          <p className="text-sm sm:text-base font-semibold text-foreground">{name}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">{role}</p>
        </div>
      </CardContent>
    </Card>
  );
};
