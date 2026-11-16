import { ArrowUpRight, MapPinned } from "lucide-react";
import "./discovery.css";

export function MapDiscoveryCard({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="map-discovery" aria-labelledby="map-discovery-title">
      <div className="map-discovery-icon" aria-hidden="true">
        <MapPinned size={28} />
      </div>
      <div>
        <p className="map-discovery-kicker">YANGI · HUDUDIY REJALASHTIRISH</p>
        <h2 id="map-discovery-title">
          Tiklanish yo‘nalishini xaritada ko‘ring
        </h2>
        <p>
          Asosiy va zaxira manzillarni belgilang, yo‘nalishni animatsiyada
          kuzating.
        </p>
      </div>
      <button className="btn btn-primary" onClick={onOpen}>
        Xaritani ochish <ArrowUpRight size={17} />
      </button>
    </section>
  );
}
