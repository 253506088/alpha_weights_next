/**
 * Formats a Date object to "YYYY-MM-DD HH:mm:ss"
 */
export function formatDate(date: Date = new Date()): string {
    const pad = (n: number) => n.toString().padStart(2, '0');

    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const HH = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());

    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
}

/**
 * Logs a message with the required format: 【DATE】-【MODULE】-【CONTENT】
 */
export function log(module: string, content: string) {
    const dateStr = formatDate();
    const message = `【${dateStr}】-【${module}】-【${content}】`;

    console.log(message);

    // Optionally, we could dispatch a custom event if we want to show logs in UI later
    // window.dispatchEvent(new CustomEvent('aw-log', { detail: message }));
}
