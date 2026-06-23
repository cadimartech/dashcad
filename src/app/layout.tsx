import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-jetbrains-mono",
	subsets: ["latin"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "DashCAD — Visor y catálogo CAD 3D",
	description:
		"Sube archivos STEP, conviértelos a GLB y visualízalos en 3D en el navegador.",
};

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("dashcad-theme");
    var theme = stored === "light" || stored === "dark" ? stored : "dark";
    if (theme === "dark") document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${jetbrainsMono.variable} h-full antialiased`}
			suppressHydrationWarning
		>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
			</head>
			<body className="min-h-full flex flex-col bg-background text-foreground">
				{children}
			</body>
		</html>
	);
}