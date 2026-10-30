import { ProfileScreen } from "./_components/ProfileScreen";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProfileScreen key={id} id={id} />;
}
