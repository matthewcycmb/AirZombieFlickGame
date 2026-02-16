import { Zombie } from "@/lib/types";
import { ZOMBIE_HIT_RADIUS } from "@/lib/constants";

/**
 * Find the closest zombie to a screen-space point (aimX, aimY).
 * Uses each zombie's computed screen position and scale-adjusted hit radius.
 * Prefers the zombie closest to the aim point if multiple overlap.
 */
export function findClosestZombieAtPoint(
  zombies: Zombie[],
  aimX: number,
  aimY: number
): Zombie | null {
  let closest: Zombie | null = null;
  let closestDist = Infinity;

  for (const z of zombies) {
    if (!z.alive) continue;
    // Hit radius scales with perspective
    const hitR = ZOMBIE_HIT_RADIUS * z.screenScale;
    // Zombie's screen-space bounding is centered at (z.x, z.y) with its scaled dimensions
    const scaledH = z.height * z.screenScale;
    // The zombie sprite is drawn centered at (z.x, z.y) with body above and legs below
    // Check distance to the zombie's centre area
    const dx = z.x - aimX;
    const dy = (z.y - scaledH * 0.15) - aimY; // offset up slightly since visual centre is above y
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = hitR + Math.max(z.width, z.height) * z.screenScale * 0.35;
    if (dist < maxDist && dist < closestDist) {
      closest = z;
      closestDist = dist;
    }
  }

  return closest;
}

/**
 * Raycast from a point in a direction and find the first zombie hit.
 * Uses screen-space zombie positions with scale-adjusted bounding boxes.
 */
export function raycastFromPoint(
  zombies: Zombie[],
  originX: number,
  originY: number,
  dirX: number,
  dirY: number
): Zombie | null {
  let closest: Zombie | null = null;
  let closestT = Infinity;

  for (const z of zombies) {
    if (!z.alive) continue;

    const halfW = (z.width * z.screenScale) / 2;
    const halfH = (z.height * z.screenScale) / 2;
    const left = z.x - halfW;
    const right = z.x + halfW;
    const top = z.y - halfH;
    const bottom = z.y + halfH * 0.4; // legs area is shorter

    let tMin = 0;
    let tMax = 10000;

    if (Math.abs(dirX) > 1e-8) {
      let t1 = (left - originX) / dirX;
      let t2 = (right - originX) / dirX;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
    } else if (originX < left || originX > right) {
      continue;
    }

    if (Math.abs(dirY) > 1e-8) {
      let t1 = (top - originY) / dirY;
      let t2 = (bottom - originY) / dirY;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
    } else if (originY < top || originY > bottom) {
      continue;
    }

    if (tMin <= tMax && tMax > 0 && tMin < closestT) {
      closest = z;
      closestT = tMin;
    }
  }

  return closest;
}

/**
 * Find ALL zombies within a screen-space radius of a point.
 * Used for shotgun blast power-up.
 */
export function findZombiesInRadius(
  zombies: Zombie[],
  centerX: number,
  centerY: number,
  radius: number
): Zombie[] {
  const result: Zombie[] = [];
  for (const z of zombies) {
    if (!z.alive) continue;
    const scaledH = z.height * z.screenScale;
    const dx = z.x - centerX;
    const dy = (z.y - scaledH * 0.15) - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitR = ZOMBIE_HIT_RADIUS * z.screenScale;
    const maxDist = hitR + Math.max(z.width, z.height) * z.screenScale * 0.35 + radius;
    if (dist < maxDist) {
      result.push(z);
    }
  }
  return result;
}
