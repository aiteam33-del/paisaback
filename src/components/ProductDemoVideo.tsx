import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Play } from "lucide-react";

export const ProductDemoVideo = () => {
  const section = useScrollAnimation();

  return (
    <section
      ref={section.ref as React.RefObject<HTMLElement>}
      className={`container mx-auto px-4 py-20 md:py-28 transition-all duration-1000 ${
        section.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            See PAISABACK in Action
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Watch how easy it is to submit and manage expenses
          </p>
        </div>

        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-card border border-border/50 aspect-video">
          {/* Placeholder for demo video - replace with actual video when available */}
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Play className="w-10 h-10 text-primary" />
              </div>
              <p className="text-muted-foreground font-medium">
                Product demo video coming soon
              </p>
            </div>
          </div>
          {/* When you have a video, use this structure:
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/path-to-your-video.mp4" type="video/mp4" />
          </video>
          */}
        </div>
      </div>
    </section>
  );
};
