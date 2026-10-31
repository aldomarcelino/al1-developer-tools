import styles from "../styles.module.css";
import { tools } from "@/config/tools";
import { HeroSection } from "./hero-section";
import { ToolDiscovery } from "./tool-discovery";
import { PrinciplesSection } from "./principles-section";

export function HomePage() {
  const activeToolCount = tools.filter((tool) => tool.status === "available").length;
  return (
    <div className={`home ${styles.scope}`}>
      <HeroSection activeToolCount={activeToolCount} />
      <ToolDiscovery />
      <PrinciplesSection />
    </div>
  );
}
