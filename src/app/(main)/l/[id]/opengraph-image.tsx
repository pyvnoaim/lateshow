import { listOgImage, ogSize } from "@/features/lists/ogImage";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "A list on Lateshow";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  return listOgImage((await params).id);
}
