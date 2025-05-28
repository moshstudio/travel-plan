export const ipapiGetLngLat = async (): Promise<{
  lng: number;
  lat: number;
} | null> => {
  const res = await fetch("https://ipapi.co/json/");
  const data = await res.json();
  if (data.latitude && data.longitude) {
    return {
      lng: data.longitude,
      lat: data.latitude,
    };
  }
  return null;
};
