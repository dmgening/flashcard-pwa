import { useParams } from "react-router-dom";
export function StudyRoute() {
  const { deckId } = useParams();
  return <div className="p-4"><h2 className="text-xl font-semibold">Study {deckId}</h2></div>;
}
