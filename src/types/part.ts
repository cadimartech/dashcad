export type ConversionStatus = "pending" | "converting" | "ready" | "failed";

export type CadPart = {
	id: string;
	name: string;
	description: string;
	filename: string;
	thumbnailFilename?: string;
	category: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
	fileSize: number;
	/** Server-side STEP→GLB job state; omitted on legacy catalog rows until inferred */
	conversionStatus?: ConversionStatus;
	/** Last conversion failure message when conversionStatus is failed */
	conversionError?: string;
};
