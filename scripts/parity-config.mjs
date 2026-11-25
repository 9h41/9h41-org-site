const allRoutes = [
  { slug: 'home', path: '/' },
  { slug: 'coding-gouter-tours', path: '/coding-gouter-tours/' },
  { slug: 'association-numerique-responsable', path: '/association-numerique-responsable/' },
  { slug: 'privacy-policy', path: '/privacy-policy/' },
  { slug: 'accessibility-statement', path: '/accessibility-statement/' }
];

// PARITY_ONLY=slug1,slug2 limits a run to some pages
const only = process.env.PARITY_ONLY ? process.env.PARITY_ONLY.split(',') : null;
export const routes = only ? allRoutes.filter((r) => only.includes(r.slug)) : allRoutes;

export const viewports = {
  desktop: { width: 1440, height: 2200 },
  mobile: { width: 390, height: 2400 }
};
