import { Link, Route, Routes } from "react-router-dom";
import { EventList } from "./features/catalog/EventList";
import { EventPage } from "./features/catalog/EventPage";

export function App() {
  return (
    <main className="page">
      <header className="page__header">
        <h1>
          <Link to="/" className="page__home">
            EventHub
          </Link>
        </h1>
        <p className="page__subtitle">Квитки на події</p>
      </header>

      <Routes>
        <Route path="/" element={<EventList />} />
        <Route path="/events/:eventId" element={<EventPage />} />
      </Routes>
    </main>
  );
}
