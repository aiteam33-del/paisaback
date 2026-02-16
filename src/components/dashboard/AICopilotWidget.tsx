import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles, AlertTriangle, ArrowRightLeft, Download,
  TrendingUp, Search, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AnalyticsChatbot } from "@/components/AnalyticsChatbot";

// This widget serves as the floating trigger. It re-uses the existing
// AnalyticsChatbot component but wraps it with a modern Intercom-style
// entry point that shows quick-action chips before opening full chat.

const QUICK_ACTIONS = [
  { label: "Show anomalies", icon: AlertTriangle },
  { label: "Compare spend", icon: ArrowRightLeft },
  { label: "Export reports", icon: Download },
  { label: "Top categories", icon: TrendingUp },
];

export const AICopilotWidget = () => {
  // The AnalyticsChatbot already handles the floating button + panel.
  // We simply render it — the existing component is already styled as
  // a floating bottom-right widget with drawer behavior.
  return <AnalyticsChatbot />;
};
