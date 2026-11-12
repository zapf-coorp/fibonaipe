import type { ReactNode } from "react";
import styles from "./TaskLine.module.css";

export function TaskLine({
  sprintName,
  title,
  href,
  children,
}: {
  readonly sprintName?: string;
  readonly title: string;
  readonly href?: string;
  readonly children?: ReactNode;
}) {
  const sprint = sprintName?.trim() ?? "";
  return (
    <div className={styles.line}>
      {sprint.length > 0 ? <span className={styles.sprint}>{sprint}</span> : null}
      {href ? (
        <a className={styles.title} href={href} rel="noopener noreferrer" target="_blank">
          {title}
        </a>
      ) : (
        <span className={styles.title}>{title}</span>
      )}
      {children}
    </div>
  );
}
