import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Necessario para o Dockerfile: gera .next/standalone com apenas o
   * que a aplicacao precisa para rodar, em vez de depender do
   * node_modules inteiro. Corta a imagem final de centenas de MB
   * para algumas dezenas.
   *
   * Nao afeta o deploy na Vercel, que usa o proprio build system.
   */
  output: "standalone",
};

export default nextConfig;