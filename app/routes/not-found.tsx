import { data } from "react-router";

// Qualquer URL desconhecida cai aqui e renderiza o ErrorBoundary do root com status 404.
export function loader() {
  throw data("Página não encontrada", { status: 404 });
}

export default function NotFound() {
  return null;
}
