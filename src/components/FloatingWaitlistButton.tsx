import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingWaitlistButtonProps {
  onClick: () => void;
}

export const FloatingWaitlistButton = ({ onClick }: FloatingWaitlistButtonProps) => {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 bg-gradient-primary hover:opacity-90 shadow-2xl rounded-full w-14 h-14 p-0 animate-pulse"
      aria-label="Join waitlist"
    >
      <Bell className="w-6 h-6 text-primary-foreground" />
    </Button>
  );
};
