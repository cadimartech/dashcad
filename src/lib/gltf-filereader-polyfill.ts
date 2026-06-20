/** THREE GLTFExporter uses FileReader + onloadend in Node.js. */
export function ensureFileReaderPolyfill(): void {
	if (typeof globalThis.FileReader !== "undefined") {
		// Still patch if onloadend is never wired (some Node builds expose a stub FileReader).
		const FR = globalThis.FileReader;
		const proto = FR.prototype as FileReader & {
			_dispatchLoadEnd?: (err?: Error) => void;
		};
		if (!proto._dispatchLoadEnd) {
			const original = proto.readAsArrayBuffer?.bind(
				Object.create(proto) as FileReader,
			);
			if (typeof original === "function") return;
		}
	}

	class FileReaderPolyfill {
		static readonly EMPTY = 0;
		static readonly LOADING = 1;
		static readonly DONE = 2;

		result: unknown = null;
		error: Error | null = null;
		readyState = 0;
		onload: ((event: { target: object }) => void) | null = null;
		onerror: ((event: { target: object }) => void) | null = null;
		onloadend: ((event: { target: object }) => void) | null = null;

		private finish(err?: Error) {
			this.readyState = FileReaderPolyfill.DONE;
			const event = { target: this };
			if (err) {
				this.error = err;
				this.onerror?.(event);
			} else {
				this.onload?.(event);
			}
			this.onloadend?.(event);
		}

		readAsArrayBuffer(blob: Blob) {
			this.readyState = FileReaderPolyfill.LOADING;
			blob
				.arrayBuffer()
				.then((buf) => {
					this.result = buf;
					this.finish();
				})
				.catch((err: Error) => {
					this.finish(err);
				});
		}

		readAsDataURL(blob: Blob) {
			this.readyState = FileReaderPolyfill.LOADING;
			blob
				.arrayBuffer()
				.then((buf) => {
					const bytes = new Uint8Array(buf);
					let binary = "";
					for (let i = 0; i < bytes.length; i++) {
						binary += String.fromCharCode(bytes[i]);
					}
					const b64 =
						typeof Buffer !== "undefined"
							? Buffer.from(buf).toString("base64")
							: btoa(binary);
					this.result = `data:${blob.type || "application/octet-stream"};base64,${b64}`;
					this.finish();
				})
				.catch((err: Error) => {
					this.finish(err);
				});
		}
	}

	globalThis.FileReader =
		FileReaderPolyfill as unknown as typeof globalThis.FileReader;
}