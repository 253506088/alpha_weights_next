/**
 * Loads a script via JSONP style injection.
 * @param url The URL of the script to load.
 * @param callback Optional callback to run after script loads.
 * @returns Promise that resolves when script loads.
 */
export function loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;

        script.onload = () => {
            document.body.removeChild(script);
            resolve();
        };

        script.onerror = (e) => {
            document.body.removeChild(script);
            reject(new Error(`Script load failed: ${url}`));
        };

        document.body.appendChild(script);
    });
}
