import { isValidLocation, } from "./gamedata.js";
export var MoveOutcome;
(function (MoveOutcome) {
    MoveOutcome[MoveOutcome["SamePlayer"] = 0] = "SamePlayer";
    MoveOutcome[MoveOutcome["Safe"] = 1] = "Safe";
    MoveOutcome[MoveOutcome["MakeWar"] = 2] = "MakeWar";
})(MoveOutcome = MoveOutcome || (MoveOutcome = {}));
export function getOverlappingLocation(p1, p2) {
    for (const u1 of Object.values(p1.units)) {
        for (const u2 of Object.values(p2.units)) {
            if (u1.location === u2.location) {
                return u1.location;
            }
        }
    }
    return null;
}
export function handleMove(gs, move) {
    console.log();
    console.log("==== Move Detected ====");
    console.log(`${move.player.username} is moving ${move.units.length} unit(s) to ${move.toLocation}`);
    for (const unit of move.units) {
        console.log(`* ${unit.rank}`);
    }
    const player = gs.getPlayerSnap();
    if (player.username === move.player.username) {
        console.log("------------------------");
        return MoveOutcome.SamePlayer;
    }
    const overlappingLocation = getOverlappingLocation(player, move.player);
    if (overlappingLocation) {
        console.log(`You have units in ${overlappingLocation}! You are at war with ${move.player.username}!`);
        console.log("------------------------");
        return MoveOutcome.MakeWar;
    }
    console.log(`You are safe from ${move.player.username}'s units.`);
    console.log("------------------------");
    return MoveOutcome.Safe;
}
export function commandMove(gs, words) {
    if (gs.isPaused()) {
        throw new Error("The game is paused, you cannot move units");
    }
    if (words.length < 3) {
        throw new Error("Usage: move <location> <unitID> <unitID> ...");
    }
    const newLocation = words[1];
    if (!isValidLocation(newLocation)) {
        throw new Error(`Error: ${newLocation} is not a valid location`);
    }
    const unitIDs = [];
    for (const word of words.slice(2)) {
        const unitID = parseInt(word, 10);
        if (isNaN(unitID)) {
            throw new Error(`Error: ${word} is not a valid unit ID`);
        }
        unitIDs.push(unitID);
    }
    const newUnits = [];
    for (const unitID of unitIDs) {
        const unit = gs.getUnit(unitID);
        if (!unit) {
            throw new Error(`Error: unit with ID ${unitID} not found`);
        }
        unit.location = newLocation;
        gs.updateUnit(unit);
        newUnits.push(unit);
    }
    const move = {
        toLocation: newLocation,
        units: newUnits,
        player: gs.getPlayerSnap(),
    };
    console.log(`Moved ${move.units.length} units to ${move.toLocation}`);
    return move;
}
