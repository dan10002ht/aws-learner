import Runner from "@/components/Runner";

export default function PracticeRunPage({ params }: { params: { courseId: string; setKey: string } }) {
  const setKey = decodeURIComponent(params.setKey);
  return <Runner setKey={setKey} mode="practice" />;
}
