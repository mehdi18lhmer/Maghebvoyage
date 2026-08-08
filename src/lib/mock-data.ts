import type { Agency, Booking, GroupTrip, Payment, TravelRequest } from "./types";

// Static fixtures for the UI-first pass — mirrors what prisma/seed.ts will
// eventually produce (3 verified agencies, 8 varied trips). No DB yet.

export const agencies: Agency[] = [
  {
    id: "ag_1",
    slug: "atlas-nomad-voyages",
    name: "Atlas Nomad Voyages",
    description:
      "Agence marocaine basée à Marrakech, spécialisée dans les treks de l'Atlas et les circuits désert depuis 2011.",
    logoUrl: "https://images.unsplash.com/photo-1539020140153-e479b8c3a5b7?w=200&h=200&fit=crop",
    managerName: "Yassine Belkacem",
    contactEmail: "contact@atlasnomad.ma",
    contactPhone: "+212 6 61 22 33 44",
    zones: ["Maroc"],
    tripTypes: ["DESERT", "TREKKING", "ADVENTURE"],
    verificationStatus: "VERIFIED",
    proofDocUrl: "/mock/docs/atlas-nomad-registre-commerce.pdf",
    createdAt: "2026-02-10T09:00:00.000Z",
    statusHistory: [
      { status: "PENDING", at: "2026-02-10T09:00:00.000Z" },
      { status: "UNDER_REVIEW", at: "2026-02-11T10:00:00.000Z" },
      { status: "VERIFIED", at: "2026-02-13T14:30:00.000Z" },
    ],
  },
  {
    id: "ag_2",
    slug: "carthage-heritage-tours",
    name: "Carthage Heritage Tours",
    description:
      "Spécialiste du patrimoine tunisien : médinas, sites antiques et gastronomie, pour la diaspora et les curieux d'histoire.",
    logoUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?w=200&h=200&fit=crop",
    managerName: "Amira Chelbi",
    contactEmail: "hello@carthageheritage.tn",
    contactPhone: "+216 20 456 789",
    zones: ["Tunisie"],
    tripTypes: ["CULTURAL", "GASTRONOMY", "CITY_BREAK"],
    verificationStatus: "VERIFIED",
    proofDocUrl: "/mock/docs/carthage-heritage-registre.pdf",
    createdAt: "2026-01-22T09:00:00.000Z",
    statusHistory: [
      { status: "PENDING", at: "2026-01-22T09:00:00.000Z" },
      { status: "UNDER_REVIEW", at: "2026-01-23T11:00:00.000Z" },
      { status: "VERIFIED", at: "2026-01-26T16:00:00.000Z" },
    ],
  },
  {
    id: "ag_3",
    slug: "essaouira-blue-escapes",
    name: "Essaouira Blue Escapes",
    description:
      "Séjours côtiers décontractés entre Essaouira et Taghazout : surf, riads et coucher de soleil sur l'Atlantique.",
    logoUrl: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=200&h=200&fit=crop",
    managerName: "Sofia Reguieg",
    contactEmail: "team@essaouirablue.ma",
    contactPhone: "+212 6 12 98 76 54",
    zones: ["Maroc"],
    tripTypes: ["BEACH", "CITY_BREAK"],
    verificationStatus: "VERIFIED",
    proofDocUrl: "/mock/docs/essaouira-blue-registre.pdf",
    createdAt: "2026-03-01T09:00:00.000Z",
    statusHistory: [
      { status: "PENDING", at: "2026-03-01T09:00:00.000Z" },
      { status: "UNDER_REVIEW", at: "2026-03-02T09:30:00.000Z" },
      { status: "VERIFIED", at: "2026-03-05T12:00:00.000Z" },
    ],
  },
];

// A 4th, not-yet-verified agency — useful for the admin "Gestion agences" queue.
export const pendingAgency: Agency = {
  id: "ag_4",
  slug: "sahara-stars-camp",
  name: "Sahara Stars Camp",
  description: "Bivouacs sous les étoiles à Merzouga, nouvellement inscrite sur la plateforme.",
  logoUrl: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=200&h=200&fit=crop",
  managerName: "Hicham Ait Ouaziz",
  contactEmail: "info@saharastarscamp.ma",
  contactPhone: "+212 6 55 44 33 22",
  zones: ["Maroc"],
  tripTypes: ["DESERT"],
  verificationStatus: "UNDER_REVIEW",
  proofDocUrl: "/mock/docs/sahara-stars-registre.pdf",
  createdAt: "2026-07-28T09:00:00.000Z",
  statusHistory: [
    { status: "PENDING", at: "2026-07-28T09:00:00.000Z" },
    { status: "UNDER_REVIEW", at: "2026-07-29T10:15:00.000Z" },
  ],
};

export const trips: GroupTrip[] = [
  {
    id: "trip_1",
    slug: "trek-atlas-toubkal-4j",
    agencyId: "ag_1",
    title: "Trek Atlas & Sommet du Toubkal",
    destination: "Imlil, Haut Atlas",
    tripType: "TREKKING",
    status: "PUBLISHED",
    startDate: "2026-09-14",
    endDate: "2026-09-18",
    durationDays: 4,
    totalPrice: 480,
    depositAmount: 90,
    totalSpots: 12,
    bookedSpots: 8,
    meetingPoint: "Place Jemaa el-Fna, Marrakech",
    description:
      "Quatre jours d'ascension progressive vers le plus haut sommet d'Afrique du Nord, avec nuits en refuge et guides locaux certifiés.",
    inclusions: ["Guide de montagne certifié", "Mulet porteur", "Pension complète", "Refuges en demi-pension"],
    exclusions: ["Transport international", "Assurance voyage", "Équipement personnel"],
    program: [
      { day: 1, title: "Marrakech → Imlil → Refuge", detail: "Transfert, marche d'acclimatation, nuit en refuge." },
      { day: 2, title: "Refuge → Base camp Toubkal", detail: "Montée technique, briefing sommet." },
      { day: 3, title: "Sommet du Toubkal", detail: "Départ à l'aube, sommet à 4167m, redescente." },
      { day: 4, title: "Retour à Marrakech", detail: "Petit-déjeuner, transfert retour, fin de séjour." },
    ],
    physicalLevel: 4,
    images: [
      "https://images.unsplash.com/photo-1489493887464-892be6d1daae?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1518259102261-b40117eabbc9?w=1200&h=800&fit=crop",
    ],
    aiTags: ["montagne", "trekking", "aventure", "atlas"],
    createdAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "trip_2",
    slug: "bivouac-sahara-merzouga-3j",
    agencyId: "ag_1",
    title: "Bivouac Sahara sous les Étoiles",
    destination: "Merzouga, Erg Chebbi",
    tripType: "DESERT",
    status: "FULL",
    startDate: "2026-10-02",
    endDate: "2026-10-04",
    durationDays: 3,
    totalPrice: 320,
    depositAmount: 60,
    totalSpots: 16,
    bookedSpots: 16,
    meetingPoint: "Gare routière, Ouarzazate",
    description:
      "Traversée des dunes de l'Erg Chebbi à dos de dromadaire, bivouac berbère, musique live et nuit sous un ciel sans pollution lumineuse.",
    inclusions: ["Transport 4x4", "Balade en dromadaire", "Bivouac tout confort", "Repas berbères"],
    exclusions: ["Boissons alcoolisées", "Pourboires"],
    program: [
      { day: 1, title: "Ouarzazate → Vallée du Draa → Merzouga", detail: "Route des kasbahs, arrivée en fin de journée." },
      { day: 2, title: "Dunes & bivouac", detail: "Balade à dos de dromadaire au coucher du soleil, soirée musicale." },
      { day: 3, title: "Lever de soleil & retour", detail: "Lever de soleil sur les dunes, retour à Ouarzazate." },
    ],
    physicalLevel: 2,
    images: [
      "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=1200&h=800&fit=crop",
    ],
    aiTags: ["désert", "dunes", "bivouac", "étoiles"],
    createdAt: "2026-05-20T09:00:00.000Z",
  },
  {
    id: "trip_3",
    slug: "chefchaouen-photo-weekend",
    agencyId: "ag_1",
    title: "Week-end Photo à Chefchaouen",
    destination: "Chefchaouen, Rif",
    tripType: "CITY_BREAK",
    status: "PUBLISHED",
    startDate: "2026-09-25",
    endDate: "2026-09-27",
    durationDays: 3,
    totalPrice: 260,
    depositAmount: 40,
    totalSpots: 10,
    bookedSpots: 3,
    meetingPoint: "Aéroport de Tanger",
    description:
      "Un séjour photo dans la ville bleue, ruelles pastel, ateliers lumière au lever et coucher du soleil, guidé par un photographe local.",
    inclusions: ["Hébergement riad", "Atelier photo x2", "Guide local"],
    exclusions: ["Vols", "Repas de midi"],
    program: [
      { day: 1, title: "Arrivée & médina", detail: "Installation, première balade dans la médina bleue." },
      { day: 2, title: "Atelier lumière", detail: "Session lever de soleil et coucher du soleil avec le photographe." },
      { day: 3, title: "Marché & départ", detail: "Marché local, temps libre, transfert aéroport." },
    ],
    physicalLevel: 1,
    images: [
      "https://images.unsplash.com/photo-1553603227-2358aabe821e?w=1200&h=800&fit=crop",
    ],
    aiTags: ["photo", "médina", "culture", "rif"],
    createdAt: "2026-06-10T09:00:00.000Z",
  },
  {
    id: "trip_4",
    slug: "surf-taghazout-6j",
    agencyId: "ag_3",
    title: "Surf Camp Taghazout",
    destination: "Taghazout, Agadir",
    tripType: "BEACH",
    status: "PUBLISHED",
    startDate: "2026-09-20",
    endDate: "2026-09-26",
    durationDays: 6,
    totalPrice: 590,
    depositAmount: 100,
    totalSpots: 14,
    bookedSpots: 5,
    meetingPoint: "Aéroport d'Agadir Al Massira",
    description:
      "Six jours entre cours de surf pour tous niveaux, yoga au lever du soleil et vie de surf house face à l'Atlantique.",
    inclusions: ["Surf house partagée", "5 sessions de surf encadrées", "Location matériel", "Yoga matinal"],
    exclusions: ["Vols internationaux", "Repas hors petit-déjeuner"],
    program: [
      { day: 1, title: "Arrivée & briefing", detail: "Installation à la surf house, briefing niveau." },
      { day: 2, title: "Sessions surf + yoga", detail: "Routine quotidienne surf/yoga jusqu'au jour 5." },
      { day: 6, title: "Session libre & départ", detail: "Dernière session libre, transfert retour." },
    ],
    physicalLevel: 3,
    images: [
      "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1502933691298-84fc14542831?w=1200&h=800&fit=crop",
    ],
    aiTags: ["surf", "plage", "yoga", "atlantique"],
    createdAt: "2026-06-15T09:00:00.000Z",
  },
  {
    id: "trip_5",
    slug: "essaouira-riad-detente-4j",
    agencyId: "ag_3",
    title: "Escale Détente à Essaouira",
    destination: "Essaouira",
    tripType: "BEACH",
    status: "PUBLISHED",
    startDate: "2026-11-06",
    endDate: "2026-11-10",
    durationDays: 4,
    totalPrice: 340,
    depositAmount: 50,
    totalSpots: 10,
    bookedSpots: 2,
    meetingPoint: "Gare routière d'Essaouira",
    description:
      "Riad avec vue sur les remparts, temps libre pour flâner dans la médina, sortie bateau et coucher de soleil sur le port.",
    inclusions: ["Riad 4 nuits", "Petit-déjeuner", "Sortie bateau"],
    exclusions: ["Déjeuners et dîners", "Activités optionnelles"],
    program: [
      { day: 1, title: "Arrivée & remparts", detail: "Installation au riad, balade sur les remparts." },
      { day: 2, title: "Sortie bateau", detail: "Excursion en mer, déjeuner de poisson grillé en option." },
      { day: 3, title: "Médina libre", detail: "Journée libre pour explorer souks et galeries d'art." },
      { day: 4, title: "Départ", detail: "Petit-déjeuner et transfert." },
    ],
    physicalLevel: 1,
    images: [
      "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1200&h=800&fit=crop",
    ],
    aiTags: ["plage", "détente", "riad", "médina"],
    createdAt: "2026-06-20T09:00:00.000Z",
  },
  {
    id: "trip_6",
    slug: "carthage-tunis-patrimoine-5j",
    agencyId: "ag_2",
    title: "Tunis & Carthage, Sur les Traces de l'Histoire",
    destination: "Tunis, Carthage, Sidi Bou Saïd",
    tripType: "CULTURAL",
    status: "FULL",
    startDate: "2026-10-12",
    endDate: "2026-10-17",
    durationDays: 5,
    totalPrice: 420,
    depositAmount: 70,
    totalSpots: 20,
    bookedSpots: 20,
    meetingPoint: "Aéroport Tunis-Carthage",
    description:
      "Ruines de Carthage, médina de Tunis classée UNESCO, village bleu et blanc de Sidi Bou Saïd et musée du Bardo.",
    inclusions: ["Hôtel 4 nuits", "Guide historien francophone", "Entrées sites archéologiques", "Musée du Bardo"],
    exclusions: ["Vols", "Dîners"],
    program: [
      { day: 1, title: "Arrivée & médina de Tunis", detail: "Installation, visite guidée de la médina." },
      { day: 2, title: "Carthage antique", detail: "Thermes d'Antonin, port punique, colline de Byrsa." },
      { day: 3, title: "Musée du Bardo", detail: "Plus grande collection de mosaïques romaines au monde." },
      { day: 4, title: "Sidi Bou Saïd", detail: "Village bleu et blanc, temps libre en bord de mer." },
      { day: 5, title: "Départ", detail: "Matinée libre, transfert aéroport." },
    ],
    physicalLevel: 2,
    images: [
      "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1560347876-aeef00ee58a1?w=1200&h=800&fit=crop",
    ],
    aiTags: ["histoire", "patrimoine", "unesco", "musée"],
    createdAt: "2026-05-05T09:00:00.000Z",
  },
  {
    id: "trip_7",
    slug: "djerba-farniente-7j",
    agencyId: "ag_2",
    title: "Djerba, Semaine Farniente",
    destination: "Djerba",
    tripType: "BEACH",
    status: "PUBLISHED",
    startDate: "2026-09-30",
    endDate: "2026-10-07",
    durationDays: 7,
    totalPrice: 610,
    depositAmount: 100,
    totalSpots: 18,
    bookedSpots: 11,
    meetingPoint: "Aéroport de Djerba-Zarzis",
    description:
      "Une semaine tout confort entre plages de sable fin, poterie de Guellala et marché de Houmt Souk.",
    inclusions: ["Hôtel bord de mer 7 nuits", "Demi-pension", "Excursion Houmt Souk"],
    exclusions: ["Vols", "Excursions optionnelles", "Boissons"],
    program: [
      { day: 1, title: "Arrivée", detail: "Installation à l'hôtel, soirée libre." },
      { day: 4, title: "Houmt Souk & Guellala", detail: "Marché traditionnel et ateliers de poterie berbère." },
      { day: 7, title: "Départ", detail: "Petit-déjeuner, transfert aéroport." },
    ],
    physicalLevel: 1,
    images: [
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1200&h=800&fit=crop",
    ],
    aiTags: ["plage", "farniente", "famille", "détente"],
    createdAt: "2026-05-12T09:00:00.000Z",
  },
  {
    id: "trip_8",
    slug: "fes-gastronomie-4j",
    agencyId: "ag_1",
    title: "Fès, Immersion Gastronomique",
    destination: "Fès",
    tripType: "GASTRONOMY",
    status: "DRAFT",
    startDate: "2026-11-18",
    endDate: "2026-11-22",
    durationDays: 4,
    totalPrice: 390,
    depositAmount: 60,
    totalSpots: 12,
    bookedSpots: 0,
    meetingPoint: "Gare de Fès",
    description:
      "Cours de cuisine marocaine chez l'habitant, visite des souks d'épices et dégustation dans la plus ancienne médina du monde.",
    inclusions: ["Riad 4 nuits", "2 cours de cuisine", "Visite guidée des souks"],
    exclusions: ["Transport", "Dîners hors cours de cuisine"],
    program: [
      { day: 1, title: "Arrivée & médina", detail: "Installation, première découverte de la médina." },
      { day: 2, title: "Souks d'épices", detail: "Marché aux épices, tannerie, achats guidés." },
      { day: 3, title: "Cours de cuisine", detail: "Atelier tajine et pâtisseries marocaines chez l'habitant." },
      { day: 4, title: "Départ", detail: "Petit-déjeuner, transfert gare." },
    ],
    physicalLevel: 1,
    images: [
      "https://images.unsplash.com/photo-1489493585363-d69421e0edd3?w=1200&h=800&fit=crop",
    ],
    aiTags: ["gastronomie", "cuisine", "médina", "artisanat"],
    createdAt: "2026-07-25T09:00:00.000Z",
  },
];

export const bookings: Booking[] = [
  {
    id: "bk_1",
    groupTripId: "trip_1",
    clientName: "Karim Douiri",
    clientEmail: "karim.douiri@example.com",
    clientPhone: "+33 6 12 34 56 78",
    numberOfSeats: 2,
    status: "CONFIRMED",
    confirmationCode: "MV-482913",
    paymentId: "pay_1",
    createdAt: "2026-08-01T10:15:00.000Z",
  },
  {
    id: "bk_2",
    groupTripId: "trip_2",
    clientName: "Sarah Benali",
    clientEmail: "sarah.benali@example.com",
    clientPhone: "+1 514 555 0134",
    numberOfSeats: 4,
    status: "CONFIRMED",
    confirmationCode: "MV-119284",
    paymentId: "pay_2",
    createdAt: "2026-07-15T14:20:00.000Z",
  },
  {
    id: "bk_3",
    groupTripId: "trip_6",
    clientName: "Nadia Ferchichi",
    clientEmail: "nadia.f@example.com",
    clientPhone: "+49 176 1234567",
    numberOfSeats: 2,
    status: "CANCELLED",
    confirmationCode: "MV-773410",
    paymentId: "pay_3",
    createdAt: "2026-06-30T08:00:00.000Z",
    cancelledAt: "2026-07-28T11:00:00.000Z",
  },
  {
    id: "bk_4",
    groupTripId: "trip_4",
    clientName: "Lucas Martin",
    clientEmail: "lucas.martin@example.com",
    clientPhone: "+33 7 89 01 23 45",
    numberOfSeats: 1,
    status: "PENDING_PAYMENT",
    createdAt: "2026-08-03T16:45:00.000Z",
  },
  {
    id: "bk_5",
    groupTripId: "trip_7",
    clientName: "Ines Cherif",
    clientEmail: "ines.cherif@example.com",
    clientPhone: "+216 22 334 455",
    numberOfSeats: 3,
    status: "CONFIRMED",
    confirmationCode: "MV-556021",
    paymentId: "pay_5",
    createdAt: "2026-08-02T09:30:00.000Z",
  },
];

export const payments: Payment[] = [
  { id: "pay_1", bookingId: "bk_1", stripeSessionId: "cs_test_a1b2c3", amount: 180, status: "SUCCEEDED", createdAt: "2026-08-01T10:16:00.000Z" },
  { id: "pay_2", bookingId: "bk_2", stripeSessionId: "cs_test_d4e5f6", amount: 240, status: "SUCCEEDED", createdAt: "2026-07-15T14:21:00.000Z" },
  { id: "pay_3", bookingId: "bk_3", stripeSessionId: "cs_test_g7h8i9", amount: 140, status: "REFUNDED", createdAt: "2026-06-30T08:01:00.000Z" },
  { id: "pay_5", bookingId: "bk_5", stripeSessionId: "cs_test_j1k2l3", amount: 300, status: "SUCCEEDED", createdAt: "2026-08-02T09:31:00.000Z" },
];

export const travelRequests: TravelRequest[] = [
  {
    id: "tr_1",
    status: "MATCH_SUGGESTED",
    destination: "Maroc",
    dateFlexible: true,
    travelerCount: 2,
    adults: 2,
    children: 0,
    budgetMax: 600,
    tripTypes: ["BEACH", "CITY_BREAK"],
    clientName: "Julie Moreau",
    clientEmail: "julie.moreau@example.com",
    createdAt: "2026-08-01T12:00:00.000Z",
    summary: "Couple cherchant une escapade détente en bord de mer, budget serré, dates flexibles en septembre.",
    tags: ["plage", "détente", "couple"],
    matchedTripIds: ["trip_5", "trip_4"],
  },
  {
    id: "tr_2",
    status: "PAID",
    destination: "Tunisie",
    dateFlexible: false,
    travelerCount: 4,
    adults: 2,
    children: 2,
    budgetMax: 700,
    tripTypes: ["BEACH"],
    clientName: "Marc Dupont",
    clientEmail: "marc.dupont@example.com",
    createdAt: "2026-07-05T09:00:00.000Z",
    matchedTripIds: ["trip_7"],
  },
  {
    id: "tr_3",
    status: "SUBMITTED",
    destination: "Sahara",
    dateFlexible: true,
    travelerCount: 6,
    adults: 6,
    children: 0,
    budgetMax: 400,
    tripTypes: ["DESERT", "ADVENTURE"],
    clientName: "Groupe EVJF - Camille",
    clientEmail: "camille.evjf@example.com",
    createdAt: "2026-08-03T18:00:00.000Z",
  },
];

export function getAgencyBySlug(slug: string) {
  return agencies.find((a) => a.slug === slug);
}

export function getTripBySlug(slug: string) {
  return trips.find((t) => t.slug === slug);
}

export function getTripsByAgency(agencyId: string) {
  return trips.filter((t) => t.agencyId === agencyId);
}

export function getAgencyById(id: string) {
  return agencies.find((a) => a.id === id) ?? (id === pendingAgency.id ? pendingAgency : undefined);
}

export function getBookingsForTrip(tripId: string) {
  return bookings.filter((b) => b.groupTripId === tripId);
}


export function getAgencyName(agencyId: string) {
  return getAgencyById(agencyId)?.name ?? "Agence";
}

/** Trips visible on the public marketplace: published or sold-out, never draft/closed/cancelled. */
export function getPublicTrips() {
  return trips.filter((t) => t.status === "PUBLISHED" || t.status === "FULL");
}

export function getAllAgencies() {
  return [...agencies, pendingAgency];
}

export function getBookingsForAgency(agencyId: string) {
  const tripIds = new Set(getTripsByAgency(agencyId).map((t) => t.id));
  return bookings.filter((b) => tripIds.has(b.groupTripId));
}

export function getPaymentForBooking(bookingId: string) {
  return payments.find((p) => p.bookingId === bookingId);
}

export function getAgencyStats(agencyId: string) {
  const agencyTrips = getTripsByAgency(agencyId);
  const agencyBookings = getBookingsForAgency(agencyId);
  const activeTrips = agencyTrips.filter((t) => t.status === "PUBLISHED" || t.status === "FULL").length;
  const confirmedBookings = agencyBookings.filter((b) => b.status === "CONFIRMED").length;
  const seatsRemainingTotal = agencyTrips
    .filter((t) => t.status === "PUBLISHED" || t.status === "FULL")
    .reduce((sum, t) => sum + Math.max(t.totalSpots - t.bookedSpots, 0), 0);

  const now = new Date();
  const depositsThisMonth = agencyBookings
    .filter((b) => b.status === "CONFIRMED")
    .filter((b) => {
      const p = getPaymentForBooking(b.id);
      if (!p || p.status !== "SUCCEEDED") return false;
      const d = new Date(p.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, b) => sum + (getPaymentForBooking(b.id)?.amount ?? 0), 0);

  const departuresWithin30Days = agencyTrips
    .filter((t) => t.status === "PUBLISHED" || t.status === "FULL")
    .filter((t) => {
      const days = (new Date(t.startDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 30;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const lastBookings = [...agencyBookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    activeTrips,
    confirmedBookings,
    seatsRemainingTotal,
    depositsThisMonth,
    departuresWithin30Days,
    lastBookings,
  };
}

export function getAgenciesPendingOver48h() {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  return getAllAgencies().filter(
    (a) =>
      (a.verificationStatus === "PENDING" || a.verificationStatus === "UNDER_REVIEW") &&
      new Date(a.createdAt).getTime() < cutoff
  );
}

export function getCancelledTrips() {
  return trips.filter((t) => t.status === "CANCELLED");
}

export function getPlatformStats() {
  const pendingAgencies = getAllAgencies().filter(
    (a) => a.verificationStatus === "PENDING" || a.verificationStatus === "UNDER_REVIEW"
  ).length;
  const verifiedAgencies = getAllAgencies().filter((a) => a.verificationStatus === "VERIFIED").length;
  const activeTrips = trips.filter((t) => t.status === "PUBLISHED" || t.status === "FULL").length;
  const now = new Date();
  const bookingsToday = bookings.filter((b) => {
    const d = new Date(b.createdAt);
    return d.toDateString() === now.toDateString();
  }).length;
  const bookingsThisMonth = bookings.filter((b) => {
    const d = new Date(b.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const depositsThisMonth = payments
    .filter((p) => p.status === "SUCCEEDED")
    .filter((p) => {
      const d = new Date(p.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.amount, 0);
  const refundsPending = bookings.filter((b) => b.status === "CANCELLED" && getPaymentForBooking(b.id)?.status !== "REFUNDED");
  const lastBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    pendingAgencies,
    verifiedAgencies,
    activeTrips,
    bookingsToday,
    bookingsThisMonth,
    depositsThisMonth,
    refundsPending,
    lastBookings,
  };
}

