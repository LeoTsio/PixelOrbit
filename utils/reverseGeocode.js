export async function getCountryFromCoords(latitude, longitude) {
    const url =
        `https://api.bigdatacloud.net/data/reverse-geocode-client` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&localityLanguage=en`;

    const response = await fetch(url);
    const data = await response.json();

    return data.countryName || "Unknown location";
}