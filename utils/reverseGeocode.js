export async function getCountryFromCoords(latitude, longitude) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2`
        );

        if (!response.ok) {
            return "Ocean";
        }

        const data = await response.json();

        return (
            data.address?.country ||
            data.address?.ocean ||
            data.address?.sea ||
            "Ocean"
        );
    } catch {
        return "Ocean";
    }
}