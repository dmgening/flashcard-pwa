import { useParams } from "react-router-dom";
export function StatsRoute() {
  const { deckId } = useParams();
  return <div className="p-4"><h2 className="text-xl font-semibold">Stats {deckId}</h2></div>;
}
