import { chromium } from "playwright";
import fs from "node:fs/promises";

const source = "https://cvnk.jp/hiroshima/hiroshima-city/delivery-health";
const casts = [
  { key: "カガミ～それいけ！加賀美さん～", aliases: ["カガミ～それいけ！加賀美さん～", "カガミ"] },
  { key: "ーサアヤー", aliases: ["ーサアヤー", "サアヤ"] },
  { key: "ーメイー", aliases: ["ーメイー", "メイ"] },
  { key: "ルリア～超絶ドMな未経験妻～", aliases: ["ルリア～超絶ドMな未経験妻～", "ルリア"] },
  { key: "ーブルマー", aliases: ["ーブルマー", "ブルマー"] },
  { key: "ーミウー", aliases: ["ーミウー", "ミウ"] },
  { key: "ーユノハー", aliases: ["ーユノハー", "ユノハ"] },
  { key: "ジュン～奇跡の煽情的Iカップ～", aliases: ["ジュン～奇跡の煽情的Iカップ～", "ジュン"] },
  { key: "マナミ", aliases: ["マナミ～清楚女子アナ風美人妻～", "マナミ"] },
  { key: "マーコ", aliases: ["マーコ～SS級癒やし度満点◎～", "マーコ"] },
  { key: "ーソノー", aliases: ["ーソノー", "ソノ"] },
  { key: "ーアンPlatinumー", aliases: ["ーアンPlatinumー", "アンPlatinum"] },
  { key: "エミリ", aliases: ["エミリ～Hカップの爆乳美人妻～", "エミリ"] },
  { key: "サクラコ", aliases: ["サクラコ～エレガントな美人妻～", "サクラコ"] },
  { key: "ーユリー", aliases: ["ーユリー", "ユリー"] },
  { key: "アンナ", aliases: ["アンナ～性欲が溢れて止まらない～", "アンナ"] }
];

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await page.goto(source, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(9000);
  await page.evaluate(async () => {
    const imgs = [...document.images];
    await Promise.all(imgs.map(img => img.decode?.().catch(() => {}) ?? Promise.resolve()));
  });

  const extracted = await page.evaluate((casts) => {
    const output = {};
    const all = [...document.querySelectorAll("body *")];
    for (const cast of casts) {
      const matches = all.filter(el =>
        el.children.length === 0 &&
        cast.aliases.some(alias => (el.textContent || "").trim().includes(alias))
      ).sort((a, b) => a.outerHTML.length - b.outerHTML.length);
      const node = matches[0];
      if (!node) continue;

      let current = node;
      let selected = null;
      let profile = null;
      for (let depth = 0; current && depth < 9; depth++, current = current.parentElement) {
        const anchors = [...current.querySelectorAll("a[href]")];
        const candidateProfile = anchors.find(a =>
          /cityheaven\.net|girlid-|profile/i.test(a.href) &&
          !a.href.includes("/hiroshima-city/delivery-health")
        );
        if (!profile && candidateProfile) profile = candidateProfile.href;

        const candidates = [...current.querySelectorAll("img")].map(img => ({
          src: img.currentSrc || img.src || img.getAttribute("data-src") || img.getAttribute("data-original"),
          alt: img.alt || "",
          width: img.naturalWidth || img.width || 0,
          height: img.naturalHeight || img.height || 0
        })).filter(img =>
          img.src && /^https?:\/\//.test(img.src) &&
          !/logo|icon|banner|qr|no.?image/i.test(img.src + " " + img.alt)
        );
        if (candidates.length === 1) {
          selected = candidates[0];
          break;
        }
        if (candidates.length > 1) {
          const byAlt = candidates.find(img => cast.aliases.some(alias => img.alt.includes(alias)));
          if (byAlt) { selected = byAlt; break; }
        }
      }
      if (selected) output[cast.key] = { image: selected.src, profile: profile || source };
    }
    return output;
  }, casts);

  const result = {
    updatedAt: new Date().toISOString(),
    source,
    photos: extracted
  };
  await fs.writeFile("cast-photos.json", JSON.stringify(result, null, 2) + "\n");
  console.log("Official cast photos found:", Object.keys(extracted).length, "/", casts.length);
  console.log(Object.keys(extracted));
} finally {
  await browser.close();
}
