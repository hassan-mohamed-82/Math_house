interface BunnyVideoResponse {
  guid: string;
  title: string;
  availableResolutions: string;
  status: number;
  // Bunny returns more fields, but we primarily care about the guid
}