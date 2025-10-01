/**
 * Core Type Definitions for Wedding Photo App
 */

// ============================================================================
// Photo Types
// ============================================================================

export type PhotoTag = 'wedding' | 'reception' | 'other';

export interface FaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  personName?: string;
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
  deleted?: boolean;
  deletedAt?: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse extends ApiResponse<Photo> {
  photo: Photo;
}

export interface PhotosResponse extends ApiResponse<Photo[]> {
  photos: Photo[];
}

export interface ApiError {
  error: string;
  message?: string;
  code?: number;
}

// ============================================================================
// Upload Types
// ============================================================================

export interface UploadConfig {
  MAX_FILE_SIZE: number;
  MAX_BATCH_SIZE: number;
  MAX_CONCURRENT: number;
  ALLOWED_TYPES: string[];
  SUPPORTED_TYPES: string[];
  MAX_WIDTH: number;
  RESIZE_MAX_WIDTH: number;
  QUALITY: number;
  COMPRESS_QUALITY: number;
  COMPRESSION_THRESHOLD: number;
}

export interface UploadProgress {
  filename: string;
  loaded: number;
  total: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

export interface UploadBatch {
  files: File[];
  tag: PhotoTag;
  progress: UploadProgress[];
}

// ============================================================================
// State Management Types
// ============================================================================

export interface AppState {
  photos: Photo[];
  filteredPhotos: Photo[];
  currentFilter: PhotoTag | 'all';
  selectedPeople: string[];
  isLoading: boolean;
  error: string | null;
  modal: ModalState;
  upload: UploadState;
}

export interface ModalState {
  isOpen: boolean;
  currentPhotoIndex: number;
  photos: Photo[];
  showFaceDetection: boolean;
}

export interface UploadState {
  isUploading: boolean;
  progress: UploadProgress[];
  dragOver: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export type AppEventType = 
  | 'photos:loaded'
  | 'photos:filtered' 
  | 'photo:uploaded'
  | 'photo:selected'
  | 'modal:opened'
  | 'modal:closed'
  | 'upload:started'
  | 'upload:progress'
  | 'upload:completed'
  | 'upload:error'
  | 'filter:changed'
  | 'people:selected'
  | 'error:occurred';

export interface AppEvent<T = any> {
  type: AppEventType;
  payload?: T;
  timestamp: number;
}

export type EventListener<T = any> = (event: AppEvent<T>) => void;

// ============================================================================
// Configuration Types
// ============================================================================

export interface ApiConfig {
  BASE_URL: string;
  ENDPOINTS: {
    PHOTOS: string;
    UPLOAD: string;
    PEOPLE: string;
    STATS: string;
    HEALTH: string;
  };
}

export interface FaceDetectionConfig {
  MODEL_URL: string;
  CONFIDENCE_THRESHOLD: number;
  MAX_FACES: number;
  RENDER_DELAY: number;
  LOAD_TIMEOUT: number;
  BUTTON_TEXT: string;
  SHOW_LABELS: boolean;
  BOX_STYLES: Partial<CSSStyleDeclaration>;
  LABEL_STYLES: Partial<CSSStyleDeclaration>;
}

export interface UIConfig {
  PHOTO_TAGS: Record<PhotoTag | 'all', string>;
  COLORS: {
    primary: string;
    secondary: string;
    text: string;
    success: string;
    error: string;
    info: string;
  };
  ANIMATION_DELAYS: {
    modal_transition: number;
    face_box_render: number;
    notification_duration: number;
  };
  GRID: {
    min_photo_size: string;
    max_photo_size: string;
  };
  SWIPE_THRESHOLD: number;
  NAVIGATION_HINT: string;
}

export interface DebugConfig {
  ENABLE_GLOBAL_ACCESS: boolean;
  VERBOSE_FILTERING: boolean;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

export interface FeatureFlags {
  face_detection: boolean;
  offline_support: boolean;
  service_worker: boolean;
  image_compression: boolean;
  people_filtering: boolean;
  photo_navigation: boolean;
}

export interface StorageConfig {
  cached_photos: string;
  navigation_hint_shown: string;
  user_preferences: string;
}

export interface AppConfig {
  API: ApiConfig;
  UPLOAD: UploadConfig;
  FACE_DETECTION: FaceDetectionConfig;
  UI: UIConfig;
  DEBUG: DebugConfig;
  FEATURES: FeatureFlags;
  STORAGE: StorageConfig;
}

// ============================================================================
// DOM and Browser Types
// ============================================================================

export interface TouchPoint {
  x: number;
  y: number;
}

export interface SwipeGesture {
  startPoint: TouchPoint;
  endPoint: TouchPoint;
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
}

// ============================================================================
// Express Server Types
// ============================================================================

export interface AuthenticatedRequest extends Express.Request {
  token?: string;
}

export interface PhotoUploadRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
  body: {
    tag?: PhotoTag;
    token?: string;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type Partial<T> = {
  [P in keyof T]?: T[P];
};

export type Required<T> = {
  [P in keyof T]-?: T[P];
};

export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Generic callback type
export type Callback<T = void> = (error?: Error | null, result?: T) => void;

// Promise-based callback
export type AsyncCallback<T = void> = () => Promise<T>;

// Logger levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// CSS class name helper
export type ClassNames = string | string[] | Record<string, boolean>;