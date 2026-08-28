export type LandingContentSection = 'why' | 'how' | 'faq';

export interface LandingPageSettings {
  id?: number;
  hero_eyebrow: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_supporting_text: string;
  hero_image_path: string | null;
  rent_cta_label: string;
  returnee_cta_label: string;
  browse_cta_label: string;
  final_cta_headline: string;
  final_cta_subheadline: string;
  facebook_label: string;
  facebook_url: string;
  instagram_label: string;
  instagram_url: string;
  contact_email: string;
  updated_at?: string;
}

export interface LandingFeaturedCamera {
  device_id: string;
  cam_name: string;
  device_image: string | null;
  landing_image_path: string | null;
  tagline: string;
  description: string;
  display_order: number;
  is_visible?: boolean;
  updated_at?: string;
}

export interface LandingContentItem {
  id: string;
  section: LandingContentSection;
  title: string;
  body: string;
  icon_key: string | null;
  display_order: number;
  is_visible?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LandingTestimonial {
  id: string;
  renter_name: string;
  feedback: string;
  photo_path: string | null;
  display_order: number;
  is_visible?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LandingGalleryItem {
  id: string;
  image_path: string;
  title: string | null;
  caption: string | null;
  display_order: number;
  is_visible?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LandingPageData {
  settings: LandingPageSettings;
  featured_cameras: LandingFeaturedCamera[];
  content_items: LandingContentItem[];
  testimonials: LandingTestimonial[];
  gallery: LandingGalleryItem[];
}

export const DEFAULT_LANDING_SETTINGS: LandingPageSettings = {
  hero_eyebrow: 'CAMERA RENTAL & CREATIVES',
  hero_headline: 'Your next story deserves the right camera.',
  hero_subheadline: 'Rent creator-ready cameras with a smooth, secure booking experience from Recap Buddies.',
  hero_supporting_text: 'From everyday memories to your next big project, we make quality gear easier to book.',
  hero_image_path: null,
  rent_cta_label: 'Rent Now',
  returnee_cta_label: 'Returning Renter',
  browse_cta_label: 'Browse Cameras',
  final_cta_headline: 'Ready to rent your next camera?',
  final_cta_subheadline: 'Book your gear with Recap Buddies today and focus on creating something worth remembering.',
  facebook_label: 'recapbuddiesph',
  facebook_url: 'https://www.facebook.com/recapbuddiesph',
  instagram_label: 'recapbuddiesph',
  instagram_url: 'https://www.instagram.com/recapbuddiesph',
  contact_email: 'recapbuddies@gmail.com',
};
