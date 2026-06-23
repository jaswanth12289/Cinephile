"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();
  
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={() => router.back()} 
      className="absolute top-4 left-4 z-20 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}
