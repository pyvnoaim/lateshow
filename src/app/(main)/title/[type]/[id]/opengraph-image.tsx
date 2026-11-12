import { ogSize, titleOgImage } from "@/features/titles/ogImage";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "Lateshow";

export default async function Image({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  return titleOgImage(type, id);
}
