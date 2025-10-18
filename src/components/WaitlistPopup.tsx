import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WaitlistPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WaitlistPopup = ({ isOpen, onClose }: WaitlistPopupProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("waitlist_emails")
        .insert([{ email: email.trim().toLowerCase() }]);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already registered",
            description: "You're already on our waitlist!",
          });
        } else {
          throw error;
        }
      } else {
        setIsSuccess(true);
        toast({
          title: "Success!",
          description: "You're on the waitlist. We'll notify you soon!",
        });
        setTimeout(() => {
          onClose();
          setIsSuccess(false);
          setEmail("");
        }, 3000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-8 animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSuccess ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-foreground">
                Join the PAISABACK Waitlist
              </h3>
              <p className="text-muted-foreground">
                Be the first to experience AI-powered reimbursements
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Joining..." : "Join Now"}
              </Button>
            </form>
          </div>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="text-5xl">🎉</div>
            <h3 className="text-2xl font-bold text-foreground">You're in!</h3>
            <p className="text-muted-foreground">
              We'll notify you as soon as PAISABACK goes live.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
