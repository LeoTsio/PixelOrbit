import { getCountryFromCoords } from "../utils/reverseGeocode.js";

async function getISSPosition() {
    const response = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
    return await response.json();
}

async function getCrew() {
    try {
        const response = await fetch(
            "https://corsproxy.io/?http://api.open-notify.org/astros.json"
        );

        const data = await response.json();

        return data.people.filter(person => person.craft === "ISS").length;
    } catch {
        return "—";
    }
}

export function getData() {
    const positionPromise = getISSPosition();

    return [
        positionPromise.then(data => Math.round(data.altitude) + " km"),
        getCrew(),
        positionPromise.then(data => getCountryFromCoords(data.latitude, data.longitude))
    ];
}