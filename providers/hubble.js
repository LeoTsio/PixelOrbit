import * as satellite from "https://cdn.jsdelivr.net/npm/satellite.js/+esm";
import { getCountryFromCoords } from "../utils/reverseGeocode.js";

const HUBBLE_TLE = [
    "1 20580U 90037B   26168.14857957  .00002158  00000+0  12411-3 0  9998",
    "2 20580  28.4696  75.7775 0002758 335.8992  24.1758 15.26722813 10173"
];

function calculateHubbleNow() {
    const satrec = satellite.twoline2satrec(HUBBLE_TLE[0], HUBBLE_TLE[1]);

    const now = new Date();
    const result = satellite.propagate(satrec, now);

    if (!result.position || !result.velocity) {
        return null;
    }

    const gmst = satellite.gstime(now);
    const geo = satellite.eciToGeodetic(result.position, gmst);

    const latitude = satellite.degreesLat(geo.latitude);
    const longitude = satellite.degreesLong(geo.longitude);

    const speed = Math.sqrt(
        result.velocity.x ** 2 +
        result.velocity.y ** 2 +
        result.velocity.z ** 2
    ) * 3600;

    return {
        altitude: Math.round(geo.height) + " km",
        location: getCountryFromCoords(latitude, longitude),
        speed: Math.round(speed) + " km/h"
    };
}

export function getData() {
    const hubble = calculateHubbleNow();

    if (!hubble) {
        return [
            Promise.resolve("—"),
            Promise.resolve("—"),
            Promise.resolve("—")
        ];
    }

    return [
        Promise.resolve(hubble.altitude),
        hubble.location,
        Promise.resolve(hubble.speed)
    ];
}