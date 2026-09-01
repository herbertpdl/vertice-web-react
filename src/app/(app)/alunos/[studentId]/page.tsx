import { StudentDetailContent } from "./StudentDetailContent";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <StudentDetailContent studentId={Number(studentId)} />;
}
