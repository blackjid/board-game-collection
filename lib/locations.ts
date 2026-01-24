import prisma from "./prisma";
import type { SavedLocationData, CreateSavedLocationInput } from "@/types/play";

// ============================================================================
// Transform Functions
// ============================================================================

function transformLocation(location: {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
}): SavedLocationData {
  return {
    id: location.id,
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
  };
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * List all saved locations, ordered by name
 */
export async function listSavedLocations(): Promise<SavedLocationData[]> {
  const locations = await prisma.savedLocation.findMany({
    orderBy: { name: "asc" },
  });

  return locations.map(transformLocation);
}

/**
 * Get a single saved location by ID
 */
export async function getSavedLocation(id: string): Promise<SavedLocationData | null> {
  const location = await prisma.savedLocation.findUnique({
    where: { id },
  });

  return location ? transformLocation(location) : null;
}

/**
 * Create a new saved location
 */
export async function createSavedLocation(
  input: CreateSavedLocationInput
): Promise<SavedLocationData> {
  const location = await prisma.savedLocation.create({
    data: {
      name: input.name.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
    },
  });

  return transformLocation(location);
}

/**
 * Update a saved location
 */
export async function updateSavedLocation(
  id: string,
  input: Partial<CreateSavedLocationInput>
): Promise<SavedLocationData | null> {
  try {
    const location = await prisma.savedLocation.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.latitude !== undefined && { latitude: input.latitude }),
        ...(input.longitude !== undefined && { longitude: input.longitude }),
      },
    });

    return transformLocation(location);
  } catch {
    return null;
  }
}

/**
 * Delete a saved location
 * Note: GamePlay records referencing this location will have savedLocationId set to null
 */
export async function deleteSavedLocation(id: string): Promise<boolean> {
  try {
    await prisma.savedLocation.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}
