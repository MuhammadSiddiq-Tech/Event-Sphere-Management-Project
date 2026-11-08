/**
 * @fileoverview Booth Service — business logic layer.
 * T-3.4, T-3.5. FR-EXPO-03.
 *
 * Overlap validation: two booths overlap when their rectangles intersect.
 * Atomic bulk replace: wrapped in a Mongoose session transaction.
 */

import mongoose from 'mongoose';
import { Booth } from '../../models/booth.model.js';
import { Expo } from '../../models/expo.model.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../core/errors.js';
import { EXPO_STATUS, BOOTH_STATUS } from '../../config/constants.js';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js';

/**
 * Check if two rectangles overlap (strict — touching edges is NOT overlap).
 * @param {{ x,y,w,h }} a
 * @param {{ x,y,w,h }} b
 * @returns {boolean}
 */
function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/**
 * Validate that no two booths in the given list overlap and all codes are unique.
 * @param {Array<{ code, geometry }>} booths
 * @throws {ConflictError}
 */
function validateBoothList(booths) {
  // Code uniqueness
  const codes = booths.map((b) => b.code.toUpperCase());
  const uniqueCodes = new Set(codes);
  if (uniqueCodes.size !== codes.length) {
    const dup = codes.find((c, i) => codes.indexOf(c) !== i);
    throw new ConflictError(`Duplicate booth code in request: ${dup}`);
  }

  // Geometric overlap
  for (let i = 0; i < booths.length; i++) {
    for (let j = i + 1; j < booths.length; j++) {
      if (rectsOverlap(booths[i].geometry, booths[j].geometry)) {
        throw new ConflictError(
          `Booth ${booths[i].code} overlaps with booth ${booths[j].code}`
        );
      }
    }
  }
}

/**
 * Assert expo exists and is not soft-deleted.
 * @param {string} expoId
 * @returns {Promise<import('../../models/expo.model.js').Expo>}
 */
async function requireExpo(expoId) {
  const expo = await Expo.findOne({ _id: expoId, isDeleted: { $ne: true } });
  if (!expo) throw new NotFoundError('Expo');
  return expo;
}

export const boothService = {
  /**
   * List booths for an expo with optional status/size filter and pagination.
   * @param {string} expoId
   * @param {Object} query
   * @param {boolean} [isAdmin=false]
   * @returns {Promise<{ items: Object[], meta: Object }>}
   */
  async list(expoId, query, isAdmin = false) {
    const expo = await requireExpo(expoId);

    // Non-admins can only see booth lists for published/ongoing expos
    if (!isAdmin && expo.status === EXPO_STATUS.DRAFT) {
      throw new NotFoundError('Expo');
    }

    const { status, size } = query;
    const pagination = parsePagination(query);
    const filter = { expo: expoId };

    if (status) filter.status = status;
    if (size) filter.size = size;

    const [items, total] = await Promise.all([
      Booth.find(filter)
        .sort({ code: 1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Booth.countDocuments(filter),
    ]);

    return { items, meta: buildPaginationMeta(total, pagination) };
  },

  /**
   * Get a single booth by its ID within an expo.
   * @param {string} expoId
   * @param {string} boothId
   * @param {boolean} [isAdmin=false]
   * @returns {Promise<Object>}
   */
  async getById(expoId, boothId, isAdmin = false) {
    const expo = await requireExpo(expoId);

    if (!isAdmin && expo.status === EXPO_STATUS.DRAFT) {
      throw new NotFoundError('Expo');
    }

    const booth = await Booth.findOne({ _id: boothId, expo: expoId });
    if (!booth) throw new NotFoundError('Booth');
    return booth.toJSON();
  },

  /**
   * Add a single booth to a DRAFT expo.
   * @param {string} expoId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(expoId, data) {
    const expo = await requireExpo(expoId);

    if (expo.status !== EXPO_STATUS.DRAFT) {
      throw new ForbiddenError('Booths can only be added to DRAFT expos. Unpublish first.');
    }

    // Check for code uniqueness within expo
    const existing = await Booth.findOne({ expo: expoId, code: data.code.toUpperCase() });
    if (existing) {
      throw new ConflictError(`Booth code '${data.code}' already exists in this expo`);
    }

    // Check geometry overlap with existing booths
    const siblings = await Booth.find({ expo: expoId }, { geometry: 1, code: 1 }).lean();
    for (const sibling of siblings) {
      if (rectsOverlap(data.geometry, sibling.geometry)) {
        throw new ConflictError(
          `New booth overlaps with existing booth '${sibling.code}'`
        );
      }
    }

    const booth = new Booth({
      ...data,
      code: data.code.toUpperCase(),
      expo: expoId,
    });
    await booth.save();
    return booth.toJSON();
  },

  /**
   * Update a booth's metadata (not status or geometry overlap).
   * Only allowed on DRAFT expos.
   * @param {string} expoId
   * @param {string} boothId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async update(expoId, boothId, updates) {
    const expo = await requireExpo(expoId);

    if (expo.status !== EXPO_STATUS.DRAFT) {
      throw new ForbiddenError('Booth metadata can only be edited when the expo is in DRAFT status.');
    }

    const booth = await Booth.findOne({ _id: boothId, expo: expoId });
    if (!booth) throw new NotFoundError('Booth');

    // If geometry is being updated, check overlap with other booths
    if (updates.geometry) {
      const siblings = await Booth.find(
        { expo: expoId, _id: { $ne: boothId } },
        { geometry: 1, code: 1 }
      ).lean();
      for (const sibling of siblings) {
        if (rectsOverlap(updates.geometry, sibling.geometry)) {
          throw new ConflictError(
            `Updated geometry overlaps with existing booth '${sibling.code}'`
          );
        }
      }
      booth.geometry = updates.geometry;
    }

    const updatable = ['label', 'description', 'size', 'pricePerDay'];
    for (const f of updatable) {
      if (updates[f] !== undefined) booth[f] = updates[f];
    }

    await booth.save();
    return booth.toJSON();
  },

  /**
   * Delete a single booth from a DRAFT expo.
   * @param {string} expoId
   * @param {string} boothId
   * @returns {Promise<void>}
   */
  async delete(expoId, boothId) {
    const expo = await requireExpo(expoId);

    if (expo.status !== EXPO_STATUS.DRAFT) {
      throw new ForbiddenError('Booths can only be deleted when the expo is in DRAFT status.');
    }

    const booth = await Booth.findOne({ _id: boothId, expo: expoId });
    if (!booth) throw new NotFoundError('Booth');

    if (booth.status !== BOOTH_STATUS.AVAILABLE && booth.status !== BOOTH_STATUS.BLOCKED) {
      throw new ConflictError('Cannot delete a booth that is reserved or allocated.');
    }

    await booth.deleteOne();
  },

  /**
   * Bulk replace all booths for a DRAFT expo atomically.
   * PUT /api/v1/expos/:id/booths
   * - Validates all codes are unique and no geometry overlaps within the new set.
   * - Wraps in a MongoDB session transaction for atomicity.
   * - Existing available/blocked booths are replaced; reserved/allocated are blocked.
   * T-3.5. FR-EXPO-03.
   * @param {string} expoId
   * @param {Array<Object>} boothsData
   * @returns {Promise<{ created: number, booths: Object[] }>}
   */
  async bulkReplace(expoId, boothsData) {
    const expo = await requireExpo(expoId);

    if (expo.status !== EXPO_STATUS.DRAFT) {
      throw new ForbiddenError('Floor plan can only be replaced when the expo is in DRAFT status.');
    }

    // Check no active (reserved/allocated) booths exist — cannot replace those
    const activeCount = await Booth.countDocuments({
      expo: expoId,
      status: { $in: [BOOTH_STATUS.RESERVED, BOOTH_STATUS.ALLOCATED] },
    });
    if (activeCount > 0) {
      throw new ConflictError(
        `Cannot replace floor plan: ${activeCount} booth(s) are reserved or allocated. Unallocate them first.`
      );
    }

    // Validate the incoming booth list
    validateBoothList(boothsData);

    // Check maxBooths limit
    if (boothsData.length > expo.maxBooths) {
      throw new ConflictError(
        `Cannot create ${boothsData.length} booths — expo maxBooths is ${expo.maxBooths}`
      );
    }

    // Atomic replace: delete all existing available/blocked booths, insert new ones
    // Uses transactions when replica set is available, with safe fallback for standalone dev/test Mongo
    let createdBooths = [];

    const executeReplace = async (session) => {
      const opts = session ? { session } : {};

      // Delete all non-active booths for this expo
      await Booth.deleteMany(
        {
          expo: expoId,
          status: { $in: [BOOTH_STATUS.AVAILABLE, BOOTH_STATUS.BLOCKED] },
        },
        opts
      );

      if (boothsData.length === 0) {
        return [];
      }

      // Insert all new booths
      const docs = boothsData.map((b) => ({
        expo: expoId,
        code: b.code.toUpperCase(),
        label: b.label,
        description: b.description,
        size: b.size || 'medium',
        pricePerDay: b.pricePerDay || 0,
        geometry: b.geometry,
        status: BOOTH_STATUS.AVAILABLE,
      }));

      const inserted = await Booth.insertMany(docs, opts);
      return inserted.map((b) => b.toJSON());
    };

    let session;
    try {
      session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          createdBooths = await executeReplace(session);
        });
      } catch (txErr) {
        if (
          txErr.message?.includes('replica set') ||
          txErr.message?.includes('Transaction numbers are only allowed')
        ) {
          createdBooths = await executeReplace(null);
        } else {
          throw txErr;
        }
      }
    } catch (err) {
      if (
        err.message?.includes('replica set') ||
        err.message?.includes('Transaction numbers are only allowed')
      ) {
        createdBooths = await executeReplace(null);
      } else {
        throw err;
      }
    } finally {
      if (session) {
        await session.endSession();
      }
    }

    return { created: createdBooths.length, booths: createdBooths };
  },
};
