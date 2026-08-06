import type { Request, Response } from 'express';
import { StationService } from '../services/station.service';

// 1. POST /api/stations
export const createStation = async (req: Request, res: Response) => {
    const { stationName, rawCoordinates } = req.body;
    const newStation = await StationService.createStation(stationName, rawCoordinates);

    res.status(201).json({
        status: 'success',
        data: newStation
    });
};

// 2. GET /api/stations/search?q=XYZ
export const searchStations = async (req: Request, res: Response) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        res.status(400).json({ status: 'error', message: 'Query parameter "q" is required' });
        return;
    }

    const stations = await StationService.searchStations(q);

    res.status(200).json({
        status: 'success',
        data: stations
    });
};

// 3. GET /api/stations
export const getAllStations = async (req: Request, res: Response) => {
    const { active } = req.query;
    const stations = await StationService.getAllStations(active as string | undefined);

    res.status(200).json({
        status: 'success',
        data: stations
    });
};

// 4. GET /api/stations/:id
export const getStationById = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const station = await StationService.getStationById(id);

    res.status(200).json({
        status: 'success',
        data: station
    });
};

// 5. PUT /api/stations/:id
export const updateStation = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { stationName, rawCoordinates } = req.body;

    const updatedStation = await StationService.updateStation(id, stationName, rawCoordinates);

    res.status(200).json({
        status: 'success',
        data: updatedStation
    });
};

// 6. PATCH /api/stations/:id/toggle
export const toggleStation = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { isActive } = req.body;

    const updatedStation = await StationService.toggleStationStatus(id, isActive);

    res.status(200).json({
        status: 'success',
        data: updatedStation
    });
};