import axios from "axios";
import prisma from "../lib/prisma";

interface GeocodeInput {
  address?: string;
}

export const geocodeAddress = async ({
  address,
}: GeocodeInput) => {
  if (!address) {
    throw new Error("ADDRESS_REQUIRED");
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const response = await axios.get(
    "https://maps.googleapis.com/maps/api/geocode/json",
    {
      params: {
        address,
        key: apiKey,
      },
    }
  );

  if (
    response.data.status !== "OK" ||
    !response.data.results.length
  ) {
    throw new Error("LOCATION_NOT_FOUND");
  }

  const result = response.data.results[0];
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
    getComponent("postal_town") ||
    getComponent("administrative_area_level_2");

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

  const citySearchName =
  localityName || cityName;

  let city = null;

  if (state && citySearchName) {
    city = await prisma.city.findFirst({
      where: {
        stateId: state.id,
        name: {
          contains: citySearchName,
          mode: "insensitive",
        },
      },
    });
  }
  console.log(
  JSON.stringify(result.address_components, null, 2));

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