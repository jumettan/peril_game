const locations = [
    "americas",
    "europe",
    "africa",
    "asia",
    "australia",
    "antarctica",
];
export function isValidLocation(loc) {
    const l = new Set(locations);
    return typeof loc === "string" && l.has(loc);
}
const ranks = ["infantry", "cavalry", "artillery"];
export function isValidRank(rank) {
    const r = new Set(ranks);
    return typeof rank === "string" && r.has(rank);
}
