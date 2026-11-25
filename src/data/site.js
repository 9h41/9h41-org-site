const domain = process.env.SITE_DOMAIN || "https://www.9h41.org";
const siteEnv = process.env.SITE_ENV || (domain.includes("stg.") ? "staging" : "production");
const isStaging = siteEnv === "staging";

module.exports = {
  name: "9h41",
  domain,
  lang: "fr",
  locale: "fr_FR",
  description: "Agence web et mobile à Tours. 9h41 conçoit des solutions IT sur mesure, intégrant design, développement, IA et maintenance.",
  author: "9h41",
  email: "contact@9h41.org",
  socialImage: "/assets/images/social-card.png",
  robots: isStaging ? "noindex,nofollow" : "index,follow",
  isStaging
};
