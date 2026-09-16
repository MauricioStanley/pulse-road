/** Same source works at localhost / and at GitHub Pages /pulse-road/. */
export const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
