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
      <CardContent className="pt-8 pb-8 space-y-6">
        <Quote className="w-10 h-10 text-primary/20" />
        <p className="text-muted-foreground leading-relaxed italic">
          "{quote}"
        </p>
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </CardContent>
    </Card>
  );
};
