/**
 * Seed — CDC §8 S1: "3 agences vérifiées, 8 voyages variés".
 *
 * Ports the fixtures the front end was built against (src/lib/mock-data.ts) so
 * the UI renders identically once it reads from Postgres instead of the mock
 * arrays. Keeping the same slugs matters: they're the Lien Magique URLs, and
 * any link already shared in testing keeps working.
 *
 * Idempotent — upserts on natural keys, so re-running never duplicates rows.
 *
 *   npx prisma db seed
 */

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, type TripStatus, type TripType } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Dev-only password for every seeded account. Never used in production. */
const DEV_PASSWORD = "Password123";

const day = 86_400_000;
const inDays = (n: number) => new Date(Date.now() + n * day);

interface SeedAgency {
  slug: string;
  name: string;
  description: string;
  managerName: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  city: string;
  zones: string[];
  tripTypes: TripType[];
  status: "VERIFIED" | "UNDER_REVIEW" | "PENDING";
}

const AGENCIES: SeedAgency[] = [
  {
    slug: "atlas-nomad-voyages",
    name: "Atlas Nomad Voyages",
    description:
      "Agence spécialisée dans les treks et les bivouacs au Maroc, guidée par des accompagnateurs berbères originaires des vallées du Haut Atlas.",
    managerName: "Yassine Ait Ali",
    contactEmail: "contact@atlasnomad.ma",
    contactPhone: "+212 6 61 22 33 44",
    country: "Maroc",
    city: "Marrakech",
    zones: ["Maroc"],
    tripTypes: ["TREKKING", "DESERT", "CITY_BREAK"],
    status: "VERIFIED",
  },
  {
    slug: "carthage-heritage-tours",
    name: "Carthage Heritage Tours",
    description:
      "Circuits culturels et patrimoniaux en Tunisie, menés par des guides conférenciers diplômés en histoire antique.",
    managerName: "Sonia Ben Amor",
    contactEmail: "hello@carthageheritage.tn",
    contactPhone: "+216 71 22 33 44",
    country: "Tunisie",
    city: "Tunis",
    zones: ["Tunisie"],
    tripTypes: ["CULTURAL", "BEACH"],
    status: "VERIFIED",
  },
  {
    slug: "essaouira-blue-escapes",
    name: "Essaouira Blue Escapes",
    description:
      "Séjours détente, surf et gastronomie sur la côte atlantique marocaine, en petits groupes de douze personnes maximum.",
    managerName: "Karim Belhaj",
    contactEmail: "team@essaouirablue.ma",
    contactPhone: "+212 6 70 88 99 00",
    country: "Maroc",
    city: "Essaouira",
    zones: ["Maroc"],
    tripTypes: ["BEACH", "GASTRONOMY"],
    status: "VERIFIED",
  },
  {
    // Deliberately left pending so the admin validation queue (§K.2) has
    // something to act on straight after seeding.
    slug: "sahara-stars-camp",
    name: "Sahara Stars Camp",
    description:
      "Campements d’exception dans l’erg Chebbi, avec observation astronomique guidée et cuisine nomade traditionnelle.",
    managerName: "Omar Lahlou",
    contactEmail: "info@saharastarscamp.ma",
    contactPhone: "+212 6 55 44 33 22",
    country: "Maroc",
    city: "Merzouga",
    zones: ["Maroc"],
    tripTypes: ["DESERT"],
    status: "UNDER_REVIEW",
  },
];

interface SeedTrip {
  agencySlug: string;
  slug: string;
  title: string;
  destination: string;
  tripType: TripType;
  status: TripStatus;
  startInDays: number;
  durationDays: number;
  totalPrice: number;
  depositAmount: number;
  totalSpots: number;
  bookedSpots: number;
  meetingPoint: string;
  description: string;
  inclusions: string[];
  exclusions: string[];
  coverImage: string;
}

const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&h=800&q=80&fit=crop`;

const TRIPS: SeedTrip[] = [
  {
    agencySlug: "atlas-nomad-voyages",
    slug: "trek-atlas-toubkal-4j",
    title: "Trek Atlas & Sommet du Toubkal",
    destination: "Imlil, Haut Atlas",
    tripType: "TREKKING",
    status: "PUBLISHED",
    startInDays: 40,
    durationDays: 4,
    totalPrice: 480,
    depositAmount: 90,
    totalSpots: 12,
    bookedSpots: 8,
    meetingPoint: "Place Jemaa el-Fna, Marrakech",
    description:
      "Quatre jours d’ascension au cœur du Haut Atlas marocain, du village d’Imlil jusqu’au sommet du Toubkal, point culminant de l’Afrique du Nord à 4 167 mètres. Les nuits se passent en refuge et chez l’habitant, avec une cuisine berbère préparée sur place. L’itinéraire est progressif : deux journées d’acclimatation avant l’ascension finale, encadrées par des guides de montagne originaires de la vallée.",
    inclusions: ["Guide de montagne", "Hébergement en refuge", "Pension complète", "Transferts depuis Marrakech"],
    exclusions: ["Vols internationaux", "Assurance voyage", "Équipement personnel"],
    coverImage: IMG("1489493887464-892be6d1daae"),
  },
  {
    agencySlug: "atlas-nomad-voyages",
    slug: "bivouac-sahara-merzouga-3j",
    title: "Bivouac Sahara sous les Étoiles",
    destination: "Merzouga, Erg Chebbi",
    tripType: "DESERT",
    status: "FULL",
    startInDays: 57,
    durationDays: 3,
    totalPrice: 320,
    depositAmount: 60,
    totalSpots: 16,
    bookedSpots: 16,
    meetingPoint: "Gare routière de Merzouga",
    description:
      "Trois jours dans les dunes de l’erg Chebbi, entre méharée au coucher du soleil et nuits sous tente nomade. Le campement est installé à l’écart des circuits classiques, dans un cordon dunaire préservé. Les soirées se passent autour du feu, avec musique gnaoua et observation du ciel saharien, réputé parmi les plus purs au monde.",
    inclusions: ["Méharée guidée", "Bivouac équipé", "Pension complète", "Observation astronomique"],
    exclusions: ["Vols internationaux", "Boissons", "Pourboires"],
    coverImage: IMG("1509316785289-025f5b846b35"),
  },
  {
    agencySlug: "atlas-nomad-voyages",
    slug: "chefchaouen-photo-weekend",
    title: "Week-end Photo à Chefchaouen",
    destination: "Chefchaouen, Rif",
    tripType: "CITY_BREAK",
    status: "PUBLISHED",
    startInDays: 51,
    durationDays: 3,
    totalPrice: 260,
    depositAmount: 50,
    totalSpots: 10,
    bookedSpots: 3,
    meetingPoint: "Place Outa el-Hammam, Chefchaouen",
    description:
      "Trois jours de photographie dans la ville bleue du Rif, accompagnés par un photographe professionnel. Les sorties sont calées sur les heures dorées du matin et du soir, quand la lumière révèle les nuances des façades. Le programme alterne ruelles de la médina, points de vue sur la vallée et rencontres avec les artisans locaux.",
    inclusions: ["Accompagnement photo", "Riad en centre-ville", "Petits-déjeuners"],
    exclusions: ["Transport jusqu’à Chefchaouen", "Déjeuners et dîners", "Matériel photo"],
    coverImage: IMG("1553603227-2358aabe821e"),
  },
  {
    agencySlug: "essaouira-blue-escapes",
    slug: "surf-taghazout-6j",
    title: "Surf Camp Taghazout",
    destination: "Taghazout, Agadir",
    tripType: "BEACH",
    status: "PUBLISHED",
    startInDays: 46,
    durationDays: 6,
    totalPrice: 590,
    depositAmount: 100,
    totalSpots: 14,
    bookedSpots: 5,
    meetingPoint: "Aéroport Agadir Al Massira",
    description:
      "Une semaine de surf sur les spots de Taghazout, adaptée à tous les niveaux, du premier take-off aux vagues plus engagées d’Anchor Point. Deux sessions quotidiennes encadrées par des moniteurs brevetés, avec analyse vidéo en fin de journée. L’hébergement se fait dans une maison de surf face à l’océan, en chambres partagées ou individuelles.",
    inclusions: ["Cours de surf quotidiens", "Planche et combinaison", "Hébergement", "Petits-déjeuners et dîners"],
    exclusions: ["Vols", "Déjeuners", "Assurance"],
    coverImage: IMG("1502680390469-be75c86b636f"),
  },
  {
    agencySlug: "essaouira-blue-escapes",
    slug: "essaouira-riad-detente-4j",
    title: "Escale Détente à Essaouira",
    destination: "Essaouira",
    tripType: "BEACH",
    status: "PUBLISHED",
    startInDays: 62,
    durationDays: 4,
    totalPrice: 340,
    depositAmount: 60,
    totalSpots: 10,
    bookedSpots: 2,
    meetingPoint: "Bab Sbaa, Essaouira",
    description:
      "Quatre jours de repos dans l’ancienne Mogador, entre remparts portugais, port de pêche et longue plage balayée par les alizés. Le rythme est volontairement lent : hammam traditionnel, balades dans la médina classée, et découverte de la cuisine de poisson locale. L’hébergement se fait dans un riad du quartier des Chbanate.",
    inclusions: ["Riad en chambre double", "Petits-déjeuners", "Hammam et gommage", "Visite guidée de la médina"],
    exclusions: ["Transport", "Repas non mentionnés"],
    coverImage: IMG("1519046904884-53103b34b206"),
  },
  {
    agencySlug: "carthage-heritage-tours",
    slug: "carthage-tunis-patrimoine-5j",
    title: "Tunis & Carthage, Sur les Traces de l’Histoire",
    destination: "Tunis, Carthage, Sidi Bou Saïd",
    tripType: "CULTURAL",
    status: "FULL",
    startInDays: 44,
    durationDays: 5,
    totalPrice: 420,
    depositAmount: 80,
    totalSpots: 20,
    bookedSpots: 20,
    meetingPoint: "Aéroport Tunis-Carthage",
    description:
      "Cinq jours entre la médina de Tunis classée à l’UNESCO, le site archéologique de Carthage et les ruelles blanches et bleues de Sidi Bou Saïd. Les visites sont menées par un guide conférencier spécialiste de l’Antiquité punique et romaine. Le programme inclut le musée du Bardo et ses mosaïques, parmi les plus riches collections au monde.",
    inclusions: ["Guide conférencier", "Hôtel 4*", "Petits-déjeuners", "Entrées aux sites", "Transferts"],
    exclusions: ["Vols internationaux", "Déjeuners et dîners", "Pourboires"],
    coverImage: IMG("1591604129939-f1efa4d9f7fa"),
  },
  {
    agencySlug: "carthage-heritage-tours",
    slug: "djerba-farniente-7j",
    title: "Djerba, Semaine Farniente",
    destination: "Djerba",
    tripType: "BEACH",
    status: "PUBLISHED",
    startInDays: 70,
    durationDays: 7,
    totalPrice: 610,
    depositAmount: 110,
    totalSpots: 18,
    bookedSpots: 11,
    meetingPoint: "Aéroport Djerba-Zarzis",
    description:
      "Une semaine sur l’île des Lotophages, entre plages de sable fin, marchés de Houmt Souk et villages de potiers de Guellala. Le séjour laisse une large place au temps libre, avec deux excursions incluses : la synagogue de la Ghriba et une sortie en mer vers l’îlot aux flamants roses.",
    inclusions: ["Hôtel en bord de mer", "Demi-pension", "Deux excursions guidées", "Transferts aéroport"],
    exclusions: ["Vols", "Déjeuners", "Activités nautiques"],
    coverImage: IMG("1560347876-aeef00ee58a1"),
  },
  {
    agencySlug: "essaouira-blue-escapes",
    slug: "fes-gastronomie-4j",
    title: "Fès, Voyage Gastronomique",
    destination: "Fès",
    tripType: "GASTRONOMY",
    // Left as a draft so the agency dashboard has an unpublished trip to
    // demonstrate the DRAFT → PUBLISHED transition (§J.4).
    status: "DRAFT",
    startInDays: 80,
    durationDays: 4,
    totalPrice: 390,
    depositAmount: 70,
    totalSpots: 12,
    bookedSpots: 0,
    meetingPoint: "Bab Boujloud, Fès",
    description:
      "Quatre jours de cuisine marocaine dans la plus ancienne médina du monde. Le programme alterne ateliers pratiques chez une dada fassie, visites des souks aux épices et dégustations dans des maisons d’hôtes traditionnelles. Chaque participant repart avec un carnet de recettes constitué au fil du séjour.",
    inclusions: ["Ateliers de cuisine", "Riad dans la médina", "Repas dégustation", "Guide culinaire"],
    exclusions: ["Vols", "Transport jusqu’à Fès"],
    coverImage: IMG("1548013146-72479768bada"),
  },
];

async function main() {
  console.log("Seeding…");

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  // Admin (§K) — the platform account.
  const admin = await prisma.user.upsert({
    where: { email: "admin@maghrebvoyage.com" },
    update: { role: "ADMIN", passwordHash },
    create: {
      email: "admin@maghrebvoyage.com",
      name: "Administrateur",
      role: "ADMIN",
      passwordHash,
    },
  });
  console.log(`  admin: ${admin.email}`);

  const agencyIdBySlug = new Map<string, string>();

  for (const a of AGENCIES) {
    const user = await prisma.user.upsert({
      where: { email: a.contactEmail },
      update: { role: "AGENCY", passwordHash },
      create: { email: a.contactEmail, name: a.managerName, role: "AGENCY", passwordHash },
    });

    const agency = await prisma.agency.upsert({
      where: { slug: a.slug },
      update: {
        name: a.name,
        description: a.description,
        verificationStatus: a.status,
        verifiedAt: a.status === "VERIFIED" ? new Date() : null,
        verifiedByUserId: a.status === "VERIFIED" ? admin.id : null,
      },
      create: {
        slug: a.slug,
        name: a.name,
        description: a.description,
        managerName: a.managerName,
        contactEmail: a.contactEmail,
        contactPhone: a.contactPhone,
        country: a.country,
        city: a.city,
        zones: a.zones,
        tripTypes: a.tripTypes,
        verificationStatus: a.status,
        verifiedAt: a.status === "VERIFIED" ? new Date() : null,
        verifiedByUserId: a.status === "VERIFIED" ? admin.id : null,
        verificationDocUrl: "https://example.com/registre-commerce.pdf",
        userId: user.id,
      },
    });

    agencyIdBySlug.set(a.slug, agency.id);
    console.log(`  agency: ${agency.name} (${a.status})`);
  }

  for (const t of TRIPS) {
    const agencyId = agencyIdBySlug.get(t.agencySlug);
    if (!agencyId) throw new Error(`Unknown agency slug: ${t.agencySlug}`);

    const startDate = inDays(t.startInDays);
    const endDate = inDays(t.startInDays + t.durationDays);

    const data = {
      agencyId,
      title: t.title,
      destination: t.destination,
      description: t.description,
      tripType: t.tripType,
      startDate,
      endDate,
      durationDays: t.durationDays,
      totalPrice: t.totalPrice.toFixed(2),
      depositAmount: t.depositAmount.toFixed(2),
      totalSpots: t.totalSpots,
      bookedSpots: t.bookedSpots,
      status: t.status,
      meetingPoint: t.meetingPoint,
      inclusions: t.inclusions,
      exclusions: t.exclusions,
      coverImage: t.coverImage,
      images: [t.coverImage],
      guideLanguages: ["Français", "Anglais", "Arabe"],
      aiTags: [
        t.tripType.toLowerCase(),
        ...t.destination.toLowerCase().split(/[,\s]+/).filter((w) => w.length > 2),
      ].slice(0, 10),
    };

    const trip = await prisma.groupTrip.upsert({
      where: { slug: t.slug },
      update: data,
      create: { ...data, slug: t.slug },
    });

    console.log(
      `  trip: ${trip.slug.padEnd(30)} ${t.status.padEnd(10)} ${t.bookedSpots}/${t.totalSpots}`
    );
  }

  // One confirmed booking on the Toubkal trek, so the agency dashboard, the
  // cancellation flow and the admin views all have real data on first run.
  const toubkal = await prisma.groupTrip.findUnique({ where: { slug: "trek-atlas-toubkal-4j" } });
  if (toubkal) {
    await prisma.booking.upsert({
      where: { cancellationToken: "3f6b2e1a-7c9d-4e2f-9a1b-5d8c2f4e6a7b" },
      update: {},
      create: {
        groupTripId: toubkal.id,
        agencyId: toubkal.agencyId,
        clientName: "Ahmed El Amrani",
        clientEmail: "ahmed@example.com",
        clientPhone: "+33 6 12 34 56 78",
        clientCountry: "France",
        numberOfSeats: 2,
        totalAmount: (Number(toubkal.totalPrice) * 2).toFixed(2),
        depositPaid: (Number(toubkal.depositAmount) * 2).toFixed(2),
        confirmationCode: "MV-100001",
        cancellationToken: "3f6b2e1a-7c9d-4e2f-9a1b-5d8c2f4e6a7b",
        status: "CONFIRMED",
      },
    });
    console.log("  booking: MV-100001 (confirmed, cancellable via seeded token)");
  }

  console.log("\nDone. Dev password for every seeded account: " + DEV_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
