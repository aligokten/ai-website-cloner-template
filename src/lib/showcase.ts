import type { ArtStyle } from "@/types";

export interface ShowcaseItem {
  id: string;
  name: string;
  prompt: string;
  style: ArtStyle;
  author: string;
  likes: number;
  downloads: number;
  category: string;
}

/**
 * Community gallery seed. Each entry is a real prompt — the card thumbnails and
 * the detail viewer are generated from it at runtime, not stored as images.
 */
export const SHOWCASE: ShowcaseItem[] = [
  { id: "sc-01", name: "Sentinel Mk II", prompt: "battle-worn steel robot sentinel with orange visor", style: "realistic", author: "kai.render", likes: 2841, downloads: 912, category: "Characters" },
  { id: "sc-02", name: "Ember Knight", prompt: "armored knight character with crimson cape", style: "realistic", author: "studio.nova", likes: 2210, downloads: 744, category: "Characters" },
  { id: "sc-03", name: "Frost Dragon", prompt: "cyan ice dragon creature with crystal scales", style: "sculpture", author: "wren3d", likes: 3980, downloads: 1521, category: "Creatures" },
  { id: "sc-04", name: "Voxel Fox", prompt: "orange voxel fox creature", style: "voxel", author: "pixelpine", likes: 1688, downloads: 640, category: "Creatures" },
  { id: "sc-05", name: "Neon Racer", prompt: "low poly neon magenta racing car", style: "low-poly", author: "atlas.gg", likes: 2455, downloads: 1103, category: "Vehicles" },
  { id: "sc-06", name: "Dune Hauler", prompt: "rusted desert truck vehicle with tan panels", style: "realistic", author: "mirasol", likes: 1204, downloads: 386, category: "Vehicles" },
  { id: "sc-07", name: "Ion Cruiser", prompt: "silver spaceship cruiser with blue engines", style: "realistic", author: "orbit.lab", likes: 3110, downloads: 1298, category: "Sci-fi" },
  { id: "sc-08", name: "Scout Shuttle", prompt: "compact white shuttle spacecraft", style: "low-poly", author: "hexen", likes: 902, downloads: 311, category: "Sci-fi" },
  { id: "sc-09", name: "Duskblade", prompt: "obsidian katana sword with gold hilt", style: "realistic", author: "kuro.works", likes: 4102, downloads: 1877, category: "Props" },
  { id: "sc-10", name: "Runic Hammer", prompt: "stone warhammer weapon with green runes", style: "sculpture", author: "forgeling", likes: 1544, downloads: 502, category: "Props" },
  { id: "sc-11", name: "Alpine Cabin", prompt: "cozy wooden cabin house with snow roof", style: "cartoon", author: "meadow.io", likes: 2680, downloads: 990, category: "Environments" },
  { id: "sc-12", name: "Clocktower", prompt: "stone castle tower building with copper roof", style: "realistic", author: "brickbyte", likes: 1370, downloads: 428, category: "Environments" },
  { id: "sc-13", name: "Reading Chair", prompt: "mid-century wooden chair with beige cushion", style: "realistic", author: "form.studio", likes: 812, downloads: 356, category: "Furniture" },
  { id: "sc-14", name: "Throne of Ash", prompt: "gothic black throne chair with silver trim", style: "sculpture", author: "vaulted", likes: 1985, downloads: 613, category: "Furniture" },
  { id: "sc-15", name: "Willow", prompt: "stylized green tree with layered canopy", style: "cartoon", author: "leafnode", likes: 1442, downloads: 705, category: "Nature" },
  { id: "sc-16", name: "Cave Bloom", prompt: "glowing purple crystal cluster formation", style: "realistic", author: "geode", likes: 2903, downloads: 1174, category: "Nature" },
  { id: "sc-17", name: "Mana Flask", prompt: "blue potion bottle with cork stopper", style: "cartoon", author: "questkit", likes: 3320, downloads: 1806, category: "Props" },
  { id: "sc-18", name: "Birthday Slice", prompt: "pink frosted cake with candles", style: "cartoon", author: "sugarbyte", likes: 1120, downloads: 402, category: "Food" },
  { id: "sc-19", name: "Warden Droid", prompt: "boxy grey security droid with red sensor", style: "low-poly", author: "circuitfarm", likes: 2077, downloads: 861, category: "Characters" },
  { id: "sc-20", name: "Marsh Beast", prompt: "green swamp creature with tusks", style: "sculpture", author: "bogart3d", likes: 1633, downloads: 470, category: "Creatures" },
  { id: "sc-21", name: "Chrome Study", prompt: "abstract chrome sculpture with twisted forms", style: "realistic", author: "null.space", likes: 2512, downloads: 688, category: "Abstract" },
  { id: "sc-22", name: "Pastel Stack", prompt: "abstract pastel geometry composition", style: "cartoon", author: "softgrid", likes: 1298, downloads: 344, category: "Abstract" },
  { id: "sc-23", name: "Voxel Village", prompt: "voxel cottage house with red roof", style: "voxel", author: "blockmason", likes: 1760, downloads: 828, category: "Environments" },
  { id: "sc-24", name: "Astro Pilot", prompt: "white astronaut character with gold visor", style: "cartoon", author: "lunar.dev", likes: 4520, downloads: 2140, category: "Characters" },
];

export const SHOWCASE_CATEGORIES = [
  "All",
  ...Array.from(new Set(SHOWCASE.map((item) => item.category))).sort(),
];
