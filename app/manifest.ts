export default function manifest() {
  const mobileLogoPath = "/%D8%B4%D8%B9%D8%A7%D8%B1%20%D8%A7%D9%84%D8%AC%D9%88%D8%A7%D9%84.png"

  return {
    name: "مجمع الملك خالد",
    short_name: "مجمع الملك خالد",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fbff",
    theme_color: "#3453a7",
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: mobileLogoPath,
        type: "image/png",
      },
      {
        src: mobileLogoPath,
        type: "image/png",
      },
    ],
  }
}