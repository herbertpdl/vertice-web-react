import { studentTabFromParam } from "@/lib/studentTabs";
import { StudentDetailContent } from "./StudentDetailContent";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ aba?: string | string[] }>;
}) {
  const { studentId } = await params;
  const { aba } = await searchParams;
  return <StudentDetailContent studentId={Number(studentId)} initialTab={studentTabFromParam(aba)} />;
}
