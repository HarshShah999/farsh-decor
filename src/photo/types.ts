export interface Pt {
  x: number;
  y: number;
}

export type PhotoSurfaceType = 'wall' | 'floor' | 'curtain' | 'sofa' | 'other';

export type BlendMode = 'natural' | 'multiply' | 'normal';

export interface PhotoRegion {
  id: string;
  name: string;
  surfaceType: PhotoSurfaceType;
  /** polygon in IMAGE pixel coordinates */
  points: Pt[];
  closed: boolean;
  productId: string | null;
  /** texture scale multiplier */
  scale: number;
  /** degrees */
  rotation: number;
  /** 0..1 */
  opacity: number;
  blend: BlendMode;
  /** 0..1 how much of the photo's light & shadow is kept */
  shading: number;
  /** edge softness in px */
  feather: number;
  /** optional perspective plane: 4 corners TL, TR, BR, BL in image pixels */
  perspective: [Pt, Pt, Pt, Pt] | null;
  visible: boolean;
}
