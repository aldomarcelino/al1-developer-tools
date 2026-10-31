"use client";

import { useId } from "react";
import { Check, Copy, Download } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import shared from "@/styles/shared/toolkit.module.css";
import styles from "../styles.module.css";

type ConverterEditorProps = {
  label: string;
  value: string;
  placeholder: string;
  readOnly?: boolean;
  copied: boolean;
  onChange?: (value: string) => void;
  onCopy: () => void;
  onDownload: () => void;
};

export function ConverterEditor({
  label,
  value,
  placeholder,
  readOnly = false,
  copied,
  onChange,
  onCopy,
  onDownload,
}: ConverterEditorProps) {
  const id = useId();
  return (
    <section className={`${shared.panel} ${styles.editorPanel}`} aria-label={label}>
      <div className={styles.editorHeader}>
        <label htmlFor={id}>{label}</label>
        <div className={styles.editorActions}>
          <ActionButton
            variant="ghost"
            size="sm"
            iconOnly
            disabled={!value}
            success={copied}
            title={copied ? `${label} copied` : `Copy ${label}`}
            onClick={onCopy}
          >
            {copied ? (
              <Check size={15} aria-hidden="true" />
            ) : (
              <Copy size={15} aria-hidden="true" />
            )}
          </ActionButton>
          <ActionButton
            variant="ghost"
            size="sm"
            iconOnly
            disabled={!value}
            title={`Download ${label}`}
            onClick={onDownload}
          >
            <Download size={15} aria-hidden="true" />
          </ActionButton>
        </div>
      </div>
      <textarea
        id={id}
        className={styles.editorInput}
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        maxLength={readOnly ? undefined : 524288}
        placeholder={placeholder}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      />
      <div className={styles.editorFooter}>
        <span>{value.length.toLocaleString()} characters</span>
        <span>{readOnly ? "Read-only" : "Editable"}</span>
      </div>
    </section>
  );
}
