import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, ImageIcon, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ImageUploadProps {
  onImageSelected: (url: string) => void;
  initialImage?: string | null;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelected, initialImage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    setPreviewUrl(initialImage || null);
  }, [initialImage]);

  const handleFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/') || !user) return;

    setIsUploading(true);
    setUploadProgress(10); // Start progress

    // Simulate progress since Supabase JS doesn't support it natively yet
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('complaint-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Upload complete
      clearInterval(interval);
      setUploadProgress(100);

      const { data: { publicUrl } } = supabase.storage
        .from('complaint-images')
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      onImageSelected(publicUrl);
    } catch (error) {
      console.error("Upload failed", error);
      setUploadProgress(0);
    } finally {
      setTimeout(() => setIsUploading(false), 500); // Small delay to show 100%
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setUploadProgress(0);
    onImageSelected('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  }

  if (previewUrl) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 group">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {isUploading && (
           <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 p-4">
               <div className="text-sm font-medium text-white mb-2">Replacing...</div>
               <div className="w-full max-w-[200px] bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                 <div className="bg-white h-1.5 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
               </div>
           </div>
        )}

        <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        
        {!isUploading && (
          <div className="absolute top-2 right-2 flex gap-2">
              <button
                  type="button"
                  onClick={triggerUpload}
                  className="p-1.5 bg-black/50 hover:bg-black rounded-full text-white transition-colors border border-white/10"
                  title="Replace Image"
              >
                  <RefreshCw size={14} />
              </button>
              <button
                  type="button"
                  onClick={clearImage}
                  className="p-1.5 bg-black/50 hover:bg-red-900/80 rounded-full text-white transition-colors border border-white/10"
                  title="Remove Image"
              >
                  <X size={14} />
              </button>
          </div>
        )}

        <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white flex items-center gap-1 backdrop-blur-md border border-white/10">
            <ImageIcon size={12} /> Image Attached
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 text-center cursor-pointer
        ${isDragging 
          ? 'border-white bg-zinc-800' 
          : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-800/50'
        }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={triggerUpload}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      
      {isUploading ? (
        <div className="py-4">
           <div className="text-sm font-medium text-white mb-2">Uploading Evidence...</div>
           <div className="w-full bg-zinc-700 rounded-full h-2.5 overflow-hidden">
             <div 
               className="bg-white h-2.5 rounded-full transition-all duration-200 ease-out" 
               style={{ width: `${uploadProgress}%` }}
             ></div>
           </div>
           <div className="text-xs text-zinc-500 mt-2">{uploadProgress}%</div>
        </div>
      ) : (
        <div className="space-y-2 py-2">
          <div className="mx-auto w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
            <UploadCloud size={20} />
          </div>
          <div className="text-sm text-zinc-300">
            <span className="font-semibold text-white">Click to upload</span> or drag and drop
          </div>
          <p className="text-xs text-zinc-500">JPG, PNG (Max 5MB)</p>
        </div>
      )}
    </div>
  );
};
