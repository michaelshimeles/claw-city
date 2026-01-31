import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ============================================================================
// ZONE SEED DATA
// ============================================================================

const ZONES_DATA = [
  {
    slug: "residential",
    name: "Residential District",
    type: "residential" as const,
    description:
      "A quiet neighborhood with affordable housing. The starting point for newcomers. Low risk, low reward, but connects to most of the city.",
    mapCoords: { center: { lng: 0, lat: 0 }, radius: 0.8 },
  },
  {
    slug: "downtown",
    name: "Downtown",
    type: "commercial" as const,
    description:
      "The bustling heart of ClawCity. Banks, corporate offices, and high-end establishments. Good jobs for those with reputation, but police presence is moderate.",
    mapCoords: { center: { lng: 2, lat: 0 }, radius: 1.0 },
  },
  {
    slug: "market",
    name: "Market Square",
    type: "commercial" as const,
    description:
      "The commercial hub where goods flow freely. Best prices for buying and selling. Shops of all kinds line the streets.",
    mapCoords: { center: { lng: 1, lat: -1 }, radius: 0.7 },
  },
  {
    slug: "industrial",
    name: "Industrial Zone",
    type: "industrial" as const,
    description:
      "Factories and warehouses dominate the landscape. Plenty of labor jobs available. The air is thick with smoke and opportunity.",
    mapCoords: { center: { lng: -1, lat: -1 }, radius: 0.9 },
  },
  {
    slug: "docks",
    name: "The Docks",
    type: "industrial" as const,
    description:
      "Where ships come and go, so do opportunities both legal and otherwise. Low police presence makes it attractive for those seeking to operate in the shadows.",
    mapCoords: { center: { lng: 0, lat: -2 }, radius: 0.8 },
  },
  {
    slug: "suburbs",
    name: "Suburbs",
    type: "residential" as const,
    description:
      "Quiet streets and manicured lawns. Few jobs here, but it's safe. A good place to lay low when heat gets too high.",
    mapCoords: { center: { lng: -1, lat: 1.5 }, radius: 0.9 },
  },
  {
    slug: "hospital",
    name: "City Hospital",
    type: "government" as const,
    description:
      "The only place in the city where you can get proper medical treatment. Healing isn't cheap, but it beats the alternative.",
    mapCoords: { center: { lng: -2, lat: 0 }, radius: 0.6 },
  },
  {
    slug: "police_station",
    name: "Police Station",
    type: "government" as const,
    description:
      "Home of ClawCity's finest. If you end up here, you've made some bad choices. Jail cells await those who push their luck too far.",
    mapCoords: { center: { lng: 2.5, lat: 0.5 }, radius: 0.5 },
  },
];

// ============================================================================
// ZONE EDGES SEED DATA (Travel connections)
// ============================================================================

// Zone connections: [fromSlug, toSlug, timeCostTicks, cashCost, heatRisk]
const ZONE_EDGES_DATA: [string, string, number, number, number][] = [
  // Residential connects to most zones (it's the starting zone)
  ["residential", "downtown", 2, 10, 0.05],
  ["residential", "market", 1, 5, 0.02],
  ["residential", "industrial", 2, 8, 0.05],
  ["residential", "suburbs", 1, 5, 0.0],
  ["residential", "hospital", 2, 15, 0.0],
  ["residential", "police_station", 2, 10, 0.0],

  // Downtown connections
  ["downtown", "residential", 2, 10, 0.05],
  ["downtown", "market", 1, 8, 0.03],
  ["downtown", "industrial", 2, 12, 0.08],
  ["downtown", "hospital", 1, 12, 0.0],
  ["downtown", "police_station", 1, 8, 0.0],

  // Market connections
  ["market", "residential", 1, 5, 0.02],
  ["market", "downtown", 1, 8, 0.03],
  ["market", "industrial", 2, 10, 0.05],
  ["market", "docks", 2, 12, 0.1],
  ["market", "hospital", 2, 15, 0.0],
  ["market", "police_station", 2, 10, 0.0],

  // Industrial connections
  ["industrial", "residential", 2, 8, 0.05],
  ["industrial", "downtown", 2, 12, 0.08],
  ["industrial", "market", 2, 10, 0.05],
  ["industrial", "docks", 1, 5, 0.08],
  ["industrial", "hospital", 3, 18, 0.0],
  ["industrial", "police_station", 2, 12, 0.0],

  // Docks connections
  ["docks", "market", 2, 12, 0.1],
  ["docks", "industrial", 1, 5, 0.08],
  ["docks", "hospital", 3, 20, 0.0],
  ["docks", "police_station", 3, 15, 0.0],

  // Suburbs connections
  ["suburbs", "residential", 1, 5, 0.0],
  ["suburbs", "downtown", 3, 15, 0.02],
  ["suburbs", "hospital", 2, 12, 0.0],
  ["suburbs", "police_station", 2, 10, 0.0],

  // Hospital connections (accessible from anywhere, shown above)
  ["hospital", "residential", 2, 15, 0.0],
  ["hospital", "downtown", 1, 12, 0.0],
  ["hospital", "market", 2, 15, 0.0],
  ["hospital", "industrial", 3, 18, 0.0],
  ["hospital", "docks", 3, 20, 0.0],
  ["hospital", "suburbs", 2, 12, 0.0],
  ["hospital", "police_station", 1, 8, 0.0],

  // Police station connections (accessible from anywhere, shown above)
  ["police_station", "residential", 2, 10, 0.0],
  ["police_station", "downtown", 1, 8, 0.0],
  ["police_station", "market", 2, 10, 0.0],
  ["police_station", "industrial", 2, 12, 0.0],
  ["police_station", "docks", 3, 15, 0.0],
  ["police_station", "suburbs", 2, 10, 0.0],
  ["police_station", "hospital", 1, 8, 0.0],
];

// ============================================================================
// ITEMS SEED DATA
// ============================================================================

const ITEMS_DATA = [
  // Medical items
  {
    slug: "medkit",
    name: "First Aid Kit",
    category: "medical" as const,
    basePrice: 50,
    legal: true,
    effects: { healthDelta: 30 },
  },
  {
    slug: "bandage",
    name: "Bandage",
    category: "medical" as const,
    basePrice: 15,
    legal: true,
    effects: { healthDelta: 10 },
  },
  {
    slug: "painkillers",
    name: "Painkillers",
    category: "medical" as const,
    basePrice: 25,
    legal: true,
    effects: { healthDelta: 15, staminaDelta: 5 },
  },

  // Food items
  {
    slug: "burger",
    name: "Greasy Burger",
    category: "food" as const,
    basePrice: 8,
    legal: true,
    effects: { healthDelta: 5, staminaDelta: 15 },
  },
  {
    slug: "coffee",
    name: "Strong Coffee",
    category: "food" as const,
    basePrice: 5,
    legal: true,
    effects: { staminaDelta: 20 },
  },
  {
    slug: "energy_drink",
    name: "Energy Drink",
    category: "food" as const,
    basePrice: 10,
    legal: true,
    effects: { staminaDelta: 30 },
  },

  // Tool items
  {
    slug: "lockpick",
    name: "Lockpick Set",
    category: "tool" as const,
    basePrice: 75,
    legal: false,
    effects: { heatDelta: 5 },
  },
  {
    slug: "crowbar",
    name: "Crowbar",
    category: "tool" as const,
    basePrice: 40,
    legal: true,
    effects: {},
  },
  {
    slug: "flashlight",
    name: "Flashlight",
    category: "tool" as const,
    basePrice: 20,
    legal: true,
    effects: {},
  },

  // Luxury items
  {
    slug: "watch",
    name: "Luxury Watch",
    category: "luxury" as const,
    basePrice: 500,
    legal: true,
    effects: {},
  },
  {
    slug: "jewelry",
    name: "Gold Jewelry",
    category: "luxury" as const,
    basePrice: 350,
    legal: true,
    effects: {},
  },
  {
    slug: "designer_bag",
    name: "Designer Handbag",
    category: "luxury" as const,
    basePrice: 400,
    legal: true,
    effects: {},
  },

  // Contraband items
  {
    slug: "drugs",
    name: "Illegal Substances",
    category: "contraband" as const,
    basePrice: 200,
    legal: false,
    effects: { heatDelta: 20 },
  },
  {
    slug: "stolen_goods",
    name: "Stolen Electronics",
    category: "contraband" as const,
    basePrice: 150,
    legal: false,
    effects: { heatDelta: 15 },
  },
  {
    slug: "counterfeit",
    name: "Counterfeit Bills",
    category: "contraband" as const,
    basePrice: 100,
    legal: false,
    effects: { heatDelta: 25 },
  },

  // Weapon items
  {
    slug: "brass_knuckles",
    name: "Brass Knuckles",
    category: "weapon" as const,
    basePrice: 60,
    legal: false,
    effects: { heatDelta: 10 },
  },
  {
    slug: "baseball_bat",
    name: "Baseball Bat",
    category: "weapon" as const,
    basePrice: 30,
    legal: true,
    effects: {},
  },
];

// ============================================================================
// JOBS SEED DATA
// ============================================================================

// Jobs will be created with zone IDs after zones are seeded
// [zoneSlug, type, title, wage, durationTicks, requirements, staminaCost]
interface JobData {
  zoneSlug: string;
  type: string;
  title: string;
  wage: number;
  durationTicks: number;
  requirements: {
    minReputation?: number;
    minSkill?: { skill: string; level: number };
  };
  staminaCost: number;
}

const JOBS_DATA: JobData[] = [
  // Residential jobs (easy entry-level)
  {
    zoneSlug: "residential",
    type: "delivery",
    title: "Package Delivery",
    wage: 30,
    durationTicks: 2,
    requirements: {},
    staminaCost: 10,
  },
  {
    zoneSlug: "residential",
    type: "service",
    title: "Lawn Care",
    wage: 25,
    durationTicks: 3,
    requirements: {},
    staminaCost: 20,
  },
  {
    zoneSlug: "residential",
    type: "delivery",
    title: "Food Delivery",
    wage: 35,
    durationTicks: 2,
    requirements: { minSkill: { skill: "driving", level: 1 } },
    staminaCost: 10,
  },

  // Downtown jobs (better pay, require reputation)
  {
    zoneSlug: "downtown",
    type: "office",
    title: "Data Entry Clerk",
    wage: 60,
    durationTicks: 4,
    requirements: { minReputation: 5 },
    staminaCost: 15,
  },
  {
    zoneSlug: "downtown",
    type: "office",
    title: "Office Assistant",
    wage: 75,
    durationTicks: 5,
    requirements: { minReputation: 10 },
    staminaCost: 20,
  },
  {
    zoneSlug: "downtown",
    type: "security",
    title: "Building Security",
    wage: 90,
    durationTicks: 6,
    requirements: { minReputation: 15, minSkill: { skill: "combat", level: 2 } },
    staminaCost: 30,
  },

  // Market jobs (trade focused)
  {
    zoneSlug: "market",
    type: "service",
    title: "Shop Assistant",
    wage: 40,
    durationTicks: 3,
    requirements: {},
    staminaCost: 15,
  },
  {
    zoneSlug: "market",
    type: "service",
    title: "Market Vendor",
    wage: 55,
    durationTicks: 4,
    requirements: { minSkill: { skill: "negotiation", level: 1 } },
    staminaCost: 20,
  },
  {
    zoneSlug: "market",
    type: "warehouse",
    title: "Stock Handler",
    wage: 45,
    durationTicks: 3,
    requirements: {},
    staminaCost: 25,
  },

  // Industrial jobs (labor intensive)
  {
    zoneSlug: "industrial",
    type: "warehouse",
    title: "Warehouse Worker",
    wage: 50,
    durationTicks: 4,
    requirements: {},
    staminaCost: 30,
  },
  {
    zoneSlug: "industrial",
    type: "warehouse",
    title: "Forklift Operator",
    wage: 70,
    durationTicks: 5,
    requirements: { minSkill: { skill: "driving", level: 2 } },
    staminaCost: 25,
  },
  {
    zoneSlug: "industrial",
    type: "labor",
    title: "Factory Hand",
    wage: 55,
    durationTicks: 5,
    requirements: {},
    staminaCost: 35,
  },

  // Docks jobs (risky but profitable)
  {
    zoneSlug: "docks",
    type: "labor",
    title: "Dock Worker",
    wage: 65,
    durationTicks: 5,
    requirements: {},
    staminaCost: 35,
  },
  {
    zoneSlug: "docks",
    type: "delivery",
    title: "Cargo Handler",
    wage: 80,
    durationTicks: 4,
    requirements: { minSkill: { skill: "driving", level: 1 } },
    staminaCost: 30,
  },
  {
    zoneSlug: "docks",
    type: "security",
    title: "Night Watchman",
    wage: 100,
    durationTicks: 8,
    requirements: { minSkill: { skill: "combat", level: 1 } },
    staminaCost: 25,
  },

  // Suburbs jobs (few and simple)
  {
    zoneSlug: "suburbs",
    type: "service",
    title: "House Cleaner",
    wage: 35,
    durationTicks: 3,
    requirements: {},
    staminaCost: 20,
  },
  {
    zoneSlug: "suburbs",
    type: "delivery",
    title: "Newspaper Delivery",
    wage: 20,
    durationTicks: 2,
    requirements: {},
    staminaCost: 10,
  },
];

// ============================================================================
// VEHICLES SEED DATA
// ============================================================================

interface VehicleData {
  zoneSlug: string;
  type: "motorcycle" | "car" | "sports_car" | "truck" | "van";
  name: string;
  condition: number;
  speedBonus: number;
  value: number;
}

const VEHICLES_DATA: VehicleData[] = [
  // Residential - mostly older cars
  {
    zoneSlug: "residential",
    type: "car",
    name: "Rusty Sedan",
    condition: 75,
    speedBonus: 0.25,
    value: 800,
  },
  {
    zoneSlug: "residential",
    type: "car",
    name: "Family Wagon",
    condition: 85,
    speedBonus: 0.28,
    value: 1000,
  },
  {
    zoneSlug: "residential",
    type: "motorcycle",
    name: "Dirt Bike",
    condition: 90,
    speedBonus: 0.25,
    value: 500,
  },

  // Downtown - fancy cars
  {
    zoneSlug: "downtown",
    type: "sports_car",
    name: "Executive Roadster",
    condition: 100,
    speedBonus: 0.50,
    value: 3500,
  },
  {
    zoneSlug: "downtown",
    type: "sports_car",
    name: "Luxury Coupe",
    condition: 95,
    speedBonus: 0.48,
    value: 3200,
  },
  {
    zoneSlug: "downtown",
    type: "car",
    name: "Business Sedan",
    condition: 90,
    speedBonus: 0.30,
    value: 1200,
  },

  // Market - delivery vehicles
  {
    zoneSlug: "market",
    type: "van",
    name: "Delivery Van",
    condition: 80,
    speedBonus: 0.18,
    value: 650,
  },
  {
    zoneSlug: "market",
    type: "truck",
    name: "Pickup Truck",
    condition: 85,
    speedBonus: 0.15,
    value: 800,
  },
  {
    zoneSlug: "market",
    type: "motorcycle",
    name: "Courier Scooter",
    condition: 90,
    speedBonus: 0.22,
    value: 400,
  },

  // Industrial - work vehicles
  {
    zoneSlug: "industrial",
    type: "truck",
    name: "Heavy Hauler",
    condition: 70,
    speedBonus: 0.12,
    value: 900,
  },
  {
    zoneSlug: "industrial",
    type: "truck",
    name: "Box Truck",
    condition: 75,
    speedBonus: 0.14,
    value: 850,
  },
  {
    zoneSlug: "industrial",
    type: "van",
    name: "Work Van",
    condition: 65,
    speedBonus: 0.16,
    value: 600,
  },

  // Docks - mixed vehicles
  {
    zoneSlug: "docks",
    type: "truck",
    name: "Cargo Truck",
    condition: 60,
    speedBonus: 0.13,
    value: 750,
  },
  {
    zoneSlug: "docks",
    type: "van",
    name: "Smuggler's Van",
    condition: 80,
    speedBonus: 0.22,
    value: 800,
  },
  {
    zoneSlug: "docks",
    type: "motorcycle",
    name: "Street Bike",
    condition: 85,
    speedBonus: 0.28,
    value: 550,
  },

  // Suburbs - family vehicles
  {
    zoneSlug: "suburbs",
    type: "car",
    name: "Minivan",
    condition: 90,
    speedBonus: 0.25,
    value: 900,
  },
  {
    zoneSlug: "suburbs",
    type: "car",
    name: "SUV",
    condition: 88,
    speedBonus: 0.28,
    value: 1100,
  },
  {
    zoneSlug: "suburbs",
    type: "sports_car",
    name: "Garage Queen",
    condition: 100,
    speedBonus: 0.55,
    value: 4000,
  },
];

// ============================================================================
// BUSINESSES SEED DATA
// ============================================================================

interface BusinessData {
  zoneSlug: string;
  type: string;
  name: string;
  cashOnHand: number;
  inventory: { itemSlug: string; qty: number; price: number }[];
}

// ============================================================================
// PROPERTIES SEED DATA
// ============================================================================

interface PropertyData {
  zoneSlug: string;
  name: string;
  type: "apartment" | "house" | "safehouse" | "penthouse" | "warehouse";
  buyPrice: number;
  rentPrice: number;
  heatReduction: number;
  staminaBoost: number;
  capacity: number;
  features?: string[];
}

const PROPERTIES_DATA: PropertyData[] = [
  // Residential district - affordable housing
  {
    zoneSlug: "residential",
    name: "Starter Apartment #101",
    type: "apartment",
    buyPrice: 2000,
    rentPrice: 100,
    heatReduction: 10,
    staminaBoost: 10,
    capacity: 2,
  },
  {
    zoneSlug: "residential",
    name: "Starter Apartment #202",
    type: "apartment",
    buyPrice: 2000,
    rentPrice: 100,
    heatReduction: 10,
    staminaBoost: 10,
    capacity: 2,
  },
  {
    zoneSlug: "residential",
    name: "Family Home",
    type: "house",
    buyPrice: 5000,
    rentPrice: 250,
    heatReduction: 20,
    staminaBoost: 15,
    capacity: 4,
    features: ["backyard", "garage"],
  },

  // Suburbs - quiet and safe
  {
    zoneSlug: "suburbs",
    name: "Suburban House",
    type: "house",
    buyPrice: 6000,
    rentPrice: 300,
    heatReduction: 25,
    staminaBoost: 20,
    capacity: 4,
    features: ["pool", "garage"],
  },
  {
    zoneSlug: "suburbs",
    name: "Cozy Cottage",
    type: "house",
    buyPrice: 4500,
    rentPrice: 225,
    heatReduction: 20,
    staminaBoost: 15,
    capacity: 3,
  },

  // Downtown - expensive but central
  {
    zoneSlug: "downtown",
    name: "Skyline Penthouse",
    type: "penthouse",
    buyPrice: 25000,
    rentPrice: 1000,
    heatReduction: 30,
    staminaBoost: 25,
    capacity: 4,
    features: ["helipad", "hot_tub", "city_view"],
  },
  {
    zoneSlug: "downtown",
    name: "Executive Suite",
    type: "penthouse",
    buyPrice: 20000,
    rentPrice: 800,
    heatReduction: 25,
    staminaBoost: 20,
    capacity: 3,
    features: ["city_view"],
  },
  {
    zoneSlug: "downtown",
    name: "Downtown Apartment",
    type: "apartment",
    buyPrice: 3500,
    rentPrice: 175,
    heatReduction: 10,
    staminaBoost: 10,
    capacity: 2,
  },

  // Industrial - warehouses for gangs
  {
    zoneSlug: "industrial",
    name: "Storage Warehouse A",
    type: "warehouse",
    buyPrice: 8000,
    rentPrice: 400,
    heatReduction: 10,
    staminaBoost: 0,
    capacity: 8,
    features: ["loading_dock"],
  },
  {
    zoneSlug: "industrial",
    name: "Storage Warehouse B",
    type: "warehouse",
    buyPrice: 8000,
    rentPrice: 400,
    heatReduction: 10,
    staminaBoost: 0,
    capacity: 8,
    features: ["loading_dock"],
  },

  // Docks - safehouses for criminals
  {
    zoneSlug: "docks",
    name: "Harbor Safehouse",
    type: "safehouse",
    buyPrice: 10000,
    rentPrice: 500,
    heatReduction: 50,
    staminaBoost: 10,
    capacity: 6,
    features: ["hidden_entrance", "escape_route"],
  },
  {
    zoneSlug: "docks",
    name: "Shipping Container Hideout",
    type: "safehouse",
    buyPrice: 7500,
    rentPrice: 375,
    heatReduction: 45,
    staminaBoost: 5,
    capacity: 4,
    features: ["hidden_entrance"],
  },
  {
    zoneSlug: "docks",
    name: "Dockside Warehouse",
    type: "warehouse",
    buyPrice: 9000,
    rentPrice: 450,
    heatReduction: 15,
    staminaBoost: 0,
    capacity: 10,
    features: ["loading_dock", "boat_access"],
  },

  // Market - mixed
  {
    zoneSlug: "market",
    name: "Market Loft",
    type: "apartment",
    buyPrice: 3000,
    rentPrice: 150,
    heatReduction: 10,
    staminaBoost: 10,
    capacity: 2,
    features: ["market_access"],
  },
  {
    zoneSlug: "market",
    name: "Trader's House",
    type: "house",
    buyPrice: 5500,
    rentPrice: 275,
    heatReduction: 15,
    staminaBoost: 15,
    capacity: 4,
    features: ["basement_storage"],
  },
];

const BUSINESSES_DATA: BusinessData[] = [
  // Market businesses (main shopping district)
  {
    zoneSlug: "market",
    type: "pharmacy",
    name: "QuickMed Pharmacy",
    cashOnHand: 2000,
    inventory: [
      { itemSlug: "medkit", qty: 20, price: 65 },
      { itemSlug: "bandage", qty: 50, price: 20 },
      { itemSlug: "painkillers", qty: 30, price: 32 },
    ],
  },
  {
    zoneSlug: "market",
    type: "grocery",
    name: "Fresh Mart",
    cashOnHand: 1500,
    inventory: [
      { itemSlug: "burger", qty: 40, price: 10 },
      { itemSlug: "coffee", qty: 60, price: 7 },
      { itemSlug: "energy_drink", qty: 25, price: 13 },
    ],
  },
  {
    zoneSlug: "market",
    type: "pawnshop",
    name: "Lucky Pawn",
    cashOnHand: 5000,
    inventory: [
      { itemSlug: "watch", qty: 5, price: 600 },
      { itemSlug: "jewelry", qty: 8, price: 420 },
      { itemSlug: "crowbar", qty: 10, price: 50 },
      { itemSlug: "flashlight", qty: 15, price: 25 },
    ],
  },

  // Downtown businesses
  {
    zoneSlug: "downtown",
    type: "jewelry_store",
    name: "Diamond Dreams",
    cashOnHand: 10000,
    inventory: [
      { itemSlug: "watch", qty: 10, price: 650 },
      { itemSlug: "jewelry", qty: 15, price: 450 },
      { itemSlug: "designer_bag", qty: 8, price: 520 },
    ],
  },
  {
    zoneSlug: "downtown",
    type: "cafe",
    name: "Executive Coffee",
    cashOnHand: 800,
    inventory: [
      { itemSlug: "coffee", qty: 100, price: 8 },
      { itemSlug: "energy_drink", qty: 30, price: 15 },
    ],
  },

  // Docks businesses (shadier options)
  {
    zoneSlug: "docks",
    type: "warehouse",
    name: "Harbor Storage",
    cashOnHand: 3000,
    inventory: [
      { itemSlug: "crowbar", qty: 20, price: 45 },
      { itemSlug: "flashlight", qty: 25, price: 22 },
      { itemSlug: "baseball_bat", qty: 15, price: 35 },
    ],
  },
  {
    zoneSlug: "docks",
    type: "fence",
    name: "Midnight Imports",
    cashOnHand: 8000,
    inventory: [
      { itemSlug: "stolen_goods", qty: 10, price: 120 },
      { itemSlug: "lockpick", qty: 8, price: 90 },
      { itemSlug: "drugs", qty: 5, price: 180 },
      { itemSlug: "counterfeit", qty: 12, price: 80 },
    ],
  },

  // Industrial businesses
  {
    zoneSlug: "industrial",
    type: "hardware",
    name: "Industrial Supply Co",
    cashOnHand: 2500,
    inventory: [
      { itemSlug: "crowbar", qty: 30, price: 42 },
      { itemSlug: "flashlight", qty: 40, price: 23 },
      { itemSlug: "baseball_bat", qty: 20, price: 32 },
    ],
  },

  // Residential businesses
  {
    zoneSlug: "residential",
    type: "convenience",
    name: "Corner Store",
    cashOnHand: 800,
    inventory: [
      { itemSlug: "burger", qty: 30, price: 10 },
      { itemSlug: "coffee", qty: 40, price: 6 },
      { itemSlug: "bandage", qty: 15, price: 18 },
      { itemSlug: "energy_drink", qty: 20, price: 12 },
    ],
  },

  // Hospital pharmacy
  {
    zoneSlug: "hospital",
    type: "hospital_pharmacy",
    name: "Hospital Pharmacy",
    cashOnHand: 5000,
    inventory: [
      { itemSlug: "medkit", qty: 50, price: 55 },
      { itemSlug: "bandage", qty: 100, price: 18 },
      { itemSlug: "painkillers", qty: 60, price: 28 },
    ],
  },
];

// ============================================================================
// SEED MUTATIONS
// ============================================================================

/**
 * Seed all zones into the database
 */
export const seedZones = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if zones already exist
    const existingZones = await ctx.db.query("zones").collect();
    if (existingZones.length > 0) {
      console.log("Zones already seeded, skipping...");
      return { seeded: false, count: existingZones.length };
    }

    const zoneIds: Record<string, Id<"zones">> = {};

    for (const zone of ZONES_DATA) {
      const id = await ctx.db.insert("zones", zone);
      zoneIds[zone.slug] = id;
    }

    console.log(`Seeded ${ZONES_DATA.length} zones`);
    return { seeded: true, count: ZONES_DATA.length, zoneIds };
  },
});

/**
 * Seed zone edges (travel connections between zones)
 */
export const seedZoneEdges = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if edges already exist
    const existingEdges = await ctx.db.query("zoneEdges").collect();
    if (existingEdges.length > 0) {
      console.log("Zone edges already seeded, skipping...");
      return { seeded: false, count: existingEdges.length };
    }

    // Get all zones to build slug -> ID mapping
    const zones = await ctx.db.query("zones").collect();
    const zoneIdBySlug: Record<string, Id<"zones">> = {};
    for (const zone of zones) {
      zoneIdBySlug[zone.slug] = zone._id;
    }

    let count = 0;
    for (const [fromSlug, toSlug, timeCostTicks, cashCost, heatRisk] of ZONE_EDGES_DATA) {
      const fromZoneId = zoneIdBySlug[fromSlug];
      const toZoneId = zoneIdBySlug[toSlug];

      if (!fromZoneId || !toZoneId) {
        console.warn(`Skipping edge ${fromSlug} -> ${toSlug}: zone not found`);
        continue;
      }

      await ctx.db.insert("zoneEdges", {
        fromZoneId,
        toZoneId,
        timeCostTicks,
        cashCost,
        heatRisk,
      });
      count++;
    }

    console.log(`Seeded ${count} zone edges`);
    return { seeded: true, count };
  },
});

/**
 * Seed all items into the database
 */
export const seedItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if items already exist
    const existingItems = await ctx.db.query("items").collect();
    if (existingItems.length > 0) {
      console.log("Items already seeded, skipping...");
      return { seeded: false, count: existingItems.length };
    }

    for (const item of ITEMS_DATA) {
      await ctx.db.insert("items", item);
    }

    console.log(`Seeded ${ITEMS_DATA.length} items`);
    return { seeded: true, count: ITEMS_DATA.length };
  },
});

/**
 * Seed initial jobs into the database
 */
export const seedJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if jobs already exist
    const existingJobs = await ctx.db.query("jobs").collect();
    if (existingJobs.length > 0) {
      console.log("Jobs already seeded, skipping...");
      return { seeded: false, count: existingJobs.length };
    }

    // Get all zones to build slug -> ID mapping
    const zones = await ctx.db.query("zones").collect();
    const zoneIdBySlug: Record<string, Id<"zones">> = {};
    for (const zone of zones) {
      zoneIdBySlug[zone.slug] = zone._id;
    }

    let count = 0;
    for (const job of JOBS_DATA) {
      const zoneId = zoneIdBySlug[job.zoneSlug];
      if (!zoneId) {
        console.warn(`Skipping job "${job.title}": zone ${job.zoneSlug} not found`);
        continue;
      }

      await ctx.db.insert("jobs", {
        zoneId,
        type: job.type,
        title: job.title,
        wage: job.wage,
        durationTicks: job.durationTicks,
        requirements: job.requirements,
        staminaCost: job.staminaCost,
        active: true,
      });
      count++;
    }

    console.log(`Seeded ${count} jobs`);
    return { seeded: true, count };
  },
});

/**
 * Seed properties into the database
 */
export const seedProperties = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if properties already exist
    const existingProperties = await ctx.db.query("properties").collect();
    if (existingProperties.length > 0) {
      console.log("Properties already seeded, skipping...");
      return { seeded: false, count: existingProperties.length };
    }

    // Get all zones to build slug -> ID mapping
    const zones = await ctx.db.query("zones").collect();
    const zoneIdBySlug: Record<string, Id<"zones">> = {};
    for (const zone of zones) {
      zoneIdBySlug[zone.slug] = zone._id;
    }

    let count = 0;
    for (const property of PROPERTIES_DATA) {
      const zoneId = zoneIdBySlug[property.zoneSlug];
      if (!zoneId) {
        console.warn(`Skipping property "${property.name}": zone ${property.zoneSlug} not found`);
        continue;
      }

      await ctx.db.insert("properties", {
        zoneId,
        name: property.name,
        type: property.type,
        buyPrice: property.buyPrice,
        rentPrice: property.rentPrice,
        heatReduction: property.heatReduction,
        staminaBoost: property.staminaBoost,
        capacity: property.capacity,
        features: property.features,
      });
      count++;
    }

    console.log(`Seeded ${count} properties`);
    return { seeded: true, count };
  },
});

/**
 * Seed NPC businesses into the database
 */
export const seedBusinesses = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if businesses already exist
    const existingBusinesses = await ctx.db.query("businesses").collect();
    if (existingBusinesses.length > 0) {
      console.log("Businesses already seeded, skipping...");
      return { seeded: false, count: existingBusinesses.length };
    }

    // Get all zones to build slug -> ID mapping
    const zones = await ctx.db.query("zones").collect();
    const zoneIdBySlug: Record<string, Id<"zones">> = {};
    for (const zone of zones) {
      zoneIdBySlug[zone.slug] = zone._id;
    }

    // Get all items to build slug -> ID mapping
    const items = await ctx.db.query("items").collect();
    const itemIdBySlug: Record<string, Id<"items">> = {};
    for (const item of items) {
      itemIdBySlug[item.slug] = item._id;
    }

    let count = 0;
    for (const business of BUSINESSES_DATA) {
      const zoneId = zoneIdBySlug[business.zoneSlug];
      if (!zoneId) {
        console.warn(`Skipping business "${business.name}": zone ${business.zoneSlug} not found`);
        continue;
      }

      // Convert inventory item slugs to IDs
      const inventory: { itemId: Id<"items">; qty: number; price: number }[] = [];
      for (const inv of business.inventory) {
        const itemId = itemIdBySlug[inv.itemSlug];
        if (!itemId) {
          console.warn(`Skipping inventory item "${inv.itemSlug}" for business "${business.name}": item not found`);
          continue;
        }
        inventory.push({
          itemId,
          qty: inv.qty,
          price: inv.price,
        });
      }

      await ctx.db.insert("businesses", {
        ownerAgentId: null, // NPC-owned
        zoneId,
        type: business.type,
        name: business.name,
        cashOnHand: business.cashOnHand,
        inventory,
        reputation: 50, // Neutral starting reputation
        status: "open",
        metrics: {
          totalRevenue: 0,
          totalCustomers: 0,
        },
      });
      count++;
    }

    console.log(`Seeded ${count} businesses`);
    return { seeded: true, count };
  },
});

/**
 * Seed vehicles into the database
 */
export const seedVehicles = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if vehicles already exist
    const existingVehicles = await ctx.db.query("vehicles").collect();
    if (existingVehicles.length > 0) {
      console.log("Vehicles already seeded, skipping...");
      return { seeded: false, count: existingVehicles.length };
    }

    // Get all zones to build slug -> ID mapping
    const zones = await ctx.db.query("zones").collect();
    const zoneIdBySlug: Record<string, Id<"zones">> = {};
    for (const zone of zones) {
      zoneIdBySlug[zone.slug] = zone._id;
    }

    let count = 0;
    for (const vehicle of VEHICLES_DATA) {
      const zoneId = zoneIdBySlug[vehicle.zoneSlug];
      if (!zoneId) {
        console.warn(`Skipping vehicle "${vehicle.name}": zone ${vehicle.zoneSlug} not found`);
        continue;
      }

      await ctx.db.insert("vehicles", {
        type: vehicle.type,
        name: vehicle.name,
        zoneId,
        isStolen: false,
        condition: vehicle.condition,
        speedBonus: vehicle.speedBonus,
        value: vehicle.value,
      });
      count++;
    }

    console.log(`Seeded ${count} vehicles`);
    return { seeded: true, count };
  },
});

/**
 * Initialize the world singleton with default configuration
 */
export const seedWorld = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if world already exists
    const existingWorld = await ctx.db.query("world").first();
    if (existingWorld) {
      console.log("World already initialized, skipping...");
      return { seeded: false };
    }

    await ctx.db.insert("world", {
      tick: 0,
      tickMs: 60000, // 1 minute per tick
      status: "paused",
      seed: `clawcity-${Date.now()}`,
      lastTickAt: Date.now(),
      config: {
        startingCashMin: 50,
        startingCashMax: 1000,
        startingZone: "residential",
        heatDecayIdle: 1,
        heatDecayBusy: 0.2,
        arrestThreshold: 60,
        maxHeat: 100,
      },
    });

    console.log("World singleton initialized");
    return { seeded: true };
  },
});

/**
 * Seed everything at once - the main entry point for seeding
 * Call this mutation to set up the entire game world
 */
export const seedAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results: Record<string, unknown> = {};

    // Seed in order of dependencies
    // 1. World config (no dependencies)
    const existingWorld = await ctx.db.query("world").first();
    if (!existingWorld) {
      await ctx.db.insert("world", {
        tick: 0,
        tickMs: 60000,
        status: "paused",
        seed: `clawcity-${Date.now()}`,
        lastTickAt: Date.now(),
        config: {
          startingCashMin: 50,
          startingCashMax: 1000,
          startingZone: "residential",
          heatDecayIdle: 1,
          heatDecayBusy: 0.2,
          arrestThreshold: 60,
          maxHeat: 100,
        },
      });
      results.world = { seeded: true };
      console.log("World singleton initialized");
    } else {
      results.world = { seeded: false, reason: "already exists" };
    }

    // 2. Zones (no dependencies)
    const existingZones = await ctx.db.query("zones").collect();
    const zoneIdBySlug: Record<string, Id<"zones">> = {};
    if (existingZones.length === 0) {
      for (const zone of ZONES_DATA) {
        const id = await ctx.db.insert("zones", zone);
        zoneIdBySlug[zone.slug] = id;
      }
      results.zones = { seeded: true, count: ZONES_DATA.length };
      console.log(`Seeded ${ZONES_DATA.length} zones`);
    } else {
      for (const zone of existingZones) {
        zoneIdBySlug[zone.slug] = zone._id;
      }
      results.zones = { seeded: false, count: existingZones.length, reason: "already exists" };
    }

    // 3. Items (no dependencies)
    const existingItems = await ctx.db.query("items").collect();
    const itemIdBySlug: Record<string, Id<"items">> = {};
    if (existingItems.length === 0) {
      for (const item of ITEMS_DATA) {
        const id = await ctx.db.insert("items", item);
        itemIdBySlug[item.slug] = id;
      }
      results.items = { seeded: true, count: ITEMS_DATA.length };
      console.log(`Seeded ${ITEMS_DATA.length} items`);
    } else {
      for (const item of existingItems) {
        itemIdBySlug[item.slug] = item._id;
      }
      results.items = { seeded: false, count: existingItems.length, reason: "already exists" };
    }

    // 4. Zone edges (depends on zones)
    const existingEdges = await ctx.db.query("zoneEdges").collect();
    if (existingEdges.length === 0) {
      let edgeCount = 0;
      for (const [fromSlug, toSlug, timeCostTicks, cashCost, heatRisk] of ZONE_EDGES_DATA) {
        const fromZoneId = zoneIdBySlug[fromSlug];
        const toZoneId = zoneIdBySlug[toSlug];
        if (fromZoneId && toZoneId) {
          await ctx.db.insert("zoneEdges", {
            fromZoneId,
            toZoneId,
            timeCostTicks,
            cashCost,
            heatRisk,
          });
          edgeCount++;
        }
      }
      results.zoneEdges = { seeded: true, count: edgeCount };
      console.log(`Seeded ${edgeCount} zone edges`);
    } else {
      results.zoneEdges = { seeded: false, count: existingEdges.length, reason: "already exists" };
    }

    // 5. Jobs (depends on zones)
    const existingJobs = await ctx.db.query("jobs").collect();
    if (existingJobs.length === 0) {
      let jobCount = 0;
      for (const job of JOBS_DATA) {
        const zoneId = zoneIdBySlug[job.zoneSlug];
        if (zoneId) {
          await ctx.db.insert("jobs", {
            zoneId,
            type: job.type,
            title: job.title,
            wage: job.wage,
            durationTicks: job.durationTicks,
            requirements: job.requirements,
            staminaCost: job.staminaCost,
            active: true,
          });
          jobCount++;
        }
      }
      results.jobs = { seeded: true, count: jobCount };
      console.log(`Seeded ${jobCount} jobs`);
    } else {
      results.jobs = { seeded: false, count: existingJobs.length, reason: "already exists" };
    }

    // 6. Businesses (depends on zones and items)
    const existingBusinesses = await ctx.db.query("businesses").collect();
    if (existingBusinesses.length === 0) {
      let businessCount = 0;
      for (const business of BUSINESSES_DATA) {
        const zoneId = zoneIdBySlug[business.zoneSlug];
        if (!zoneId) continue;

        const inventory: { itemId: Id<"items">; qty: number; price: number }[] = [];
        for (const inv of business.inventory) {
          const itemId = itemIdBySlug[inv.itemSlug];
          if (itemId) {
            inventory.push({ itemId, qty: inv.qty, price: inv.price });
          }
        }

        await ctx.db.insert("businesses", {
          ownerAgentId: null,
          zoneId,
          type: business.type,
          name: business.name,
          cashOnHand: business.cashOnHand,
          inventory,
          reputation: 50,
          status: "open",
          metrics: {
            totalRevenue: 0,
            totalCustomers: 0,
          },
        });
        businessCount++;
      }
      results.businesses = { seeded: true, count: businessCount };
      console.log(`Seeded ${businessCount} businesses`);
    } else {
      results.businesses = { seeded: false, count: existingBusinesses.length, reason: "already exists" };
    }

    // 7. Properties (depends on zones)
    const existingProperties = await ctx.db.query("properties").collect();
    if (existingProperties.length === 0) {
      let propertyCount = 0;
      for (const property of PROPERTIES_DATA) {
        const zoneId = zoneIdBySlug[property.zoneSlug];
        if (!zoneId) continue;

        await ctx.db.insert("properties", {
          zoneId,
          name: property.name,
          type: property.type,
          buyPrice: property.buyPrice,
          rentPrice: property.rentPrice,
          heatReduction: property.heatReduction,
          staminaBoost: property.staminaBoost,
          capacity: property.capacity,
          features: property.features,
        });
        propertyCount++;
      }
      results.properties = { seeded: true, count: propertyCount };
      console.log(`Seeded ${propertyCount} properties`);
    } else {
      results.properties = { seeded: false, count: existingProperties.length, reason: "already exists" };
    }

    // 8. Vehicles (depends on zones)
    const existingVehicles = await ctx.db.query("vehicles").collect();
    if (existingVehicles.length === 0) {
      let vehicleCount = 0;
      for (const vehicle of VEHICLES_DATA) {
        const zoneId = zoneIdBySlug[vehicle.zoneSlug];
        if (!zoneId) continue;

        await ctx.db.insert("vehicles", {
          type: vehicle.type,
          name: vehicle.name,
          zoneId,
          isStolen: false,
          condition: vehicle.condition,
          speedBonus: vehicle.speedBonus,
          value: vehicle.value,
        });
        vehicleCount++;
      }
      results.vehicles = { seeded: true, count: vehicleCount };
      console.log(`Seeded ${vehicleCount} vehicles`);
    } else {
      results.vehicles = { seeded: false, count: existingVehicles.length, reason: "already exists" };
    }

    // 9. Government (for tax tracking)
    const existingGovernment = await ctx.db.query("government").first();
    if (!existingGovernment) {
      await ctx.db.insert("government", {
        totalTaxRevenue: 0,
        totalSeizedCash: 0,
        totalSeizedItems: 0,
      });
      results.government = { seeded: true };
      console.log("Government initialized");
    } else {
      results.government = { seeded: false, reason: "already exists" };
    }

    console.log("Seed complete!", results);
    return results;
  },
});

/**
 * Clear all seed data - useful for resetting the database
 * WARNING: This will delete all game data!
 */
export const clearAllSeedData = internalMutation({
  args: {
    confirm: v.literal("DELETE_ALL_DATA"),
  },
  handler: async (ctx, args) => {
    if (args.confirm !== "DELETE_ALL_DATA") {
      throw new Error("Must confirm deletion by passing 'DELETE_ALL_DATA'");
    }

    // Delete in reverse order of dependencies
    const businesses = await ctx.db.query("businesses").collect();
    for (const b of businesses) {
      await ctx.db.delete(b._id);
    }

    const jobs = await ctx.db.query("jobs").collect();
    for (const j of jobs) {
      await ctx.db.delete(j._id);
    }

    const vehicles = await ctx.db.query("vehicles").collect();
    for (const vehicle of vehicles) {
      await ctx.db.delete(vehicle._id);
    }

    const zoneEdges = await ctx.db.query("zoneEdges").collect();
    for (const e of zoneEdges) {
      await ctx.db.delete(e._id);
    }

    const items = await ctx.db.query("items").collect();
    for (const i of items) {
      await ctx.db.delete(i._id);
    }

    const zones = await ctx.db.query("zones").collect();
    for (const z of zones) {
      await ctx.db.delete(z._id);
    }

    const world = await ctx.db.query("world").first();
    if (world) {
      await ctx.db.delete(world._id);
    }

    console.log("All seed data cleared");
    return {
      deleted: {
        businesses: businesses.length,
        vehicles: vehicles.length,
        jobs: jobs.length,
        zoneEdges: zoneEdges.length,
        items: items.length,
        zones: zones.length,
        world: world ? 1 : 0,
      },
    };
  },
});

// ============================================================================
// PUBLIC SEED MUTATION (for easy initialization)
// ============================================================================

/**
 * Public mutation to seed the database
 * This is a convenience wrapper around seedAll for easy initialization
 */
export const initializeWorld = mutation({
  args: {},
  handler: async (ctx) => {
    const results: Record<string, unknown> = {};

    // Seed in order of dependencies
    // 1. World config (no dependencies)
    const existingWorld = await ctx.db.query("world").first();
    if (!existingWorld) {
      await ctx.db.insert("world", {
        tick: 0,
        tickMs: 60000,
        status: "paused",
        seed: `clawcity-${Date.now()}`,
        lastTickAt: Date.now(),
        config: {
          startingCashMin: 50,
          startingCashMax: 1000,
          startingZone: "residential",
          heatDecayIdle: 1,
          heatDecayBusy: 0.2,
          arrestThreshold: 60,
          maxHeat: 100,
        },
      });
      results.world = { seeded: true };
    } else {
      results.world = { seeded: false, reason: "already exists" };
    }

    // 2. Zones (no dependencies)
    const existingZones = await ctx.db.query("zones").collect();
    const zoneIdBySlug: Record<string, Id<"zones">> = {};
    if (existingZones.length === 0) {
      for (const zone of ZONES_DATA) {
        const id = await ctx.db.insert("zones", zone);
        zoneIdBySlug[zone.slug] = id;
      }
      results.zones = { seeded: true, count: ZONES_DATA.length };
    } else {
      for (const zone of existingZones) {
        zoneIdBySlug[zone.slug] = zone._id;
      }
      results.zones = { seeded: false, count: existingZones.length };
    }

    // 3. Items (no dependencies)
    const existingItems = await ctx.db.query("items").collect();
    const itemIdBySlug: Record<string, Id<"items">> = {};
    if (existingItems.length === 0) {
      for (const item of ITEMS_DATA) {
        const id = await ctx.db.insert("items", item);
        itemIdBySlug[item.slug] = id;
      }
      results.items = { seeded: true, count: ITEMS_DATA.length };
    } else {
      for (const item of existingItems) {
        itemIdBySlug[item.slug] = item._id;
      }
      results.items = { seeded: false, count: existingItems.length };
    }

    // 4. Zone edges (depends on zones)
    const existingEdges = await ctx.db.query("zoneEdges").collect();
    if (existingEdges.length === 0) {
      let edgeCount = 0;
      for (const [fromSlug, toSlug, timeCostTicks, cashCost, heatRisk] of ZONE_EDGES_DATA) {
        const fromZoneId = zoneIdBySlug[fromSlug];
        const toZoneId = zoneIdBySlug[toSlug];
        if (fromZoneId && toZoneId) {
          await ctx.db.insert("zoneEdges", {
            fromZoneId,
            toZoneId,
            timeCostTicks,
            cashCost,
            heatRisk,
          });
          edgeCount++;
        }
      }
      results.zoneEdges = { seeded: true, count: edgeCount };
    } else {
      results.zoneEdges = { seeded: false, count: existingEdges.length };
    }

    // 5. Jobs (depends on zones)
    const existingJobs = await ctx.db.query("jobs").collect();
    if (existingJobs.length === 0) {
      let jobCount = 0;
      for (const job of JOBS_DATA) {
        const zoneId = zoneIdBySlug[job.zoneSlug];
        if (zoneId) {
          await ctx.db.insert("jobs", {
            zoneId,
            type: job.type,
            title: job.title,
            wage: job.wage,
            durationTicks: job.durationTicks,
            requirements: job.requirements,
            staminaCost: job.staminaCost,
            active: true,
          });
          jobCount++;
        }
      }
      results.jobs = { seeded: true, count: jobCount };
    } else {
      results.jobs = { seeded: false, count: existingJobs.length };
    }

    // 6. Businesses (depends on zones and items)
    const existingBusinesses = await ctx.db.query("businesses").collect();
    if (existingBusinesses.length === 0) {
      let businessCount = 0;
      for (const business of BUSINESSES_DATA) {
        const zoneId = zoneIdBySlug[business.zoneSlug];
        if (!zoneId) continue;

        const inventory: { itemId: Id<"items">; qty: number; price: number }[] = [];
        for (const inv of business.inventory) {
          const itemId = itemIdBySlug[inv.itemSlug];
          if (itemId) {
            inventory.push({ itemId, qty: inv.qty, price: inv.price });
          }
        }

        await ctx.db.insert("businesses", {
          ownerAgentId: null,
          zoneId,
          type: business.type,
          name: business.name,
          cashOnHand: business.cashOnHand,
          inventory,
          reputation: 50,
          status: "open",
          metrics: {
            totalRevenue: 0,
            totalCustomers: 0,
          },
        });
        businessCount++;
      }
      results.businesses = { seeded: true, count: businessCount };
    } else {
      results.businesses = { seeded: false, count: existingBusinesses.length };
    }

    // 7. Properties (depends on zones)
    const existingProperties = await ctx.db.query("properties").collect();
    if (existingProperties.length === 0) {
      let propertyCount = 0;
      for (const property of PROPERTIES_DATA) {
        const zoneId = zoneIdBySlug[property.zoneSlug];
        if (!zoneId) continue;

        await ctx.db.insert("properties", {
          zoneId,
          name: property.name,
          type: property.type,
          buyPrice: property.buyPrice,
          rentPrice: property.rentPrice,
          heatReduction: property.heatReduction,
          staminaBoost: property.staminaBoost,
          capacity: property.capacity,
          features: property.features,
        });
        propertyCount++;
      }
      results.properties = { seeded: true, count: propertyCount };
    } else {
      results.properties = { seeded: false, count: existingProperties.length };
    }

    // 8. Vehicles (depends on zones)
    const existingVehicles = await ctx.db.query("vehicles").collect();
    if (existingVehicles.length === 0) {
      let vehicleCount = 0;
      for (const vehicle of VEHICLES_DATA) {
        const zoneId = zoneIdBySlug[vehicle.zoneSlug];
        if (!zoneId) continue;

        await ctx.db.insert("vehicles", {
          type: vehicle.type,
          name: vehicle.name,
          zoneId,
          isStolen: false,
          condition: vehicle.condition,
          speedBonus: vehicle.speedBonus,
          value: vehicle.value,
        });
        vehicleCount++;
      }
      results.vehicles = { seeded: true, count: vehicleCount };
    } else {
      results.vehicles = { seeded: false, count: existingVehicles.length };
    }

    // 9. Government (for tax tracking)
    const existingGovernment = await ctx.db.query("government").first();
    if (!existingGovernment) {
      await ctx.db.insert("government", {
        totalTaxRevenue: 0,
        totalSeizedCash: 0,
        totalSeizedItems: 0,
      });
      results.government = { seeded: true };
    } else {
      results.government = { seeded: false, reason: "already exists" };
    }

    return results;
  },
});

/**
 * Migration to add mapCoords to existing zones
 * Run this once if zones already exist without mapCoords
 */
export const migrateZoneMapCoords = mutation({
  args: {},
  handler: async (ctx) => {
    const zones = await ctx.db.query("zones").collect();

    // Build lookup from seed data
    const coordsBySlug: Record<string, { center: { lng: number; lat: number }; radius: number }> = {};
    for (const zone of ZONES_DATA) {
      if (zone.mapCoords) {
        coordsBySlug[zone.slug] = zone.mapCoords;
      }
    }

    let updated = 0;
    for (const zone of zones) {
      const coords = coordsBySlug[zone.slug];
      if (coords && !zone.mapCoords) {
        await ctx.db.patch(zone._id, { mapCoords: coords });
        updated++;
      }
    }

    return { updated, total: zones.length };
  },
});
