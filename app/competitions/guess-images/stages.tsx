"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getGuessStages } from "@/lib/guess-stages";
import { Button } from "@/components/ui/button";
import { SiteLoader } from "@/components/ui/site-loader";

export default function GuessImagesStages() {
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getGuessStages().then((data) => {
      setStages(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-[#1a2332]">مراحل لعبة خمن الصورة</h1>
        {loading ? (
          <div className="flex justify-center py-4"><SiteLoader /></div>
        ) : (
          <div className="space-y-4">
            {stages.map((stage) => (
              <Button
                key={stage.id}
                className="w-full bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-white text-xl py-4 shadow-lg"
                onClick={() => router.push(`/competitions/guess-images?stage=${stage.id}`)}
              >
                {stage.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
