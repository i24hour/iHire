/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: "https://infinwork.app",
    generateRobotsTxt: true,
    changefreq: "daily",
    priority: 0.7,
    sitemapSize: 7000,
    exclude: [
      "/api/*",
      "/admin/*",
      "/private/*"
    ]
  }
