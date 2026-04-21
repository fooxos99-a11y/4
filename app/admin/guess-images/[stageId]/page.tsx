"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteLoader } from "@/components/ui/site-loader";
import { Plus, Pencil, Trash2, Upload, ImageIcon } from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth"

type GuessImage = {
  id: string;
  image_url: string;
  answer: string;
  hint: string | null;
  active: boolean;
  stage_id?: number;
};

type Stage = {
  id: number;
  name: string;
};

export default function GuessImagesByStage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة صور خمن الصورة")

  if (authLoading || !authVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="md" />
      </div>
    )
  }

  const router = useRouter();
  const params = useParams();
  const stageId = Number(params.stageId);
  const [stage, setStage] = useState<Stage | null>(null);
  const [images, setImages] = useState<GuessImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GuessImage | null>(null);
  const [formData, setFormData] = useState({ image_url: "", answer: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchStage();
    fetchImages();
  }, [stageId]);

  const fetchStage = async () => {
    const res = await fetch(`/api/guess-image-stages?id=${stageId}`);
    const data = await res.json();
    setStage(data?.[0] ?? null);
  };

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/guess-images?stage_id=${stageId}`);
      const data = await response.json();
      setImages(Array.isArray(data) ? data : []);
    } catch (error) {
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  // ... (نفس دوال الإضافة والتعديل والحذف ورفع الصورة كما في الصفحة الرئيسية)

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <Button onClick={() => router.push("/admin/guess-images")}>رجوع للمراحل</Button>
      <h1 className="text-2xl font-bold my-4">صور المرحلة: {stage?.name ?? stageId}</h1>
      {/* ...نفس عرض الصور والإجابات ونموذج الإضافة والتعديل... */}
    </div>
  );
}
