import { Request, Response } from 'express';
import { z } from 'zod';
import * as geofenceService from '../services/geofence.service';

const MAX_ALLOWED_ACCURACY_METERS = 100;

const numericQueryParam = z.preprocess((value) => {
  if (Array.isArray(value)) return value[0];
  if (typeof value !== 'string' || value.trim() === '') return value;
  return Number(value);
}, z.number().finite());

const validateGeofenceQuerySchema = z.object({
  lat: numericQueryParam.refine((value) => value >= -90 && value <= 90),
  lng: numericQueryParam.refine((value) => value >= -180 && value <= 180),
  locationId: z.string().min(1),
  accuracyMeters: numericQueryParam.refine((value) => value >= 0),
});

const positiveIntegerQueryParam = z.preprocess((value) => {
  if (Array.isArray(value)) return value[0];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') return value;
  return Number(value);
}, z.number().int().positive().optional());

const listLocationsQuerySchema = z.object({
  page: positiveIntegerQueryParam.default(1),
  limit: positiveIntegerQueryParam.default(50),
});

const sendError = (res: Response, statusCode: number, error: string, message: string): Response => {
  return res.status(statusCode).json({ error, message, statusCode });
};

export const validateGeofence = async (req: Request, res: Response): Promise<Response> => {
  try {
    const query = validateGeofenceQuerySchema.parse(req.query);

    if (query.accuracyMeters > MAX_ALLOWED_ACCURACY_METERS) {
      return sendError(
        res,
        400,
        'LOW_GPS_ACCURACY',
        'Device GPS accuracy is too low; location is untrustworthy'
      );
    }

    const result = await geofenceService.validateGeofence({
      latitude: query.lat,
      longitude: query.lng,
      locationId: query.locationId,
    });

    return res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const hasAccuracyIssue = error.issues.some((i) => i.path.includes('accuracyMeters'));
      const onlyAccuracyIssues = error.issues.every((i) => i.path.includes('accuracyMeters'));

      if (hasAccuracyIssue && onlyAccuracyIssues) {
        return sendError(
          res,
          400,
          'LOW_GPS_ACCURACY',
          'Device GPS accuracy is too low; location is untrustworthy'
        );
      }

      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.issues });
    }

    if (error instanceof Error && error.message === 'LOCATION_NOT_FOUND') {
      return res.status(404).json({ error: 'LOCATION_NOT_FOUND' });
    }

    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const getLocations = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const query = listLocationsQuerySchema.parse(_req.query);
    const page = query.page;
    const limit = Math.min(Math.max(query.limit, 1), 200);
    const result = await geofenceService.getActiveLocations(page, limit);
    return res.status(200).json(result);
  } catch (_error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const getLocationById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const locationId = z.string().min(1).parse(req.params.locationId);
    const location = await geofenceService.getLocationById(locationId);
    return res.status(200).json(location);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR' });
    }

    if (error instanceof Error && error.message === 'LOCATION_NOT_FOUND') {
      return res.status(404).json({ error: 'LOCATION_NOT_FOUND' });
    }

    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

const createLocationSchema = z.object({
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().positive(),
  workingHours: z.object({
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    lateThresholdMins: z.number().int().nonnegative().optional(),
    minDurationHours: z.number().nonnegative().optional(),
  }).optional(),
});

const updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusMeters: z.number().positive().optional(),
  workingHours: z.object({
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    lateThresholdMins: z.number().int().nonnegative().optional(),
    minDurationHours: z.number().nonnegative().optional(),
  }).optional(),
});

export const createLocation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data = createLocationSchema.parse(req.body);
    const location = await geofenceService.createLocation(data);
    return res.status(201).json({ message: 'Location created successfully', location });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const updateLocation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const locationId = z.string().min(1).parse(req.params.locationId);
    const data = updateLocationSchema.parse(req.body);
    const location = await geofenceService.updateLocation(locationId, data);
    return res.status(200).json({ message: 'Location updated successfully', location });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error instanceof Error && error.message === 'LOCATION_NOT_FOUND') {
      return res.status(404).json({ error: 'LOCATION_NOT_FOUND' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const deleteLocation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const locationId = z.string().min(1).parse(req.params.locationId);
    await geofenceService.softDeleteLocation(locationId);
    return res.status(200).json({ message: 'Location deleted successfully' });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'LOCATION_NOT_FOUND') {
      return res.status(404).json({ error: 'LOCATION_NOT_FOUND' });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};
