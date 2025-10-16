import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends React.ComponentPropsWithoutRef<typeof Card> {
  delay?: number;
}

export const AnimatedCard = ({ className, delay = 0, children, ...props }: AnimatedCardProps) => {
  return (
    <Card
      className={cn(
        "animate-fade-in opacity-0",
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "forwards",
      }}
      {...props}
    >
      {children}
    </Card>
  );
};