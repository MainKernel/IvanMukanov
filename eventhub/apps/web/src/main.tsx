import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { App } from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Не знайдено елемент #root у index.html");

/**
 * Один клієнт на весь застосунок — він і є кеш серверного стану.
 *
 * staleTime: 30 с — скільки дані вважаються свіжими. Поки не минуло,
 *   повторний перехід на сторінку не йде в мережу взагалі (див. ADR-0004).
 * retry: 2 — три спроби разом із першою, з наростаючою затримкою.
 * gcTime не змінюємо: 5 хв за замовчуванням — це про прибирання
 *   неактивних записів, а не про свіжість.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
);
