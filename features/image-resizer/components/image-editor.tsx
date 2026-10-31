"use client";
import { useEffect, useRef, useState } from "react";
import ReactCrop, { type PercentCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import styles from "../styles.module.css";
export default function ImageEditor({
  url,
  width,
  height,
  crop,
  aspect,
  zoom,
  onChange,
}: {
  url: string;
  width: number;
  height: number;
  crop: PercentCrop;
  aspect?: number;
  zoom: number;
  onChange: (crop: PercentCrop) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSpace({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (zoom === 100) viewport.current?.scrollTo(0, 0);
  }, [zoom, url]);
  // Fit both axes before applying display zoom. Percent crop coordinates still
  // refer to the full source image, including when the editor is resized.
  const fittedWidth = Math.min(space.width, (space.height * width) / height);
  const displayWidth = Math.max(1, Math.floor((fittedWidth * zoom) / 100));
  return (
    <div
      ref={viewport}
      className={styles.viewport}
      tabIndex={0}
      aria-label="Image crop editor. Tab to the crop handles and use arrow keys to adjust. Scroll to pan when zoomed in."
    >
      <div className={styles.zoomSurface}>
        <div className={styles.zoomStage} style={{ width: displayWidth }}>
          <ReactCrop
            crop={crop}
            onChange={(_pixels, percent) => onChange(percent)}
            aspect={aspect}
            keepSelection
            minWidth={4}
            minHeight={4}
            ruleOfThirds
          >
            {/* Local object URL; the original pixels must remain available for cropping. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Image to crop"
              className={styles.sourceImage}
              draggable={false}
            />
          </ReactCrop>
        </div>
      </div>
    </div>
  );
}
