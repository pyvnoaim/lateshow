import { ogSize, profileOgImage } from "@/features/profile/ogImage";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "Lateshow profile";

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return profileOgImage(username);
}
