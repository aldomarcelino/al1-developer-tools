"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Code2,
  Copy,
  Check,
  Download,
  Sparkles,
  RotateCcw,
  Palette,
  FileCode,
  Image as ImageIcon,
  Hash,
  WrapText,
  Ban,
  Pipette,
  ChevronDown,
} from "lucide-react";
import { ToolHeader } from "@/components/cummon/tool-header";
import { CustomSelect } from "@/components/ui/custom-select";
import { SegmentedTabs, type TabOption } from "@/components/ui/segmented-tabs";
import { ActionButton } from "@/components/ui/action-button";
import { Snackbar } from "@/components/ui/snackbar";
import { useSnackbar } from "@/hooks/use-snackbar";
import {
  CodeToImageSettings,
  DEFAULT_SETTINGS,
  BACKGROUND_PRESETS,
  THEMES,
  LANGUAGE_OPTIONS,
  CODE_TEMPLATES,
  AspectRatio,
  WindowStyle,
  ShadowOption,
  ThemeId,
  BackgroundId,
  SupportedLanguage,
} from "../lib/code-to-image-types.ts";
import {
  tokenizeCode,
  getTokenColor,
  autoDetectLanguage,
} from "../lib/code-highlighter.ts";
import {
  exportCodeToPng,
  exportCodeToSvg,
  exportCodeToWebp,
  copyCodeImageToClipboard,
} from "../lib/code-to-image-export.ts";
import styles from "../code-to-image.module.css";

export function CodeToImageWorkspace() {
  const [settings, setSettings] = useState<CodeToImageSettings>(DEFAULT_SETTINGS);
  const [exportScale, setExportScale] = useState<1 | 2 | 3>(2);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);

  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();

  // Close download dropdown on outside click or escape
  useEffect(() => {
    if (!isDownloadMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        downloadDropdownRef.current &&
        !downloadDropdownRef.current.contains(e.target as Node)
      ) {
        setIsDownloadMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDownloadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDownloadMenuOpen]);

  // Active theme and background preset
  const activeTheme = useMemo(() => THEMES[settings.theme] || THEMES["one-dark"], [settings.theme]);
  const activeBg = useMemo(
    () => BACKGROUND_PRESETS[settings.background] || BACKGROUND_PRESETS.palette,
    [settings.background]
  );

  // Tokenize code for live in-image syntax highlighting
  const tokenLines = useMemo(() => {
    return tokenizeCode(settings.code, settings.language);
  }, [settings.code, settings.language]);

  // Line count
  const lineCount = tokenLines.length;

  // Auto wrap setting (default true)
  const isAutoWrap = settings.autoWrap !== false;

  // Sync textarea height on code change, wrap change, or font size change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [settings.code, settings.fontSize, isAutoWrap]);

  // Handle Tab key and indentation inside in-image editor
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      const updated = val.substring(0, start) + "  " + val.substring(end);
      setSettings((prev) => ({ ...prev, code: updated }));

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }, []);

  // Update a single setting
  const updateSetting = useCallback(<K extends keyof CodeToImageSettings>(
    key: K,
    value: CodeToImageSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // In-image code editing
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setSettings((prev) => ({ ...prev, code: newCode }));
  }, []);

  // Load a preset template
  const handleLoadTemplate = useCallback(
    (templateKey: string, tmpl: { title: string; language: SupportedLanguage; code: string }) => {
      setSettings((prev) => ({
        ...prev,
        code: tmpl.code,
        language: tmpl.language,
        title: tmpl.title,
      }));
      showSnackbar(`Loaded ${tmpl.title} template.`);
    },
    [showSnackbar]
  );

  // Auto detect language
  const handleAutoDetect = useCallback(() => {
    const detected = autoDetectLanguage(settings.code);
    if (detected) {
      updateSetting("language", detected);
      showSnackbar(`Detected language: ${detected.toUpperCase()}`);
    }
  }, [settings.code, updateSetting, showSnackbar]);

  // Reset to default
  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    showSnackbar("Reset to default settings.");
  }, [showSnackbar]);

  // Copy PNG image to clipboard
  const handleCopyImage = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    dismissSnackbar();
    try {
      await copyCodeImageToClipboard(settings, exportScale);
      setIsCopied(true);
      showSnackbar("Image copied to clipboard! Ready to paste into Twitter, Discord, or Slack.");
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to copy image.";
      showSnackbar(msg, "error");
    } finally {
      setIsExporting(false);
    }
  }, [settings, exportScale, isExporting, dismissSnackbar, showSnackbar]);

  // Download PNG
  const handleDownloadPng = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    dismissSnackbar();
    try {
      await exportCodeToPng(settings, exportScale);
      showSnackbar(`PNG (${exportScale}x) downloaded.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to export PNG.";
      showSnackbar(msg, "error");
    } finally {
      setIsExporting(false);
    }
  }, [settings, exportScale, isExporting, dismissSnackbar, showSnackbar]);

  // Download SVG
  const handleDownloadSvg = useCallback(() => {
    dismissSnackbar();
    try {
      exportCodeToSvg(settings);
      showSnackbar("Vector SVG downloaded.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to export SVG.";
      showSnackbar(msg, "error");
    }
  }, [settings, dismissSnackbar, showSnackbar]);

  // Download WebP
  const handleDownloadWebp = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    dismissSnackbar();
    try {
      await exportCodeToWebp(settings, exportScale);
      showSnackbar("WebP image downloaded.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to export WebP.";
      showSnackbar(msg, "error");
    } finally {
      setIsExporting(false);
    }
  }, [settings, exportScale, isExporting, dismissSnackbar, showSnackbar]);

  // Map shadow setting to CSS class
  const shadowClass = useMemo(() => {
    switch (settings.shadow) {
      case "none":
        return styles.shadowNone;
      case "soft":
        return styles.shadowSoft;
      case "medium":
        return styles.shadowMedium;
      case "dramatic":
        return styles.shadowDramatic;
      case "glow":
        return styles.shadowGlow;
      default:
        return styles.shadowMedium;
    }
  }, [settings.shadow]);

  // Background styling for the canvas card
  const backgroundCardStyle = useMemo(() => {
    if (settings.background === "transparent") {
      return {};
    }
    if (settings.background === "custom") {
      return {
        background: settings.customBackground || "#176c4b",
      };
    }
    return {
      background: activeBg.css,
    };
  }, [settings.background, settings.customBackground, activeBg]);

  // Aspect ratio styling
  const aspectRatioStyle = useMemo(() => {
    if (settings.aspectRatio === "16:9") return { aspectRatio: "16 / 9" };
    if (settings.aspectRatio === "1:1") return { aspectRatio: "1 / 1" };
    if (settings.aspectRatio === "4:5") return { aspectRatio: "4 / 5" };
    return { aspectRatio: "auto" };
  }, [settings.aspectRatio]);

  // Textarea padding to align with line numbers
  const textareaPaddingLeft = settings.showLineNumbers ? 58 : 20;

  // Options for CustomSelect components
  const languageOptions = useMemo(
    () =>
      LANGUAGE_OPTIONS.map((lang) => ({
        value: lang.value,
        label: lang.label,
      })),
    []
  );

  const themeOptions = useMemo(
    () =>
      Object.entries(THEMES).map(([key, theme]) => ({
        value: key,
        label: `${theme.name} (${theme.isDark ? "Dark" : "Light"})`,
      })),
    []
  );

  const aspectRatioOptions = useMemo(
    () => [
      { value: "auto", label: "Auto Ratio" },
      { value: "16:9", label: "16:9 (Twitter / YouTube)" },
      { value: "1:1", label: "1:1 (Square / Instagram)" },
      { value: "4:5", label: "4:5 (Portrait Feed)" },
    ],
    []
  );

  const shadowOptions = useMemo(
    () => [
      { value: "soft", label: "Soft Shadow" },
      { value: "medium", label: "Medium Shadow" },
      { value: "dramatic", label: "Dramatic Elevation" },
      { value: "glow", label: "Neon Glow" },
      { value: "none", label: "No Shadow" },
    ],
    []
  );

  // Tab options for SegmentedTabs
  const paddingOptions: TabOption<string>[] = useMemo(
    () => [
      { value: "16", label: "16" },
      { value: "32", label: "32" },
      { value: "64", label: "64" },
      { value: "96", label: "96" },
    ],
    []
  );

  const windowStyleOptions: TabOption<WindowStyle>[] = useMemo(
    () => [
      { value: "macos", label: "Mac" },
      { value: "windows", label: "Win" },
      { value: "minimal", label: "Dots" },
      { value: "none", label: "None" },
    ],
    []
  );

  return (
    <div className="workspace-page page-width">
      <ToolHeader title="Code to Image" icon={<Code2 size={24} />} />

      <div className={styles.container}>
        {/* Ray.so style Top Control Bar */}
        <div className={styles.toolbarContainer}>
          <div className={styles.toolbarRow}>
            {/* Left Controls: CustomSelect, SegmentedTabs, and toggles */}
            <div className={styles.controlsGroup}>
              {/* Language CustomSelect */}
              <div className={styles.controlItem}>
                <CustomSelect
                  ariaLabel="Code language"
                  value={settings.language}
                  onChange={(val) => updateSetting("language", val as SupportedLanguage)}
                  options={languageOptions}
                />
              </div>

              {/* Theme CustomSelect */}
              <div className={styles.controlItem}>
                <CustomSelect
                  ariaLabel="Editor theme"
                  value={settings.theme}
                  onChange={(val) => updateSetting("theme", val as ThemeId)}
                  options={themeOptions}
                />
              </div>

              {/* Padding SegmentedTabs */}
              <div className={styles.controlItem}>
                <label>Padding:</label>
                <SegmentedTabs
                  size="sm"
                  value={String(settings.padding)}
                  onChange={(val) => updateSetting("padding", Number(val))}
                  options={paddingOptions}
                  ariaLabel="Padding option"
                />
              </div>

              {/* Window Style SegmentedTabs */}
              <div className={styles.controlItem}>
                <label>Window:</label>
                <SegmentedTabs<WindowStyle>
                  size="sm"
                  value={settings.windowStyle}
                  onChange={(val) => updateSetting("windowStyle", val)}
                  options={windowStyleOptions}
                  ariaLabel="Window style option"
                />
              </div>
            </div>

            {/* Right Controls: Line Numbers, Auto Wrap, Aspect Ratio */}
            <div className={styles.controlsGroupRight}>
              {/* Line Numbers Toggle */}
              <button
                type="button"
                className={`${styles.iconToggleBtn} ${settings.showLineNumbers ? styles.iconToggleBtnActive : ""}`}
                onClick={() => updateSetting("showLineNumbers", !settings.showLineNumbers)}
                title="Toggle line numbers"
              >
                <Hash size={14} />
                <span>Lines</span>
              </button>

              {/* Auto Wrap / Auto New Line Toggle */}
              <button
                type="button"
                className={`${styles.iconToggleBtn} ${isAutoWrap ? styles.iconToggleBtnActive : ""}`}
                onClick={() => updateSetting("autoWrap", !isAutoWrap)}
                title="Toggle auto new line / word wrap for long lines"
              >
                <WrapText size={14} />
                <span>Auto Wrap</span>
              </button>

              {/* Aspect Ratio CustomSelect */}
              <div className={styles.controlItem}>
                <CustomSelect
                  ariaLabel="Aspect ratio"
                  value={settings.aspectRatio}
                  onChange={(val) => updateSetting("aspectRatio", val as AspectRatio)}
                  options={aspectRatioOptions}
                />
              </div>
            </div>
          </div>

          {/* Actions Bar: Shadow select on left, [reset, copy, download] on right (justify-content: space-between) */}
          <div className={styles.actionsRow}>
            {/* Drop Shadow CustomSelect */}
            <div className={styles.controlItem}>
              <CustomSelect
                ariaLabel="Drop shadow"
                value={settings.shadow}
                onChange={(val) => updateSetting("shadow", val as ShadowOption)}
                options={shadowOptions}
              />
            </div>

            {/* Action Buttons Cluster: [reset, copy, download] */}
            <div className={styles.actionButtonsCluster}>
              {/* 1. Reset to Default Button */}
              <ActionButton
                variant="ghost"
                size="md"
                onClick={handleReset}
                title="Reset to default code snippet"
                iconOnly
              >
                <RotateCcw size={15} />
              </ActionButton>

              {/* 2. Secondary Copy Image Button */}
              <ActionButton
                variant="secondary"
                size="md"
                onClick={handleCopyImage}
                disabled={isExporting}
                title="Copy high-res image directly to clipboard"
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
                <span>{isCopied ? "Copied!" : "Copy Image"}</span>
              </ActionButton>

              {/* 3. Primary Download Button with Format Dropdown Popover */}
              <div ref={downloadDropdownRef} className={styles.downloadDropdownWrapper}>
                <ActionButton
                  variant="primary"
                  size="md"
                  onClick={() => setIsDownloadMenuOpen((prev) => !prev)}
                  disabled={isExporting}
                  title="Choose format and download image"
                  aria-expanded={isDownloadMenuOpen}
                  aria-haspopup="menu"
                >
                  <Download size={15} />
                  <span>Download</span>
                  <ChevronDown
                    size={14}
                    style={{
                      transform: isDownloadMenuOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.15s ease",
                    }}
                  />
                </ActionButton>

                {isDownloadMenuOpen && (
                  <div className={styles.downloadMenu} role="menu" aria-label="Download format options">
                    {/* PNG Option */}
                    <div
                      className={styles.downloadMenuItem}
                      onClick={() => {
                        setIsDownloadMenuOpen(false);
                        handleDownloadPng();
                      }}
                      role="menuitem"
                      tabIndex={0}
                    >
                      <div className={styles.downloadMenuHeader}>
                        <div className={styles.downloadMenuTitle}>
                          <ImageIcon size={15} />
                          <span>PNG Image (.png)</span>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>
                          {exportScale}x
                        </span>
                      </div>
                      <div className={styles.downloadMenuDesc}>
                        Crisp raster image for Twitter, LinkedIn, Slack & presentations
                      </div>
                      <div className={styles.resolutionRow} onClick={(e) => e.stopPropagation()}>
                        <span style={{ fontSize: 11, color: "var(--muted)", marginRight: 4 }}>Scale:</span>
                        {([1, 2, 3] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`${styles.resPill} ${exportScale === s ? styles.resPillActive : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportScale(s);
                            }}
                          >
                            {s}x {s === 2 ? "(Retina)" : s === 3 ? "(Ultra)" : ""}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* SVG Option */}
                    <button
                      type="button"
                      className={styles.downloadMenuItem}
                      onClick={() => {
                        setIsDownloadMenuOpen(false);
                        handleDownloadSvg();
                      }}
                      role="menuitem"
                    >
                      <div className={styles.downloadMenuHeader}>
                        <div className={styles.downloadMenuTitle}>
                          <FileCode size={15} />
                          <span>SVG Vector (.svg)</span>
                        </div>
                      </div>
                      <div className={styles.downloadMenuDesc}>
                        Scalable vector graphic for web designs, Figma & Illustrator
                      </div>
                    </button>

                    {/* WebP Option */}
                    <button
                      type="button"
                      className={styles.downloadMenuItem}
                      onClick={() => {
                        setIsDownloadMenuOpen(false);
                        handleDownloadWebp();
                      }}
                      role="menuitem"
                    >
                      <div className={styles.downloadMenuHeader}>
                        <div className={styles.downloadMenuTitle}>
                          <ImageIcon size={15} />
                          <span>WebP Image (.webp)</span>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{exportScale}x</span>
                      </div>
                      <div className={styles.downloadMenuDesc}>
                        Modern lightweight compressed web image format
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sub-toolbar row: Background Swatches & Templates */}
          <div className={styles.templatesBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
              <Palette size={14} />
              <span>Background:</span>
              <div className={styles.swatchesRow} role="radiogroup" aria-label="Background preset">
                {/* Standard Preset Swatches */}
                {Object.values(BACKGROUND_PRESETS)
                  .filter((bg) => bg.id !== "custom" && bg.id !== "transparent")
                  .map((bg) => {
                    const isSelected = settings.background === bg.id;
                    const swatchBg = bg.css || "transparent";
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        title={bg.name}
                        className={`${styles.swatchButton} ${isSelected ? styles.swatchButtonActive : ""}`}
                        style={{ background: swatchBg }}
                        onClick={() => updateSetting("background", bg.id as BackgroundId)}
                      >
                        {isSelected && (
                          <Check size={12} strokeWidth={3} className={styles.swatchCheck} />
                        )}
                      </button>
                    );
                  })}

                {/* No Background (Transparent) Swatch */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={settings.background === "transparent"}
                  title="No background (Transparent)"
                  className={`${styles.swatchButton} ${styles.swatchTransparent} ${
                    settings.background === "transparent" ? styles.swatchButtonActive : ""
                  }`}
                  onClick={() => updateSetting("background", "transparent")}
                >
                  {settings.background === "transparent" ? (
                    <Check size={12} strokeWidth={3} className={styles.swatchCheckDark} />
                  ) : (
                    <Ban size={12} className={styles.swatchTransparentIcon} />
                  )}
                </button>

                {/* Custom Color Palette Picker */}
                <div
                  className={`${styles.swatchButton} ${styles.swatchCustom} ${
                    settings.background === "custom" ? styles.swatchButtonActive : ""
                  }`}
                  style={{
                    background: settings.customBackground || "#176c4b",
                  }}
                  title={`Custom Color: ${settings.customBackground || "#176c4b"} (click to pick)`}
                >
                  <input
                    type="color"
                    value={settings.customBackground || "#176c4b"}
                    onChange={(e) => {
                      updateSetting("background", "custom");
                      updateSetting("customBackground", e.target.value);
                    }}
                    className={styles.customColorInput}
                    aria-label="Pick custom background color"
                  />
                  {settings.background === "custom" ? (
                    <Check size={12} strokeWidth={3} className={styles.swatchCheck} />
                  ) : (
                    <Pipette size={12} className={styles.swatchCustomIcon} />
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
              <span>Templates:</span>
              {Object.entries(CODE_TEMPLATES).map(([key, tmpl]) => (
                <button
                  key={key}
                  type="button"
                  className={styles.templatePill}
                  onClick={() => handleLoadTemplate(key, tmpl)}
                  title={`Load ${tmpl.title}`}
                >
                  {key.toUpperCase()}
                </button>
              ))}

              <button
                type="button"
                className={styles.templatePill}
                onClick={handleAutoDetect}
                title="Auto detect language from code"
              >
                <Sparkles size={11} style={{ marginRight: 4, display: "inline" }} />
                Detect Lang
              </button>
            </div>
          </div>
        </div>

        {/* Centerpiece Canvas Area (Edit directly in the image card!) */}
        <div className={styles.canvasWorkspace}>
          <div
            className={`${styles.exportCardWrapper} ${settings.background === "transparent" ? styles.exportCardTransparent : ""}`}
            style={{
              padding: `${settings.padding}px`,
              borderRadius: `${settings.borderRadius + 8}px`,
              ...backgroundCardStyle,
              ...aspectRatioStyle,
            }}
          >
            {/* The Window Card */}
            <div
              className={`${styles.windowCard} ${shadowClass}`}
              style={{
                borderRadius: `${settings.borderRadius}px`,
                backgroundColor: activeTheme.background,
                borderColor: activeTheme.headerBorder,
              }}
            >
              {/* Window Header */}
              {settings.windowStyle !== "none" && (
                <div
                  className={styles.windowHeader}
                  style={{
                    backgroundColor: activeTheme.headerBackground,
                    borderBottomColor: activeTheme.headerBorder,
                  }}
                >
                  {/* Window Controls */}
                  {settings.windowStyle === "macos" && (
                    <div className={styles.macosButtons}>
                      <span className={`${styles.macDot} ${styles.macClose}`} />
                      <span className={`${styles.macDot} ${styles.macMin}`} />
                      <span className={`${styles.macDot} ${styles.macMax}`} />
                    </div>
                  )}

                  {settings.windowStyle === "minimal" && (
                    <div className={styles.minimalButtons}>
                      <span className={styles.minimalDot} style={{ backgroundColor: activeTheme.comment }} />
                      <span className={styles.minimalDot} style={{ backgroundColor: activeTheme.comment }} />
                      <span className={styles.minimalDot} style={{ backgroundColor: activeTheme.comment }} />
                    </div>
                  )}

                  {settings.windowStyle === "windows" && (
                    <div style={{ width: 44 }} />
                  )}

                  {/* Inline Editable Window Title (Click directly to rename!) */}
                  <input
                    type="text"
                    value={settings.title}
                    onChange={(e) => updateSetting("title", e.target.value)}
                    placeholder="Untitled"
                    className={styles.windowTitleInput}
                    style={{
                      color: activeTheme.comment,
                      fontFamily: "var(--font-code), 'JetBrains Mono', monospace",
                    }}
                    title="Click to rename file/window title"
                    aria-label="File title"
                  />

                  {/* Right side controls/badge */}
                  {settings.windowStyle === "windows" ? (
                    <div className={styles.windowsButtons} style={{ color: activeTheme.comment }}>
                      <span>─</span>
                      <span>□</span>
                      <span>✕</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.5,
                        color: activeTheme.comment,
                        fontFamily: "var(--font-code), 'JetBrains Mono', monospace",
                      }}
                    >
                      {settings.language}
                    </div>
                  )}
                </div>
              )}

              {/* Window Body: Line Numbers + Code Editor Overlay with Auto New Line */}
              <div className={styles.windowBody} style={{ backgroundColor: activeTheme.background }}>
                {/* Direct Code Editor Area */}
                <div className={styles.codeEditorWrapper}>
                  {/* Real-time Syntax Highlight Layer */}
                  <pre
                    className={`${styles.syntaxPre} ${isAutoWrap ? styles.preWrapped : styles.preNoWrap}`}
                    style={{
                      fontSize: `${settings.fontSize}px`,
                      color: activeTheme.foreground,
                    }}
                    aria-hidden="true"
                  >
                    {tokenLines.map((lineTokens, lineIdx) => (
                      <div key={lineIdx} className={styles.codeLine}>
                        {/* Line number aligned at the top of each logical line */}
                        {settings.showLineNumbers && (
                          <span
                            className={styles.lineNumGutter}
                            style={{
                              color: activeTheme.lineNumber,
                              fontSize: `${settings.fontSize}px`,
                            }}
                          >
                            {settings.startLineNumber + lineIdx}
                          </span>
                        )}

                        {/* Content of the line, auto-wrapping if long */}
                        <span className={styles.lineContent}>
                          {lineTokens.length === 0 || (lineTokens.length === 1 && lineTokens[0].value === "") ? (
                            <span>&#8203;</span>
                          ) : (
                            lineTokens.map((tok, tokIdx) => (
                              <span key={tokIdx} style={{ color: getTokenColor(tok, activeTheme) }}>
                                {tok.value}
                              </span>
                            ))
                          )}
                        </span>
                      </div>
                    ))}
                  </pre>

                  {/* Synchronized Transparent Interactive Textarea (type directly on the code!) */}
                  <textarea
                    ref={textareaRef}
                    value={settings.code}
                    onChange={handleCodeChange}
                    onKeyDown={handleKeyDown}
                    className={`${styles.interactiveTextarea} ${isAutoWrap ? styles.preWrapped : styles.preNoWrap}`}
                    style={{
                      fontSize: `${settings.fontSize}px`,
                      caretColor: activeTheme.foreground,
                      paddingLeft: `${textareaPaddingLeft}px`,
                    }}
                    placeholder="Type or paste your code directly here..."
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    aria-label="Direct code editor"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer tips */}
        <div className={styles.canvasFooterHelp}>
          <span>
            💡 <strong>Direct Editing:</strong> Click anywhere on the code or title above to edit live. Press{" "}
            <kbd style={{ padding: "1px 5px", background: "var(--soft)", borderRadius: 4, border: "1px solid var(--border)" }}>
              Tab
            </kbd>{" "}
            for indentation. Auto new line breaks long lines smoothly.
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span>
              Resolution:
              {([1, 2, 3] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setExportScale(s)}
                  style={{
                    marginLeft: 4,
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: exportScale === s ? 700 : 500,
                    background: exportScale === s ? "var(--green)" : "var(--soft)",
                    color: exportScale === s ? "#ffffff" : "var(--text)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {s}x
                </button>
              ))}
            </span>
            <span>
              {lineCount} lines · {settings.code.length} chars
            </span>
          </div>
        </div>
      </div>

      <Snackbar snackbar={snackbar} onDismiss={dismissSnackbar} />
    </div>
  );
}
