import * as satellite from "https://cdn.jsdelivr.net/npm/satellite.js/+esm";
import { getCountryFromCoords } from "../utils/reverseGeocode.js";

export async function getDataHUBBLE() {
    const tleResponse = await fetch(
        "https://celestrak.org/NORAD/elements/gp.php?CATNR=20580&FORMAT=tle"
    );

    const tleText = await tleResponse.text();
    const lines = tleText.trim().split("\n");

    const line1 = lines[1].trim();
    const line2 = lines[2].trim();

    const satrec = satellite.twoline2satrec(line1, line2);

    const now = new Date();
    const result = satellite.propagate(satrec, now);

    const position = result.position;
    const velocity = result.velocity;

    const gmst = satellite.gstime(now);
    const geo = satellite.eciToGeodetic(position, gmst);

    const latitude = satellite.degreesLat(geo.latitude);
    const longitude = satellite.degreesLong(geo.longitude);
    const altitude = geo.height;

    const speed = Math.sqrt(
        velocity.x * velocity.x +
        velocity.y * velocity.y +
        velocity.z * velocity.z
    ) * 3600;

    const location = await getCountryFromCoords(latitude, longitude);

    return {
        stat1: {
            label: "altitude",
            value: Math.round(altitude) + " km" // Display altitude in kilometers
        },
        stat2: {
            label: "velocity",
            value: Math.round(speed) + " km/h" // Display velocity in kilometers per hour
        },
        stat3: {
            label: "above",
            value: location // Display the country over which the Hubble is currently located
        }
    };
}