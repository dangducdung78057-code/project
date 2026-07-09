// 走位节拍标记轨道导出 (Cubase Pro 15 兼容, StageOS v2.0)
// 将 3D 队形编辑器的时间轴关键帧转换为标准 Marker 轨道数据,
// 供音乐老师导入 DAW 后按走位时间点对齐配乐剪辑。

export type DawMarker = {
  /** 秒 */
  time: number;
  name: string;
};

/** 秒 → hh:mm:ss(Cubase Marker 时间格式) */
function toTimecode(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** 生成标准 MIDI Marker XML,供 Cubase Pro 15 导入使用 */
export function generateDawMarkerTrack(markers: DawMarker[]): string {
  const items = markers
    .slice()
    .sort((a, b) => a.time - b.time)
    .map((m) => `  <Marker time='${toTimecode(m.time)}'>${escapeXml(m.name)}</Marker>`)
    .join("\n");
  return `<?xml version='1.0' encoding='UTF-8'?>\n<SMF>\n${items}\n</SMF>\n`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;");
}

/** 触发浏览器下载 Marker 轨道文件 */
export function downloadDawMarkerTrack(markers: DawMarker[], filename = "stage-formation-markers.xml"): void {
  const xml = generateDawMarkerTrack(markers);
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
