import { getCountryFromCoords } from "../utils/reverseGeocode.js";

export async function getDataISS() {

    const response = await fetch(
        "https://api.wheretheiss.at/v1/satellites/25544" // Fetch ISS data from the wheretheiss.at API
    );

    const data = await response.json();
    const country = await getCountryFromCoords(data.latitude, data.longitude); // Get country from coordinates
/*
    const crewResponse = await fetch(
        "http://api.open-notify.org/astros.json" // Fetch crew data from the open-notify API
    );

    const crewData = await crewResponse.json(); // Parse crew data
    const crew = crewData.people.filter(person => person.craft === "ISS").length; // Filter crew members on the ISS
    const crewNames = crewData.people.filter(person => person.craft === "ISS").map(person => person.name); // Get names of crew members on the ISS
*/
    return {
        stat1: {
            label: "altitude",
            value: Math.round(data.altitude) + " km", // Display altitude in kilometers
        },
        stat2: {
            label: "velocity",
            value: Math.round(data.velocity) + " km/h", // Display velocity in kilometers per hour
        },
        stat3: {
            label: "above",
            value: country, // Display the country over which the ISS is currently located
        },
        stat4: {
            label: "crew",
            value: crew, // Display the number of crew members on the ISS
        },
        stat5: {
            label: "crew names",
            value: "unavailable" // crewNames // Display the names of crew members on the ISS (temporarily unavailable)
        }
    };
}