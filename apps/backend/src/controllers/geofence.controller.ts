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
      return sendError(
        res,
        400,
        'LOW_GPS_ACCURACY',
        'Device GPS accuracy is too low; location is untrustworthy'
      );
    }

    if (error instanceof Error && error.message === 'LOCATION_NOT_FOUND') {
      return res.status(404).json({ error: 'LOCATION_NOT_FOUND' });
    }

    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const getLocations = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const data = await geofenceService.getActiveLocations();
    return res.status(200).json({ data });
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
