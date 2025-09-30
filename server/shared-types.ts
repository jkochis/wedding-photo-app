// Shared types for server - subset of frontend types without DOM dependencies

export type PhotoTag = 'wedding' | 'reception' | 'other';

export interface FaceCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceDetection {
  id: string;
  personName?: string;
  coordinates: FaceCoordinates;
  confidence?: number;
}

export interface Photo {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  tag: PhotoTag;
  people: string[];
  faces: FaceDetection[];
  size: number;
  uploadedAt: string;
  mimetype: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  photo: Photo;
  message: string;
}