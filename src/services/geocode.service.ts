import axios from "axios";
import prisma from "../lib/prisma";

interface GeocodeInput {
  address?: string;
}

export const geocodeAddress = async ({
  address,
}: GeocodeInput) => {
  if (!address?.trim()) {
    throw new Error("ADDRESS_REQUIRED");
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("GEOCODE_NOT_CONFIGURED");
  }

  const response = await axios.get(
    "https://maps.googleapis.com/maps/api/geocode/json",
    {
      params: {
        address: address.trim(),
        key: apiKey,
        region: "in",
        language: "en",
      },
    }
  );

  const { status, error_message: googleError, results } = response.data;

  if (status !== "OK" || !results?.length) {
    console.error("GEOCODE GOOGLE STATUS:", status, googleError || "");

    if (
      status === "REQUEST_DENIED" ||
      status === "INVALID_REQUEST" ||
      /expired|invalid|denied/i.test(googleError || "")
    ) {
      throw new Error("GEOCODE_API_DENIED");
    }

    throw new Error("LOCATION_NOT_FOUND");
  }

  const result = results[0];
  const components = result.address_components;

  const getComponent = (type: string) =>
    components.find((c: any) =>
      c.types.includes(type)
    )?.long_name;

  const localityName =
    getComponent("sublocality") ||
    getComponent("sublocality_level_1") ||
    getComponent("neighborhood");

  const cityName =
    getComponent("locality") ||
    getComponent("administrative_area_level_2") ||
    getComponent("postal_town");

  const stateName =
    getComponent("administrative_area_level_1");

  const country =
    getComponent("country");

  const state = stateName
    ? await prisma.state.findFirst({
        where: {
          name: {
            equals: stateName,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      })
    : null;

  let city = null;

  if (state && cityName) {
    city = await prisma.city.findFirst({
      where: {
        stateId: state.id,
        name: {
          contains: cityName,
          mode: "insensitive",
        },
      },
    });
  }

  if (!city && state && localityName) {
    city = await prisma.city.findFirst({
      where: {
        stateId: state.id,
        name: {
          contains: localityName,
          mode: "insensitive",
        },
      },
    });
  }

  return {
    address: result.formatted_address,

    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,

    localityName,
    cityName: city?.name ?? cityName,

    stateName,
    stateId: state?.id ?? null,
    cityId: city?.id ?? null,

    country,
  };
};
